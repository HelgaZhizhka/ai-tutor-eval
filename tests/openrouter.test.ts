import { describe, expect, it } from "vitest";
import { callOpenRouter, callOpenRouterText, MAX_OUTPUT_TOKENS } from "../src/openrouter.js";

const input = {
  apiKey: "test-key",
  model: "test-model",
  systemPrompt: "test prompt",
  context: {},
  responseSchema: {}
};

describe("OpenRouter request handling", () => {
  it("retries a temporary 429 and records the successful attempt", async () => {
    const requests: RequestInit[] = [];
    const waits: number[] = [];
    const responses = [
      new Response("rate limited", { status: 429, headers: { "Retry-After": "0" } }),
      new Response(JSON.stringify({
        id: "generation-1",
        provider: "test-provider",
        choices: [{ message: { content: JSON.stringify({}) } }],
        usage: { completion_tokens: 5 }
      }), { status: 200 })
    ];
    const fetchImpl: typeof fetch = async (_request, init) => {
      requests.push(init ?? {});
      return responses.shift()!;
    };

    const result = await callOpenRouter({ ...input, fetchImpl, wait: async (milliseconds) => { waits.push(milliseconds); } });

    expect(result.attemptCount).toBe(2);
    expect(requests).toHaveLength(2);
    expect(waits).toEqual([0]);
    const body = JSON.parse(String(requests[0].body));
    expect(body.max_tokens).toBe(MAX_OUTPUT_TOKENS);
    expect(body.temperature).toBeUndefined();
  });

  it("does not retry an invalid 400 request", async () => {
    const fetchImpl: typeof fetch = async () => new Response("bad request", { status: 400 });
    await expect(callOpenRouter({ ...input, fetchImpl, wait: async () => undefined })).rejects.toMatchObject({
      name: "OpenRouterRequestError",
      attemptCount: 1,
      retryable: false
    });
  });

  it("pins the requested provider order for the structured tutor call", async () => {
    const requests: RequestInit[] = [];
    const fetchImpl: typeof fetch = async (_request, init) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({}) } }],
        usage: {}
      }), { status: 200 });
    };

    await callOpenRouter({
      ...input,
      configuration: { providerOrder: ["test-provider"] },
      fetchImpl,
      wait: async () => undefined
    });

    const body = JSON.parse(String(requests[0].body));
    expect(body.provider).toEqual({
      order: ["test-provider"],
      allow_fallbacks: false,
      require_parameters: true,
      data_collection: "deny"
    });
  });

  it("uses the configured structured-call timeout", async () => {
    let timedOutAfter: number | undefined;
    const originalTimeout = AbortSignal.timeout;
    AbortSignal.timeout = ((milliseconds: number) => {
      timedOutAfter = milliseconds;
      return originalTimeout(milliseconds);
    }) as typeof AbortSignal.timeout;

    try {
      const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({}) } }],
        usage: {}
      }), { status: 200 });
      await callOpenRouter({ ...input, configuration: { timeoutMs: 45_000 }, fetchImpl, wait: async () => undefined });
      expect(timedOutAfter).toBe(45_000);
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });

  it("returns a text response and completion reason for the synthetic smoke test", async () => {
    const requests: RequestInit[] = [];
    const fetchImpl: typeof fetch = async (_request, init) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({
        id: "generation-text-1",
        provider: "test-provider",
        choices: [{ message: { content: "Uzbek response" }, finish_reason: "stop" }],
        usage: { completion_tokens: 12 }
      }), { status: 200 });
    };

    const result = await callOpenRouterText({
      ...input,
      configuration: { reasoningEffort: "none", maxOutputTokens: 1_000, providerOrder: ["test-provider"] },
      fetchImpl,
      wait: async () => undefined
    });

    expect(result).toMatchObject({ rawContent: "Uzbek response", finishReason: "stop", attemptCount: 1 });
    const body = JSON.parse(String(requests[0].body));
    expect(body.reasoning).toEqual({ effort: "none", exclude: true });
    expect(body.max_tokens).toBe(1_000);
    expect(body.provider).toEqual({ order: ["test-provider"], allow_fallbacks: false, data_collection: "deny" });
    expect(body.response_format).toBeUndefined();
  });
});
