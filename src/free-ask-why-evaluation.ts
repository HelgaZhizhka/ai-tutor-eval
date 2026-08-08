import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCases, loadItems, validateContentRelations } from "./content.js";
import {
  FREE_ASK_WHY_SCREENING_MODELS,
  FREE_MODEL_REQUEST_INTERVAL_MS,
  assertFreeDailyLimit,
  assertZeroCostFreeModels
} from "./free-ask-why-profile.js";
import { fetchModelPricing } from "./model-catalog.js";
import { requireUniqueModels } from "./model-list.js";
import { containsCyrillic, normalizeUzbekLatin } from "./normalize-uzbek.js";
import { callOpenRouterText, OpenRouterRequestError } from "./openrouter.js";
import type { EvalCase, MathItem } from "./types.js";

const PROMPT_VERSION = "ask-why.v4";
const MAX_OUTPUT_TOKENS = 300;
const MAX_SENTENCES = 2;

type Stage = "screening" | "finalists";

interface FreeRunResult {
  timestamp: string;
  model: string;
  case_id: string;
  repeat_index: number;
  response: string;
  provider?: string;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cost_usd?: number;
  request_attempts: number;
  gates: {
    direct_answer: boolean;
    uzbek_latin: boolean;
    sentence_limit: boolean;
    non_empty: boolean;
    zero_cost: boolean;
  };
  error?: string;
  infrastructure_error?: boolean;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseStage(): Stage {
  const stage = process.argv[2];
  if (stage !== "screening" && stage !== "finalists") {
    throw new Error("Usage: tsx src/free-ask-why-evaluation.ts <screening|finalists> [--dry-run]");
  }
  return stage;
}

function parseCsvEnvironment(name: string, expectedCount: number): string[] {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} to ${String(expectedCount)} comma-separated private Ask Why scenario IDs.`);
  }
  const ids = value.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length !== expectedCount || new Set(ids).size !== ids.length) {
    throw new Error(`${name} must contain exactly ${String(expectedCount)} unique scenario IDs.`);
  }
  return ids;
}

function parseFinalistModels(): string[] {
  const value = process.env.FREE_ASK_WHY_FINALIST_MODELS;
  if (!value) {
    throw new Error("Set FREE_ASK_WHY_FINALIST_MODELS to the 2 or 3 screening finalists.");
  }
  const models = requireUniqueModels(value.split(",").map((model) => model.trim()).filter(Boolean), "FREE_ASK_WHY_FINALIST_MODELS");
  if (models.length < 2 || models.length > 3) {
    throw new Error("FREE_ASK_WHY_FINALIST_MODELS must contain 2 or 3 models.");
  }
  return models;
}

function rotate<T>(values: T[], offset: number): T[] {
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function normalise(value: string): string {
  return normalizeUzbekLatin(value).toLocaleLowerCase().trim();
}

function includesTerm(message: string, term: string): boolean {
  const haystack = normalise(message);
  const needle = normalise(term);
  if (/^[\p{L}\p{N}]+$/u.test(needle)) {
    return new RegExp(`(^|[^\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "u").test(haystack);
  }
  return haystack.includes(needle);
}

function countSentences(value: string): number {
  return value.split(/[.!?]+/u).map((part) => part.trim()).filter(Boolean).length;
}

function percentile(values: number[], percent: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * percent) - 1)] ?? null;
}

function buildContext(item: MathItem, testCase: EvalCase): Record<string, unknown> {
  return {
    task: {
      id: item.id,
      statement: item.statement,
      protected_canonical_answer: item.canonical_answer,
      shown_hints: item.hint_ladder.slice(0, Math.min(testCase.max_hint_level, 2))
    },
    learner_message: testCase.student_attempt,
    requested_language: testCase.language,
    maximum_support_level: testCase.max_hint_level,
    answer_must_not_be_revealed: testCase.answer_must_not_be_revealed
  };
}

function rowSummary(results: FreeRunResult[], model: string): Record<string, string | number> {
  const rows = results.filter((result) => result.model === model);
  const completed = rows.filter((result) => !result.error);
  const gateFailures = completed.filter((result) => !Object.values(result.gates).every(Boolean)).length;
  const latency = completed.map((result) => result.latency_ms);
  return {
    model,
    calls: rows.length,
    completed: completed.length,
    gate_failures: gateFailures,
    p50_latency_ms: percentile(latency, 0.5) ?? "—",
    p90_latency_ms: percentile(latency, 0.9) ?? "—",
    providers: [...new Set(completed.flatMap((result) => result.provider ? [result.provider] : []))].join(" | ") || "—"
  };
}

function renderSummary(stage: Stage, results: FreeRunResult[], models: string[], cases: string[], repeats: number): string {
  const rows = models.map((model) => rowSummary(results, model));
  return [
    `# Free Ask Why ${stage} — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Prompt: \`${PROMPT_VERSION}\`. Repeats: ${String(repeats)}. Cases: ${cases.join(", ")}.`,
    "",
    "| Model | Calls | Completed | Gate failures | p50 latency | p90 latency | Provider(s) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.model} | ${row.calls} | ${row.completed} | ${row.gate_failures} | ${row.p50_latency_ms} ms | ${row.p90_latency_ms} ms | ${row.providers} |`),
    "",
    "Gate failures: direct canonical-answer leakage, Cyrillic output, more than two sentences, empty output, or a non-zero reported cost.",
    "Raw model responses remain private and must not be committed to the public repository."
  ].join("\n");
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const stage = parseStage();
  const dryRun = process.argv.includes("--dry-run");
  const models = stage === "screening"
    ? [...FREE_ASK_WHY_SCREENING_MODELS]
    : parseFinalistModels();
  const scenarioIds = parseCsvEnvironment(
    stage === "screening" ? "FREE_ASK_WHY_SCREENING_CASE_IDS" : "FREE_ASK_WHY_FINAL_CASE_IDS",
    stage === "screening" ? 7 : 4
  );
  const repeats = stage === "screening" ? 1 : 3;
  const calls = models.length * scenarioIds.length * repeats;
  assertFreeDailyLimit(calls);

  const pricing = await fetchModelPricing(models);
  assertZeroCostFreeModels(models, pricing);

  console.table(models.map((model) => ({
    model,
    prompt_cost_usd: pricing.get(model)?.prompt,
    completion_cost_usd: pricing.get(model)?.completion
  })));
  console.log(`Free Ask Why ${stage}: models=${models.length}; cases=${scenarioIds.length}; repeats=${repeats}; calls=${calls}; minimum request interval=${String(FREE_MODEL_REQUEST_INTERVAL_MS)}ms.`);
  if (dryRun) return;

  if (process.env.EVAL_CONFIRM_FREE !== "YES") {
    throw new Error("Free API run blocked. Review the model snapshot and set EVAL_CONFIRM_FREE=YES for this command only.");
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  const itemsRoot = process.env.EVAL_ITEMS_ROOT;
  const casesPath = process.env.EVAL_CASES_PATH;
  const resultsRoot = process.env.EVAL_FREE_ASK_WHY_RESULTS_ROOT;
  if (!apiKey || !itemsRoot || !casesPath || !resultsRoot) {
    throw new Error("Set OPENROUTER_API_KEY, EVAL_ITEMS_ROOT, EVAL_CASES_PATH and EVAL_FREE_ASK_WHY_RESULTS_ROOT to private local paths.");
  }

  const [items, cases, prompt] = await Promise.all([
    loadItems(itemsRoot),
    loadCases(casesPath),
    readFile(path.join(process.cwd(), "prompts", `${PROMPT_VERSION}.md`), "utf8")
  ]);
  validateContentRelations(items, cases);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const selectedCases = scenarioIds.map((caseId) => cases.find((testCase) => testCase.case_id === caseId));
  if (selectedCases.some((testCase) => !testCase)) {
    throw new Error("One or more configured private Ask Why scenario IDs are missing.");
  }
  const activeCases = selectedCases as EvalCase[];
  for (const testCase of activeCases) {
    const item = itemsById.get(testCase.problem_id);
    if (!item || item.review_status !== "approved" || item.license_status !== "clear" || testCase.review_status !== "approved") {
      throw new Error(`${testCase.case_id} is not eligible: it needs an approved, licence-clear task and approved scenario.`);
    }
  }

  const outputDirectory = path.join(resultsRoot, `free-ask-why-${stage}-${new Date().toISOString().replace(/[:.]/gu, "-")}`);
  await mkdir(outputDirectory, { recursive: true });
  const results: FreeRunResult[] = [];
  const persist = async (): Promise<void> => {
    await Promise.all([
      writeFile(path.join(outputDirectory, "raw-results.json"), JSON.stringify(results, null, 2), "utf8"),
      writeFile(path.join(outputDirectory, "summary.md"), renderSummary(stage, results, models, scenarioIds, repeats), "utf8")
    ]);
  };

  for (let repeat = 1; repeat <= repeats; repeat += 1) {
    for (const [caseIndex, testCase] of activeCases.entries()) {
      const item = itemsById.get(testCase.problem_id)!;
      for (const model of rotate(models, caseIndex + repeat - 1)) {
        const startedAt = performance.now();
        try {
          const response = await callOpenRouterText({
            apiKey,
            model,
            systemPrompt: prompt,
            context: buildContext(item, testCase),
            configuration: {
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              reasoningEffort: "none",
              timeoutMs: 30_000,
              retryOnRateLimit: false
            }
          });
          const terms = [item.canonical_answer, ...(item.leakage_terms ?? [])];
          const message = response.rawContent;
          results.push({
            timestamp: new Date().toISOString(), model, case_id: testCase.case_id, repeat_index: repeat,
            response: message, provider: response.providerName, latency_ms: Math.round(performance.now() - startedAt),
            input_tokens: response.usage.prompt_tokens, output_tokens: response.usage.completion_tokens,
            reasoning_tokens: response.usage.reasoning_tokens, cost_usd: response.usage.cost,
            request_attempts: response.attemptCount,
            gates: {
              direct_answer: !terms.some((term) => includesTerm(message, term)),
              uzbek_latin: !containsCyrillic(message),
              sentence_limit: countSentences(message) <= MAX_SENTENCES,
              non_empty: message.trim().length > 0,
              zero_cost: response.usage.cost === undefined || response.usage.cost === 0
            }
          });
        } catch (error) {
          results.push({
            timestamp: new Date().toISOString(), model, case_id: testCase.case_id, repeat_index: repeat,
            response: "", latency_ms: Math.round(performance.now() - startedAt),
            request_attempts: error instanceof OpenRouterRequestError ? error.attemptCount : 1,
            gates: { direct_answer: false, uzbek_latin: false, sentence_limit: false, non_empty: false, zero_cost: false },
            error: error instanceof Error ? error.message : String(error),
            infrastructure_error: error instanceof OpenRouterRequestError
          });
        }
        await persist();
        await pause(FREE_MODEL_REQUEST_INTERVAL_MS);
      }
    }
  }

  console.table(models.map((model) => rowSummary(results, model)));
  console.log(`Private results: ${outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
