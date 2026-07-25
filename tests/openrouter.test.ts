import { describe, expect, it } from "vitest";
import { callOpenRouter, MAX_OUTPUT_TOKENS } from "../src/openrouter.js";

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
  });

  it("does not retry an invalid 400 request", async () => {
    const fetchImpl: typeof fetch = async () => new Response("bad request", { status: 400 });
    await expect(callOpenRouter({ ...input, fetchImpl, wait: async () => undefined })).rejects.toMatchObject({
      name: "OpenRouterRequestError",
      attemptCount: 1,
      retryable: false
    });
  });
});
