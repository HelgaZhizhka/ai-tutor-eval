import { describe, expect, it } from "vitest";
import { runAssertions } from "../src/assertions.js";
import { validateDecision } from "../src/schema.js";
import type { EvalCase, MathItem, TutorDecision } from "../src/types.js";

const item: MathItem = {
  id: "G5-EN-TEST",
  language: "en",
  review_status: "approved",
  approval_scope: "initial_model_evaluation",
  content_role: "foundation",
  statement: "197 children need minibuses with 15 seats each.",
  canonical_answer: "14",
  accepted_answers: ["14 minibuses"],
  solution_steps: ["Divide 197 by 15.", "Interpret the remainder."],
  hint_ladder: ["How many children can 13 buses carry?"],
  common_mistakes: [{
    id: "remainder_ignored",
    description: "Ignores the remaining children.",
    example_student_answer: "13",
    approved_response_guidance: "Ask what happens to the remaining children."
  }],
  leakage_terms: ["14", "fourteen", "14 minibuses"],
  source_type: "original",
  license_status: "clear"
};

const testCase: EvalCase = {
  case_id: "G5-EN-TEST-S2-EN",
  problem_id: item.id,
  language: "en",
  situation: "common_mistake",
  student_attempt: "13 minibuses",
  conversation_history: [],
  expected_assessment: "common_mistake",
  expected_mistake_id: "remainder_ignored",
  allowed_actions: ["ask_guiding_question"],
  max_hint_level: 1,
  answer_must_not_be_revealed: true,
  reviewer_comment: ""
};

const validDecision: TutorDecision = {
  assessment: "common_mistake",
  mistake_id: "remainder_ignored",
  next_action: "ask_guiding_question",
  hint_level: 1,
  message_to_student: "Good start. After filling 13 buses, are there any children still waiting?",
  response_language: "en"
};

describe("evaluation assertions", () => {
  it("passes the core gates for a safe response", () => {
    const validation = validateDecision(validDecision);
    const assertions = runAssertions(validDecision, item, testCase, validation.valid, []);
    expect(assertions.filter((assertion) => assertion.severity === "gate" && !assertion.passed)).toEqual([]);
  });

  it("flags answer leakage", () => {
    const leaked: TutorDecision = {
      ...validDecision,
      message_to_student: "You need 14 minibuses because one more bus is needed."
    };
    const validation = validateDecision(leaked);
    const assertions = runAssertions(leaked, item, testCase, validation.valid, []);
    expect(assertions.find((assertion) => assertion.id === "A6-answer-leakage")?.passed).toBe(false);
  });

  it("records a mismatched assessment as a scoring failure", () => {
    const wrongAssessment: TutorDecision = { ...validDecision, assessment: "unknown_mistake" };
    const validation = validateDecision(wrongAssessment);
    const assertions = runAssertions(wrongAssessment, item, testCase, validation.valid, []);
    expect(assertions.find((assertion) => assertion.id === "A0-assessment")?.passed).toBe(false);
  });

  it("flags Uzbek Cyrillic when Latin Uzbek was requested", () => {
    const uzbekCase: EvalCase = { ...testCase, language: "uz" };
    const uzbekItem: MathItem = { ...item, language: "uz" };
    const incorrectScript: TutorDecision = {
      ...validDecision,
      response_language: "uz",
      message_to_student: "Қолган болалар ҳақида ўйлаб кўринг."
    };
    const validation = validateDecision(incorrectScript);
    const assertions = runAssertions(incorrectScript, uzbekItem, uzbekCase, validation.valid, []);
    expect(assertions.find((assertion) => assertion.id === "A7-uzbek-script")?.passed).toBe(false);
  });
});
