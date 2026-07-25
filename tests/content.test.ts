import { describe, expect, it } from "vitest";
import { selectedApprovedItems } from "../src/content.js";
import type { MathItem } from "../src/types.js";

const item = (id: string, overrides: Partial<MathItem> = {}): MathItem => ({
  id,
  language: "en",
  review_status: "approved",
  content_role: "foundation",
  statement: "Test statement",
  canonical_answer: "1",
  accepted_answers: ["1"],
  solution_steps: ["Step"],
  hint_ladder: ["Hint"],
  common_mistakes: [],
  leakage_terms: ["1"],
  source_type: "original",
  license_status: "clear",
  ...overrides
});

describe("selectedApprovedItems", () => {
  it("keeps only approved items with a clear licence", () => {
    const approved = item("APPROVED");
    const draft = item("DRAFT", { review_status: "draft" });
    const unresolved = item("UNRESOLVED", { license_status: "unresolved" });
    expect(selectedApprovedItems([approved, draft, unresolved]).map((entry) => entry.id)).toEqual(["APPROVED"]);
  });
});
