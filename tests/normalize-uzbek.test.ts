import { describe, expect, it } from "vitest";
import { containsCyrillic, normalizeUzbekLatin } from "../src/normalize-uzbek.js";

describe("normalizeUzbekLatin", () => {
  it.each(["oʻn", "oʼn", "o‘n", "o’n", "o`n", "o´n", "o'n"])("normalizes %s", (value) => {
    expect(normalizeUzbekLatin(value)).toBe("o'n");
  });

  it("detects Cyrillic in Uzbek-model output", () => {
    expect(containsCyrillic("Avval o'ylab ko'ring")).toBe(false);
    expect(containsCyrillic("Аввал ўйлаб кўринг")).toBe(true);
  });

});
