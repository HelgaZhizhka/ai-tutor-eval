import { describe, expect, it } from "vitest";
import { buildTutorContext, TUTOR_PROMPT_VERSION } from "../src/build-request.js";
import type { EvalCase, MathItem } from "../src/types.js";

const item: MathItem = {
  id: "G5-EN-TEST",
  language: "en",
  review_status: "approved",
  content_role: "foundation",
  statement: "Arrange 12 counters into equal groups.",
  canonical_answer: "Any grouping with equal group sizes.",
  accepted_answers: ["2 groups of 6", "3 groups of 4"],
  solution_steps: ["Make equal groups."],
  hint_ladder: ["Try drawing 12 counters."],
  common_mistakes: [],
  accepted_approaches: [{
    label: "drawing groups",
    recognition_guidance: "A clear drawing of equal groups is a valid approach."
  }],
  leakage_terms: [],
  source_type: "original",
  license_status: "clear"
};

const testCase: EvalCase = {
  case_id: "G5-EN-TEST-S1",
  problem_id: item.id,
  language: "en",
  review_status: "approved",
  reviewed_by: "Content Lead",
  reviewed_at: "2026-07-25",
  situation: "correct",
  student_attempt: "I drew 3 groups with 4 counters in each.",
  conversation_history: [],
  expected_assessment: "correct",
  expected_mistake_id: null,
  allowed_actions: ["confirm_and_close"],
  max_hint_level: 0,
  answer_must_not_be_revealed: false,
  reviewer_comment: ""
};

describe("tutor request building", () => {
  it("passes approved alternative-approach guidance to the tutor", () => {
    const context = buildTutorContext(item, testCase);
    expect(TUTOR_PROMPT_VERSION).toBe("tutor.v2");
    expect(context.item).toMatchObject({ accepted_approaches: item.accepted_approaches });
  });
});
