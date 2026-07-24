import type { TutorDecision } from "./types.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
}

interface OpenRouterResponse {
  id?: string;
  provider?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: OpenRouterUsage;
}

export interface ModelResponse {
  rawContent: string;
  decision: TutorDecision | null;
  providerName?: string;
  generationId?: string;
  usage: OpenRouterUsage;
}

export async function callOpenRouter(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  context: Record<string, unknown>;
  responseSchema: object;
}): Promise<ModelResponse> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Olympiad Academy AI Tutor Evaluation"
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: JSON.stringify(input.context) }
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tutor_decision",
          strict: true,
          schema: input.responseSchema
        }
      },
      provider: {
        allow_fallbacks: false,
        require_parameters: true,
        data_collection: "deny"
      }
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${responseText}`);
  }

  const payload = JSON.parse(responseText) as OpenRouterResponse;
  const rawContent = payload.choices?.[0]?.message?.content ?? "";
  let decision: TutorDecision | null = null;
  try {
    decision = JSON.parse(rawContent) as TutorDecision;
  } catch {
    // A non-JSON response is recorded and evaluated as a schema failure.
  }

  return {
    rawContent,
    decision,
    providerName: payload.provider,
    generationId: payload.id,
    usage: payload.usage ?? {}
  };
}
