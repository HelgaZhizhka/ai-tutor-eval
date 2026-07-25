export interface ModelPricing {
  prompt: number;
  completion: number;
}

interface ModelCatalogResponse {
  data: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }>;
}

export async function fetchModelPricing(models: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, ModelPricing>> {
  const response = await fetchImpl("https://openrouter.ai/api/v1/models");
  if (!response.ok) {
    throw new Error(`Could not fetch OpenRouter model catalogue (${response.status}).`);
  }

  const payload = await response.json() as ModelCatalogResponse;
  const selected = new Map<string, ModelPricing>();
  for (const entry of payload.data) {
    if (!models.includes(entry.id)) continue;
    if (entry.pricing?.prompt === undefined || entry.pricing.completion === undefined) continue;
    const prompt = Number(entry.pricing.prompt);
    const completion = Number(entry.pricing.completion);
    if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue;
    selected.set(entry.id, {
      prompt,
      completion
    });
  }
  return selected;
}

export function estimateCostUsd(
  pricing: ModelPricing,
  calls: number,
  inputTokensPerCall = 2_000,
  outputTokensPerCall = 250
): number {
  return calls * ((pricing.prompt * inputTokensPerCall) + (pricing.completion * outputTokensPerCall));
}
