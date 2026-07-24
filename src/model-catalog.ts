export interface ModelPricing {
  prompt: number;
  completion: number;
}

interface ModelCatalogResponse {
  data: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }>;
}

export async function fetchModelPricing(models: string[]): Promise<Map<string, ModelPricing>> {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  if (!response.ok) {
    throw new Error(`Could not fetch OpenRouter model catalogue (${response.status}).`);
  }

  const payload = await response.json() as ModelCatalogResponse;
  const selected = new Map<string, ModelPricing>();
  for (const entry of payload.data) {
    if (!models.includes(entry.id)) continue;
    selected.set(entry.id, {
      prompt: Number(entry.pricing?.prompt ?? 0),
      completion: Number(entry.pricing?.completion ?? 0)
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
