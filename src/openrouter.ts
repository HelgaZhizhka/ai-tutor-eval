import type { TutorDecision } from "./types.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_OUTPUT_TOKENS = 1_200;
const MAX_REQUEST_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  reasoning_tokens?: number;
  cost?: number;
}

interface OpenRouterResponse {
  id?: string;
  provider?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: OpenRouterUsage;
}

export interface ModelResponse {
  rawContent: string;
  decision: TutorDecision | null;
  providerName?: string;
  generationId?: string;
  usage: OpenRouterUsage;
  attemptCount: number;
}

export interface TextModelResponse {
  rawContent: string;
  providerName?: string;
  generationId?: string;
  finishReason?: string;
  usage: OpenRouterUsage;
  attemptCount: number;
}

export interface TextRequestConfiguration {
  maxOutputTokens?: number;
  reasoningEffort?: "none" | "minimal" | "low";
  providerOrder?: string[];
}

export class OpenRouterRequestError extends Error {
  constructor(
    message: string,
    readonly attemptCount: number,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "OpenRouterRequestError";
  }
}

function retryDelayMs(response: Response | undefined, attemptCount: number): number {
  const retryAfterSeconds = Number(response?.headers.get("Retry-After"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1_000;
  }
  return 500 * (2 ** (attemptCount - 1));
}

function isTemporaryNetworkError(error: unknown): boolean {
  return (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
    || error instanceof TypeError;
}

export async function callOpenRouter(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  context: Record<string, unknown>;
  responseSchema: object;
  fetchImpl?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}): Promise<ModelResponse> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const wait = input.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;

  for (let attemptCount = 1; attemptCount <= MAX_REQUEST_ATTEMPTS; attemptCount += 1) {
    let response: Response | undefined;
    try {
      response = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Olympiad Academy AI Tutor Evaluation"
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: JSON.stringify(input.context) }
          ],
          temperature: 0,
          max_tokens: MAX_OUTPUT_TOKENS,
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
      if (response.ok) {
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
          usage: payload.usage ?? {},
          attemptCount
        };
      }

      lastError = new OpenRouterRequestError(
        `OpenRouter request failed (${response.status}): ${responseText}`,
        attemptCount,
        RETRYABLE_STATUSES.has(response.status)
      );
      if (!RETRYABLE_STATUSES.has(response.status) || attemptCount === MAX_REQUEST_ATTEMPTS) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      const shouldRetry = error instanceof OpenRouterRequestError ? error.retryable : isTemporaryNetworkError(error);
      if (!shouldRetry || attemptCount === MAX_REQUEST_ATTEMPTS) {
        if (error instanceof OpenRouterRequestError) throw error;
        throw new OpenRouterRequestError(`OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`, attemptCount, false);
      }
    }

    await wait(retryDelayMs(response, attemptCount));
  }

  throw new OpenRouterRequestError(`OpenRouter request failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`, MAX_REQUEST_ATTEMPTS, false);
}

/**
 * A deliberately small text-only call for the synthetic Ask Why smoke test.
 * It is not used by the active TutorDecision evaluation flow.
 */
export async function callOpenRouterText(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  context: Record<string, unknown>;
  configuration?: TextRequestConfiguration;
  fetchImpl?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}): Promise<TextModelResponse> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const wait = input.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;

  for (let attemptCount = 1; attemptCount <= MAX_REQUEST_ATTEMPTS; attemptCount += 1) {
    let response: Response | undefined;
    try {
      response = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Olympiad Academy Synthetic Ask Why Smoke Test"
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: JSON.stringify(input.context) }
          ],
          temperature: 0,
          max_tokens: input.configuration?.maxOutputTokens ?? 600,
          reasoning: {
            // `exclude` hides reasoning from the learner; it does not turn it
            // off. The selected effort is recorded with every run.
            effort: input.configuration?.reasoningEffort ?? "low",
            exclude: true
          },
          provider: {
            // If an order is supplied, this is a controlled provider run.
            // Otherwise this remains a discovery run and the chosen provider is
            // recorded in the result.
            ...(input.configuration?.providerOrder ? { order: input.configuration.providerOrder } : {}),
            allow_fallbacks: input.configuration?.providerOrder ? false : true,
            data_collection: "deny"
          }
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const payload = JSON.parse(responseText) as OpenRouterResponse;
        return {
          rawContent: payload.choices?.[0]?.message?.content ?? "",
          providerName: payload.provider,
          generationId: payload.id,
          finishReason: payload.choices?.[0]?.finish_reason,
          usage: payload.usage ?? {},
          attemptCount
        };
      }

      lastError = new OpenRouterRequestError(
        `OpenRouter request failed (${response.status}): ${responseText}`,
        attemptCount,
        RETRYABLE_STATUSES.has(response.status)
      );
      if (!RETRYABLE_STATUSES.has(response.status) || attemptCount === MAX_REQUEST_ATTEMPTS) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      const shouldRetry = error instanceof OpenRouterRequestError ? error.retryable : isTemporaryNetworkError(error);
      if (!shouldRetry || attemptCount === MAX_REQUEST_ATTEMPTS) {
        if (error instanceof OpenRouterRequestError) throw error;
        throw new OpenRouterRequestError(`OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`, attemptCount, false);
      }
    }

    await wait(retryDelayMs(response, attemptCount));
  }

  throw new OpenRouterRequestError(`OpenRouter request failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`, MAX_REQUEST_ATTEMPTS, false);
}
