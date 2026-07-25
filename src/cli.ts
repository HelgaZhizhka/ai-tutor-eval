import "dotenv/config";
import { readFile } from "node:fs/promises";
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

async function main(): Promise<void> {
  const profile = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!profile) throw new Error("Usage: tsx src/cli.ts <screening|shortlist> [--dry-run]");

  const models = profileModels(profile);
  const repeats = parseRepeats(profile);
  const allItems = await loadItems();
  const approvedItems = selectedApprovedItems(allItems);
  const allCases = await loadCases();
  validateContentRelations(allItems, allCases);
  validateActiveEvaluationSet(allItems, allCases);
  const selected = allCases
    .filter((testCase) => approvedItems.some((item) => item.id === testCase.problem_id && item.language === testCase.language));

  if (approvedItems.length === 0 || selected.length === 0) {
    throw new Error("No approved evaluation set is available yet. Add at least one teacher-approved item under content/items/ and its matching teacher-reviewed case in cases/base-cases.yaml.");
  }

  if (selected.length !== allCases.length) {
    throw new Error(`Active evaluation set is incomplete: ${selected.length} of ${allCases.length} scenarios were selected.`);
  }

  console.log(`Evaluation set: approved_tasks=${approvedItems.length}; active_scenarios=${allCases.length}; selected_scenarios=${selected.length}`);

  const calls = models.length * selected.length * repeats;
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
    return total + estimateCostUsd(modelPricing, modelCalls, 2_000, MAX_OUTPUT_TOKENS);
  }, 0);
  const limit = Number(process.env.EVAL_MAX_BATCH_COST_USD ?? "3");

  console.table(models.map((model) => ({
    model,
    available_in_catalogue: pricing.has(model),
    estimated_cost_usd: estimateCostUsd(pricing.get(model)!, selected.length * repeats, 2_000, MAX_OUTPUT_TOKENS).toFixed(4)
  })));
  console.log(`Profile=${profile}; repeats=${repeats}; calls=${calls}; estimated cost=$${estimate.toFixed(4)} using 2,000 input and ${MAX_OUTPUT_TOKENS} output tokens per call; local estimate guard=$${limit.toFixed(2)}`);

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
  const responseSchema = JSON.parse(await readFile(path.join(process.cwd(), "schema", "tutor-decision.schema.json"), "utf8"));
  const itemsById = new Map(approvedItems.map((item) => [item.id, item]));
  const results: ModelRunResult[] = [];

  for (const model of models) {
    for (let repeatIndex = 1; repeatIndex <= repeats; repeatIndex += 1) {
      for (const testCase of selected) {
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
            responseSchema
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
          await writeRawResult(result);
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
          await writeRawResult(result);
        }
      }
    }
  }

  const reportTimestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const report = await writeSummary(results, `${reportTimestamp}-${profile}`);
  const scorecard = await writeModelScorecard(results, `${reportTimestamp}-${profile}`);
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
