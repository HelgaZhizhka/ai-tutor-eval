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
  timeoutMs?: number;
  /**
   * Free-model requests count against a limited daily quota even when they
   * fail. Evaluation runs therefore record a 429 instead of immediately
   * consuming more quota with automatic retries.
   */
  retryOnRateLimit?: boolean;
}

export interface TutorRequestConfiguration {
  providerOrder?: string[];
  timeoutMs?: number;
  reasoningEffort?: "none" | "minimal" | "low";
  maxOutputTokens?: number;
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

function parseTutorDecisionContent(rawContent: string): TutorDecision | null {
  const withoutFence = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(withoutFence);
    // Some providers emit a harmless {"json": {...}} envelope in json-object
    // mode. Preserve rawContent for auditability, but evaluate the actual
    // decision object rather than treating provider-specific transport syntax
    // as tutor behaviour.
    if (
      parsed
      && typeof parsed === "object"
      && !Array.isArray(parsed)
      && Object.keys(parsed).length === 1
      && "json" in parsed
      && (parsed as { json?: unknown }).json
      && typeof (parsed as { json?: unknown }).json === "object"
      && !Array.isArray((parsed as { json?: unknown }).json)
    ) {
      return (parsed as { json: TutorDecision }).json;
    }
    return parsed as TutorDecision;
  } catch {
    return null;
  }
}

export async function callOpenRouter(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  context: Record<string, unknown>;
  configuration?: TutorRequestConfiguration;
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
        signal: AbortSignal.timeout(input.configuration?.timeoutMs ?? 60_000),
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: JSON.stringify(input.context) }
          ],
          // Do not send `temperature` here. Some pinned endpoints supporting
          // strict JSON schema reject it, while others accept it. Omitting an
          // unsupported optional parameter keeps the contract comparable
          // across all shortlisted models; repeat runs capture residual
          // response variance.
          max_tokens: input.configuration?.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
          // This task needs a short, constrained next move rather than a
          // long hidden chain of thought. Explicitly disable reasoning so it
          // cannot consume the JSON response budget (not merely hide it).
          reasoning: { effort: input.configuration?.reasoningEffort ?? "none" },
          response_format: {
            // `json_object` is the portable OpenRouter response-format subset
            // accepted by the shortlisted providers. The full TutorDecision
            // schema remains enforced locally after parsing.
            type: "json_object"
          },
          provider: {
            ...(input.configuration?.providerOrder ? { order: input.configuration.providerOrder } : {}),
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
        const decision = parseTutorDecisionContent(rawContent);

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
 * Text-only call used by Ask Why evaluation and regression checks.
 * It is separate from the structured Ask Tutor evaluation flow.
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
  const retryOnRateLimit = input.configuration?.retryOnRateLimit ?? true;
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
        signal: AbortSignal.timeout(input.configuration?.timeoutMs ?? 30_000),
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: JSON.stringify(input.context) }
          ],
          max_tokens: input.configuration?.maxOutputTokens ?? 600,
          reasoning: {
            // Keep this explicit rather than hiding reasoning with `exclude`:
            // hidden reasoning can still consume the response budget.
            effort: input.configuration?.reasoningEffort ?? "none"
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

      const retryable = RETRYABLE_STATUSES.has(response.status)
        && (response.status !== 429 || retryOnRateLimit);
      lastError = new OpenRouterRequestError(
        `OpenRouter request failed (${response.status}): ${responseText}`,
        attemptCount,
        retryable
      );
      if (!retryable || attemptCount === MAX_REQUEST_ATTEMPTS) {
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
