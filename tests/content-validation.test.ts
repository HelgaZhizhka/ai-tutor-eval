import { describe, expect, it } from "vitest";
import { validateContentRelations } from "../src/content.js";
import { assertValidCaseDocument, assertValidMathItem, ContentValidationError } from "../src/schema.js";
import type { EvalCase, MathItem } from "../src/types.js";

const item: MathItem = {
  id: "G5-EN-TEST",
  language: "en",
  review_status: "approved",
  content_role: "foundation",
  statement: "Test statement",
  canonical_answer: "12",
  accepted_answers: ["12"],
  solution_steps: ["A valid step"],
  hint_ladder: ["A valid hint"],
  common_mistakes: [{
    id: "counting_error",
    description: "Counts incorrectly.",
    approved_response_guidance: "Ask the student to count again."
  }],
  leakage_terms: ["12", "twelve"],
  source_type: "original",
  license_status: "clear"
};

const testCase: EvalCase = {
  case_id: "G5-EN-TEST-S1",
  problem_id: item.id,
  language: "en",
  situation: "common_mistake",
  student_attempt: "10",
  conversation_history: [],
  expected_assessment: "common_mistake",
  expected_mistake_id: "counting_error",
  allowed_actions: ["ask_guiding_question"],
  max_hint_level: 1,
  answer_must_not_be_revealed: true,
  reviewer_comment: ""
};

describe("content validation", () => {
  it("rejects an unknown action instead of blaming every model", () => {
    const invalidDocument = {
      cases: [{ ...testCase, allowed_actions: ["ask_guiding_questoin"] }]
    };
    expect(() => assertValidCaseDocument(invalidDocument, "cases/base-cases.yaml")).toThrow(ContentValidationError);
  });

  it("rejects misspelled item fields", () => {
    const invalidItem = { ...item, canonical_answeer: item.canonical_answer };
    delete (invalidItem as Partial<MathItem>).canonical_answer;
    expect(() => assertValidMathItem(invalidItem, "content/items/en/test.yaml")).toThrow(ContentValidationError);
  });

  it("rejects a case that references a misconception from another task", () => {
    expect(() => validateContentRelations([item], [{ ...testCase, expected_mistake_id: "other_mistake" }])).toThrow("is not defined");
  });

  it("rejects duplicate misconception IDs within one task", () => {
    const itemWithDuplicateMistake: MathItem = {
      ...item,
      common_mistakes: [...item.common_mistakes, { ...item.common_mistakes[0] }]
    };
    expect(() => validateContentRelations([itemWithDuplicateMistake], [testCase])).toThrow("duplicate common_mistake ID");
  });

  it("accepts a valid item and matching case", () => {
    const itemWithMetadata: MathItem = {
      ...item,
      grade: 5,
      topic: "Number sense",
      skills: ["Counting"],
      prerequisite_skills: ["Number recognition"],
      difficulty: 1,
      source_reference: "Internal pilot content"
    };
    expect(() => assertValidMathItem(itemWithMetadata, "content/items/en/test.yaml")).not.toThrow();
    expect(() => assertValidCaseDocument({ cases: [testCase] }, "cases/base-cases.yaml")).not.toThrow();
    expect(() => validateContentRelations([item], [testCase])).not.toThrow();
  });
});
