import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCases, loadItems, validateContentRelations } from "./content.js";
import { estimateCostUsd, fetchModelPricing } from "./model-catalog.js";
import { requireUniqueModels } from "./model-list.js";
import { containsCyrillic, countSentences, normalizeUzbekLatin } from "./normalize-uzbek.js";
import { callOpenRouterText, OpenRouterRequestError } from "./openrouter.js";
import type { EvalCase, MathItem } from "./types.js";

const PROMPT_VERSION = "ask-why.v4";
const DEFAULT_CASE_IDS = [
  "G5-UZ-0002-AW-02",
  "G5-UZ-0003-AW-02",
  "G5-UZ-0007-AW-01",
  "G5-UZ-0010-AW-02"
];

interface RegressionResult {
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
  };
  error?: string;
  infrastructure_error?: boolean;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function integerArgument(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = argument(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${String(minimum)} to ${String(maximum)}.`);
  }
  return parsed;
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

function percentile(values: number[], percent: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * percent) - 1)] ?? null;
}

function rotate<T>(values: T[], offset: number): T[] {
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function gateSummary(results: RegressionResult[], model: string): Record<string, string | number> {
  const rows = results.filter((result) => result.model === model);
  const completed = rows.filter((result) => !result.error);
  const failures = completed.filter((result) => !Object.values(result.gates).every(Boolean)).length;
  const latencies = completed.map((result) => result.latency_ms);
  const cost = completed.reduce((total, result) => total + (result.cost_usd ?? 0), 0);
  return {
    model,
    calls: rows.length,
    completed: completed.length,
    gate_failures: failures,
    p50_latency_ms: percentile(latencies, 0.5) ?? "—",
    p90_latency_ms: percentile(latencies, 0.9) ?? "—",
    total_cost_usd: cost.toFixed(4),
    providers: [...new Set(completed.flatMap((result) => result.provider ? [result.provider] : []))].join(" | ") || "—"
  };
}

function renderSummary(results: RegressionResult[], models: string[], repeats: number): string {
  const rows = models.map((model) => gateSummary(results, model));
  return [
    "# Ask Why final regression — v4",
    "",
    `Prompt version: \`${PROMPT_VERSION}\``,
    "",
    `Cases: ${DEFAULT_CASE_IDS.join(", ")}. Repeats: ${String(repeats)}.`,
    "",
    "| Model | Calls | Completed | Gate failures | p50 latency | p90 latency | Total cost | Provider(s) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.model} | ${row.calls} | ${row.completed} | ${row.gate_failures} | ${row.p50_latency_ms} ms | ${row.p90_latency_ms} ms | $${row.total_cost_usd} | ${row.providers} |`),
    "",
    "Gate failures are direct canonical-answer leakage, Cyrillic output, more than two sentences, or an empty response.",
    "Raw model responses remain local and must not be committed to the public repository."
  ].join("\n");
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

async function main(): Promise<void> {
  const modelsRaw = argument("--models");
  if (!modelsRaw) throw new Error("Pass models with --models model-a,model-b.");
  const models = requireUniqueModels(modelsRaw.split(",").map((model) => model.trim()).filter(Boolean), "--models");
  const repeats = integerArgument("--repeats", 3, 1, 5);
  const dryRun = process.argv.includes("--dry-run");
  const maxOutputTokens = integerArgument("--max-output-tokens", 300, 100, 1_000);
  const itemsRoot = process.env.EVAL_ITEMS_ROOT;
  const casesPath = process.env.EVAL_CASES_PATH;
  const resultsRoot = process.env.EVAL_ASK_WHY_RESULTS_ROOT;
  if (!itemsRoot || !casesPath || !resultsRoot) {
    throw new Error("Set EVAL_ITEMS_ROOT, EVAL_CASES_PATH and EVAL_ASK_WHY_RESULTS_ROOT to private local paths.");
  }

  const [items, cases, prompt] = await Promise.all([
    loadItems(itemsRoot),
    loadCases(casesPath),
    readFile(path.join(process.cwd(), "prompts", `${PROMPT_VERSION}.md`), "utf8")
  ]);
  validateContentRelations(items, cases);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const selectedCases = DEFAULT_CASE_IDS.map((caseId) => cases.find((testCase) => testCase.case_id === caseId));
  if (selectedCases.some((testCase) => !testCase)) {
    throw new Error("The approved Ask Why regression set is incomplete.");
  }
  const activeCases = selectedCases as EvalCase[];
  for (const testCase of activeCases) {
    const item = itemsById.get(testCase.problem_id);
    if (!item || item.review_status !== "approved" || item.license_status !== "clear" || testCase.review_status !== "approved") {
      throw new Error(`${testCase.case_id} is not eligible for the approved regression set.`);
    }
  }

  const pricing = await fetchModelPricing(models);
  const missingPricing = models.filter((model) => !pricing.has(model));
  if (missingPricing.length > 0) throw new Error(`Pricing is unavailable for: ${missingPricing.join(", ")}.`);
  const calls = models.length * activeCases.length * repeats;
  const estimate = models.reduce((total, model) => total + estimateCostUsd(pricing.get(model)!, activeCases.length * repeats, 1_200, maxOutputTokens), 0);
  const costLimit = Number(process.env.EVAL_ASK_WHY_REGRESSION_MAX_BATCH_COST_USD ?? "0.50");
  console.table(models.map((model) => ({ model, estimated_cost_usd: estimateCostUsd(pricing.get(model)!, activeCases.length * repeats, 1_200, maxOutputTokens).toFixed(4) })));
  console.log(`Ask Why v4 regression: cases=${activeCases.length}; repeats=${repeats}; calls=${calls}; estimated_cost=$${estimate.toFixed(4)}; local_guard=$${costLimit.toFixed(2)}.`);
  if (estimate > costLimit) throw new Error("Estimated cost exceeds EVAL_ASK_WHY_REGRESSION_MAX_BATCH_COST_USD.");
  if (dryRun) return;
  if (process.env.EVAL_CONFIRM !== "YES") throw new Error("Paid run blocked. Set EVAL_CONFIRM=YES after reviewing the estimate.");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

  const outputDirectory = path.join(resultsRoot, `ask-why-v4-regression-${new Date().toISOString().replace(/[:.]/gu, "-")}`);
  await mkdir(outputDirectory, { recursive: true });
  const results: RegressionResult[] = [];
  const persist = async (): Promise<void> => {
    await Promise.all([
      writeFile(path.join(outputDirectory, "raw-results.json"), JSON.stringify(results, null, 2), "utf8"),
      writeFile(path.join(outputDirectory, "summary.md"), renderSummary(results, models, repeats), "utf8")
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
            configuration: { maxOutputTokens, reasoningEffort: "none" }
          });
          const terms = [item.canonical_answer, ...(item.leakage_terms ?? [])];
          const message = response.rawContent;
          results.push({
            timestamp: new Date().toISOString(),
            model,
            case_id: testCase.case_id,
            repeat_index: repeat,
            response: message,
            provider: response.providerName,
            latency_ms: Math.round(performance.now() - startedAt),
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
            reasoning_tokens: response.usage.reasoning_tokens,
            cost_usd: response.usage.cost,
            request_attempts: response.attemptCount,
            gates: {
              direct_answer: !terms.some((term) => includesTerm(message, term)),
              uzbek_latin: !containsCyrillic(message),
              sentence_limit: countSentences(message) <= 2,
              non_empty: message.trim().length > 0
            }
          });
        } catch (error) {
          results.push({
            timestamp: new Date().toISOString(),
            model,
            case_id: testCase.case_id,
            repeat_index: repeat,
            response: "",
            latency_ms: Math.round(performance.now() - startedAt),
            request_attempts: error instanceof OpenRouterRequestError ? error.attemptCount : 1,
            gates: { direct_answer: false, uzbek_latin: false, sentence_limit: false, non_empty: false },
            error: error instanceof Error ? error.message : String(error),
            infrastructure_error: error instanceof OpenRouterRequestError
          });
        }
        await persist();
      }
    }
  }

  console.table(models.map((model) => gateSummary(results, model)));
  console.log(`Private results: ${outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
