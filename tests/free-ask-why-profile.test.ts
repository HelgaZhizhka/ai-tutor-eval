import { describe, expect, it } from "vitest";
import {
  FREE_ASK_WHY_SCREENING_MODELS,
  FREE_ASK_WHY_REASONING_EFFORTS,
  assertFreeDailyLimit,
  assertZeroCostFreeModels
} from "../src/free-ask-why-profile.js";

describe("free Ask Why profile", () => {
  it("uses a pinned, unique set of :free model IDs", () => {
    expect(FREE_ASK_WHY_SCREENING_MODELS).toHaveLength(6);
    expect(new Set(FREE_ASK_WHY_SCREENING_MODELS).size).toBe(FREE_ASK_WHY_SCREENING_MODELS.length);
    expect(FREE_ASK_WHY_SCREENING_MODELS.every((model) => model.endsWith(":free"))).toBe(true);
  });

  it("rejects a model that is no longer free in the live catalogue", () => {
    const pricing = new Map([
      ["candidate:free", { prompt: 0, completion: 0 }],
      ["no-longer-free:free", { prompt: 0.000001, completion: 0.000002 }]
    ]);

    expect(() => assertZeroCostFreeModels(["candidate:free", "no-longer-free:free"], pricing)).toThrow("no-longer-free:free");
  });

  it("does not allow a no-credit daily allowance to be exceeded", () => {
    expect(() => assertFreeDailyLimit(51)).toThrow("51 requests");
    expect(() => assertFreeDailyLimit(50)).not.toThrow();
  });

  it("records the minimum supported reasoning setting where a free model requires it", () => {
    expect(FREE_ASK_WHY_REASONING_EFFORTS["openai/gpt-oss-20b:free"]).toBe("minimal");
  });
});
