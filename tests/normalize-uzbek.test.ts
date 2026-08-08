import { describe, expect, it } from "vitest";
import { containsCyrillic, countSentences, normalizeUzbekLatin } from "../src/normalize-uzbek.js";

describe("normalizeUzbekLatin", () => {
  it.each(["oʻn", "oʼn", "o‘n", "o’n", "o`n", "o´n", "o'n"])("normalizes %s", (value) => {
    expect(normalizeUzbekLatin(value)).toBe("o'n");
  });

  it("detects Cyrillic in Uzbek-model output", () => {
    expect(containsCyrillic("Avval o'ylab ko'ring")).toBe(false);
    expect(containsCyrillic("Аввал ўйлаб кўринг")).toBe(true);
  });

  it("does not count decimal separators as sentence endings", () => {
    expect(countSentences("0.707 kichikroq. Buni tekshirib ko'ring.")).toBe(2);
    expect(countSentences("0,707 kichikroq. Buni tekshirib ko'ring.")).toBe(2);
  });

});
