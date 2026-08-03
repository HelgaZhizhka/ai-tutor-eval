import "dotenv/config";
import path from "node:path";
import { runAssertions } from "./assertions.js";
import { buildTutorContext, loadTutorPrompt, TUTOR_PROMPT_VERSION } from "./build-request.js";
import { loadCases, loadItems, selectedApprovedItems, validateActiveEvaluationSet, validateContentRelations } from "./content.js";
import { estimateCostUsd, fetchModelPricing } from "./model-catalog.js";
import { callOpenRouter, MAX_OUTPUT_TOKENS, OpenRouterRequestError } from "./openrouter.js";
import { requireUniqueModels } from "./model-list.js";
import { writeModelScorecard, writeRawResult, writeSummary } from "./report.js";
import { validateDecision } from "./schema.js";
import type { EvalCase, ModelRunResult } from "./types.js";

const PROFILES = {
  screening: [
    "openai/gpt-5.6-terra",
    "openai/gpt-5.6-luna",
    "anthropic/claude-sonnet-5",
    "google/gemini-3.6-flash",
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v4-pro",
    "qwen/qwen3.7-plus"
  ]
} as const;

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseShortlistModels(): string[] {
  const value = process.env.EVAL_SHORTLIST_MODELS;
  if (!value) {
    throw new Error("Set EVAL_SHORTLIST_MODELS=model-a,model-b,model-c before running the shortlist profile.");
  }
  return requireUniqueModels(value.split(",").map((model) => model.trim()).filter(Boolean), "EVAL_SHORTLIST_MODELS");
}

function profileModels(profile: string): string[] {
  if (profile === "shortlist") return parseShortlistModels();
  if (profile === "screening") return requireUniqueModels([...PROFILES.screening], "screening profile");
  throw new Error("Usage: tsx src/cli.ts <screening|shortlist> [--dry-run]");
}

function parseRepeats(profile: string): number {
  const fallback = profile === "shortlist" ? 2 : 1;
  const argument = getArgument("--repeats");
  if (!argument) return fallback;
  const repeats = Number(argument);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 5) {
    throw new Error("--repeats must be an integer from 1 to 5.");
  }
  return repeats;
}

function parseProviderOrders(models: string[]): Map<string, string[]> {
  const raw = process.env.EVAL_PROVIDER_ORDERS_JSON;
  if (!raw) return new Map();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("EVAL_PROVIDER_ORDERS_JSON must be valid JSON, for example {\"model-id\":[\"provider-name\"]}.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EVAL_PROVIDER_ORDERS_JSON must be an object mapping each model ID to a non-empty provider list.");
  }

  const orders = new Map<string, string[]>();
  for (const model of models) {
    const order = (parsed as Record<string, unknown>)[model];
    if (!Array.isArray(order) || order.length === 0 || order.some((provider) => typeof provider !== "string" || provider.length === 0)) {
      throw new Error(`EVAL_PROVIDER_ORDERS_JSON is missing a non-empty provider order for ${model}.`);
    }
    orders.set(model, order as string[]);
  }
  return orders;
}

function rotateModels(models: string[], offset: number): string[] {
  const start = offset % models.length;
  return [...models.slice(start), ...models.slice(0, start)];
}

function parseCaseRange(totalCases: number): { offset: number; limit: number } {
  const offsetValue = getArgument("--case-offset") ?? "0";
  const offset = Number(offsetValue);
  if (!Number.isInteger(offset) || offset < 0 || offset >= totalCases) {
    throw new Error(`--case-offset must be an integer from 0 to ${Math.max(0, totalCases - 1)}.`);
  }

  const limitValue = getArgument("--case-limit");
  const limit = limitValue === undefined ? totalCases - offset : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || offset + limit > totalCases) {
    throw new Error(`--case-limit must select at least one case and remain within the ${totalCases}-case active set.`);
  }
  return { offset, limit };
}

function parseRequestTimeoutMs(): number {
  const raw = process.env.EVAL_REQUEST_TIMEOUT_MS ?? "60000";
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 120_000) {
    throw new Error("EVAL_REQUEST_TIMEOUT_MS must be an integer between 10000 and 120000.");
  }
  return timeoutMs;
}

function parseReasoningEfforts(models: string[]): Map<string, "none" | "minimal" | "low"> {
  const raw = process.env.EVAL_REASONING_EFFORTS_JSON;
  if (!raw) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("EVAL_REASONING_EFFORTS_JSON must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EVAL_REASONING_EFFORTS_JSON must map model IDs to none, minimal, or low.");
  }
  const efforts = new Map<string, "none" | "minimal" | "low">();
  for (const model of models) {
    const effort = (parsed as Record<string, unknown>)[model];
    if (effort === undefined) continue;
    if (effort !== "none" && effort !== "minimal" && effort !== "low") {
      throw new Error(`EVAL_REASONING_EFFORTS_JSON has an invalid effort for ${model}.`);
    }
    efforts.set(model, effort);
  }
  return efforts;
}

function parseOutputTokenLimits(models: string[]): Map<string, number> {
  const raw = process.env.EVAL_MAX_OUTPUT_TOKENS_BY_MODEL_JSON;
  if (!raw) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("EVAL_MAX_OUTPUT_TOKENS_BY_MODEL_JSON must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EVAL_MAX_OUTPUT_TOKENS_BY_MODEL_JSON must map model IDs to integer limits.");
  }
  const limits = new Map<string, number>();
  for (const model of models) {
    const limit = (parsed as Record<string, unknown>)[model];
    if (limit === undefined) continue;
    if (!Number.isInteger(limit) || (limit as number) < 300 || (limit as number) > 4_000) {
      throw new Error(`EVAL_MAX_OUTPUT_TOKENS_BY_MODEL_JSON has an invalid limit for ${model}.`);
    }
    limits.set(model, limit as number);
  }
  return limits;
}

async function main(): Promise<void> {
  const profile = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!profile) throw new Error("Usage: tsx src/cli.ts <screening|shortlist> [--dry-run]");

  const models = profileModels(profile);
  const repeats = parseRepeats(profile);
  const providerOrders = parseProviderOrders(models);
  const reasoningEfforts = parseReasoningEfforts(models);
  const outputTokenLimits = parseOutputTokenLimits(models);
  const requestTimeoutMs = parseRequestTimeoutMs();
  const allItems = await loadItems(process.env.EVAL_ITEMS_ROOT || undefined);
  const approvedItems = selectedApprovedItems(allItems);
  const allCases = await loadCases(process.env.EVAL_CASES_PATH || undefined);
  const resultsRoot = process.env.EVAL_RESULTS_ROOT || path.join(process.cwd(), "results");
  validateContentRelations(allItems, allCases);
  validateActiveEvaluationSet(allItems, allCases);
  const eligibleCases = allCases
    .filter((testCase) => approvedItems.some((item) => item.id === testCase.problem_id && item.language === testCase.language));

  if (approvedItems.length === 0 || eligibleCases.length === 0) {
    throw new Error("No approved evaluation set is available yet. Add at least one teacher-approved item under content/items/ and its matching teacher-reviewed case in cases/base-cases.yaml.");
  }

  if (eligibleCases.length !== allCases.length) {
    throw new Error(`Active evaluation set is incomplete: ${eligibleCases.length} of ${allCases.length} scenarios were selected.`);
  }

  const caseRange = parseCaseRange(eligibleCases.length);
  const selected = eligibleCases.slice(caseRange.offset, caseRange.offset + caseRange.limit);

  console.log(`Evaluation set: approved_tasks=${approvedItems.length}; active_scenarios=${allCases.length}; selected_scenarios=${selected.length}; case_offset=${caseRange.offset}`);

  const calls = models.length * selected.length * repeats;
  if (providerOrders.size === 0) {
    console.warn("No EVAL_PROVIDER_ORDERS_JSON supplied: provider names will be recorded, but latency is a discovery measurement, not a production-like comparison.");
  }
  const pricing = await fetchModelPricing(models);
  const modelsMissingPricing = models.filter((model) => {
    const modelPricing = pricing.get(model);
    return !modelPricing || !Number.isFinite(modelPricing.prompt) || !Number.isFinite(modelPricing.completion);
  });
  if (modelsMissingPricing.length > 0) {
    throw new Error(`Pricing is unavailable for: ${modelsMissingPricing.join(", ")}. The batch was not started.`);
  }
  const estimate = [...pricing.entries()].reduce((total, [model, modelPricing]) => {
    const modelCalls = selected.length * repeats;
    return total + estimateCostUsd(modelPricing, modelCalls, 2_000, outputTokenLimits.get(model) ?? MAX_OUTPUT_TOKENS);
  }, 0);
  const limit = Number(process.env.EVAL_MAX_BATCH_COST_USD ?? "3");

  console.table(models.map((model) => ({
    model,
    available_in_catalogue: pricing.has(model),
    estimated_cost_usd: estimateCostUsd(pricing.get(model)!, selected.length * repeats, 2_000, outputTokenLimits.get(model) ?? MAX_OUTPUT_TOKENS).toFixed(4)
  })));
  console.log(`Profile=${profile}; repeats=${repeats}; calls=${calls}; request_timeout_ms=${requestTimeoutMs}; estimated cost=$${estimate.toFixed(4)} using 2,000 input and ${MAX_OUTPUT_TOKENS} output tokens per call; local estimate guard=$${limit.toFixed(2)}`);

  if (estimate > limit) {
    throw new Error("Estimated batch cost exceeds EVAL_MAX_BATCH_COST_USD. Increase the guard deliberately or reduce the batch.");
  }
  if (dryRun) return;
  if (process.env.EVAL_CONFIRM !== "YES") {
    throw new Error("Paid run blocked. Review the estimate, then set EVAL_CONFIRM=YES for this command only.");
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

  const systemPrompt = await loadTutorPrompt();
  const itemsById = new Map(approvedItems.map((item) => [item.id, item]));
  const results: ModelRunResult[] = [];

  for (let repeatIndex = 1; repeatIndex <= repeats; repeatIndex += 1) {
    for (const [caseIndex, testCase] of selected.entries()) {
      for (const model of rotateModels(models, caseIndex + repeatIndex - 1)) {
        const item = itemsById.get(testCase.problem_id);
        if (!item) continue;
        const startedAt = performance.now();
        const timestamp = new Date().toISOString();
        try {
          const response = await callOpenRouter({
            apiKey,
            model,
            systemPrompt,
            context: buildTutorContext(item, testCase),
            configuration: {
              providerOrder: providerOrders.get(model),
              timeoutMs: requestTimeoutMs,
              reasoningEffort: reasoningEfforts.get(model),
              maxOutputTokens: outputTokenLimits.get(model)
            }
          });
          const validation = validateDecision(response.decision);
          const assertions = runAssertions(
            response.decision,
            item,
            testCase,
            validation.valid,
            validation.errors.map((error) => `${error.instancePath} ${error.message ?? ""}`.trim())
          );
          const result: ModelRunResult = {
            run_id: crypto.randomUUID(),
            timestamp,
            model,
            prompt_version: TUTOR_PROMPT_VERSION,
            case_id: testCase.case_id,
            repeat_index: repeatIndex,
            decision: response.decision,
            raw_content: response.rawContent,
            provider_name: response.providerName,
            generation_id: response.generationId,
            latency_ms: Math.round(performance.now() - startedAt),
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
            cost_usd: response.usage.cost,
            request_attempts: response.attemptCount,
            assertions
          };
          results.push(result);
          await writeRawResult(result, resultsRoot);
        } catch (error) {
          const infrastructureError = error instanceof OpenRouterRequestError;
          const result: ModelRunResult = {
            run_id: crypto.randomUUID(),
            timestamp,
            model,
            prompt_version: TUTOR_PROMPT_VERSION,
            case_id: testCase.case_id,
            repeat_index: repeatIndex,
            decision: null,
            raw_content: "",
            latency_ms: Math.round(performance.now() - startedAt),
            request_attempts: infrastructureError ? error.attemptCount : 1,
            assertions: [],
            error: error instanceof Error ? error.message : String(error),
            infrastructure_error: infrastructureError
          };
          results.push(result);
          await writeRawResult(result, resultsRoot);
        }
      }
    }
  }

  const reportTimestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const caseLabel = selected.length === eligibleCases.length ? "all-cases" : `cases-${caseRange.offset + 1}-${caseRange.offset + selected.length}`;
  const report = await writeSummary(results, `${reportTimestamp}-${profile}-${caseLabel}`, resultsRoot);
  const scorecard = await writeModelScorecard(results, `${reportTimestamp}-${profile}-${caseLabel}`, resultsRoot);
  const failures = results.filter((result) => !result.infrastructure_error && result.assertions.some((assertion) => assertion.severity === "gate" && !assertion.passed));
  const infrastructureErrors = results.filter((result) => result.infrastructure_error);
  const actualCost = results.reduce((total, result) => total + (result.cost_usd ?? 0), 0);
  console.log(`Completed ${results.length} calls. Critical failures=${failures.length}; infrastructure errors=${infrastructureErrors.length}. Actual reported cost=$${actualCost.toFixed(4)}.`);
  console.log(`Summary: ${report}`);
  console.log(`Model scorecard: ${scorecard}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
