import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EvalCase, MathItem } from "./types.js";

export const TUTOR_PROMPT_VERSION = "tutor.v1";

export async function loadTutorPrompt(): Promise<string> {
  return readFile(path.join(process.cwd(), "prompts", `${TUTOR_PROMPT_VERSION}.md`), "utf8");
}

export function buildTutorContext(item: MathItem, testCase: EvalCase): Record<string, unknown> {
  return {
    item: {
      id: item.id,
      statement: item.statement,
      canonical_answer: item.canonical_answer,
      accepted_answers: item.accepted_answers,
      solution_steps: item.solution_steps,
      hint_ladder: item.hint_ladder,
      common_mistakes: item.common_mistakes
    },
    student_attempt: testCase.student_attempt,
    conversation_history: testCase.conversation_history,
    response_language: testCase.language,
    requested_script: testCase.language === "uz" ? "Latn" : undefined,
    allowed_actions: testCase.allowed_actions,
    max_hint_level: testCase.max_hint_level,
    answer_must_not_be_revealed: testCase.answer_must_not_be_revealed
  };
}
