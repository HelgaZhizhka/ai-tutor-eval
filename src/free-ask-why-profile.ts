import type { ModelPricing } from "./model-catalog.js";

/**
 * Snapshot of the free-text model catalogue on 2026-08-08.
 *
 * The runner verifies every entry against the live OpenRouter catalogue before
 * making a request. This list is deliberately pinned rather than using
 * `openrouter/free`, whose randomly selected model would make the comparison
 * impossible to reproduce.
 */
export const FREE_ASK_WHY_SCREENING_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free"
] as const;

export const FREE_MODEL_DAILY_REQUEST_LIMIT = 50;
export const FREE_MODEL_REQUEST_INTERVAL_MS = 3_200;

export function assertZeroCostFreeModels(models: readonly string[], pricing: Map<string, ModelPricing>): void {
  const invalid = models.filter((model) => {
    const modelPricing = pricing.get(model);
    return !model.endsWith(":free")
      || !modelPricing
      || modelPricing.prompt !== 0
      || modelPricing.completion !== 0;
  });

  if (invalid.length > 0) {
    throw new Error(
      `The batch was not started because these models are not confirmed as zero-cost :free variants: ${invalid.join(", ")}. `
      + "Refresh the shortlist deliberately; do not silently substitute another model."
    );
  }
}

export function assertFreeDailyLimit(calls: number): void {
  if (calls > FREE_MODEL_DAILY_REQUEST_LIMIT) {
    throw new Error(
      `This free-model batch would make ${String(calls)} requests, above the ${String(FREE_MODEL_DAILY_REQUEST_LIMIT)}-request daily allowance. `
      + "Split the run across days or reduce the frozen case set."
    );
  }
}
