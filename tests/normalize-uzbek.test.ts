import { describe, expect, it } from "vitest";
import { normalizeUzbekLatin } from "../src/normalize-uzbek.js";

describe("normalizeUzbekLatin", () => {
  it.each(["oʻn", "oʼn", "o‘n", "o’n", "o`n", "o´n", "o'n"])("normalizes %s", (value) => {
    expect(normalizeUzbekLatin(value)).toBe("o'n");
  });

});
