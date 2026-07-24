import { describe, expect, it } from "vitest";
import { containsCyrillic, normalizeUzbekLatin } from "../src/normalize-uzbek.js";

describe("normalizeUzbekLatin", () => {
  it.each(["oʻn", "oʼn", "o‘n", "o’n", "o`n", "o´n", "o'n"])("normalizes %s", (value) => {
    expect(normalizeUzbekLatin(value)).toBe("o'n");
  });

  it("detects Cyrillic in an Uzbek response", () => {
    expect(containsCyrillic("Avval o'ylab ko'ring")).toBe(false);
    expect(containsCyrillic("Аввал ўйлаб кўринг")).toBe(true);
  });
});
