import { describe, expect, it } from "vitest";
import { selectedApprovedItems } from "../src/content.js";
import type { MathItem } from "../src/types.js";

const item = (id: string, approval_scope: MathItem["approval_scope"]): MathItem => ({
  id,
  language: "en",
  review_status: "approved",
  approval_scope,
  content_role: "foundation",
  statement: "Test statement",
  canonical_answer: "1",
  accepted_answers: ["1"],
  solution_steps: ["Step"],
  hint_ladder: ["Hint"],
  common_mistakes: [],
  leakage_terms: ["1"],
  source_type: "original",
  license_status: "clear"
});

describe("selectedApprovedItems", () => {
  const technicalSmoke = item("TECH-1", "technical_smoke");
  const pedagogical = item("EVAL-1", "initial_model_evaluation");

  it("keeps technical smoke items out of screening", () => {
    expect(selectedApprovedItems([technicalSmoke, pedagogical], "initial_model_evaluation").map((entry) => entry.id)).toEqual(["EVAL-1"]);
  });

  it("allows either approved scope for a smoke run", () => {
    expect(selectedApprovedItems([technicalSmoke, pedagogical], "smoke").map((entry) => entry.id)).toEqual(["TECH-1", "EVAL-1"]);
  });
});
