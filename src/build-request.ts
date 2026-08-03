import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EvalCase, MathItem } from "./types.js";

export const TUTOR_PROMPT_VERSION = "tutor.ask.v2";

export async function loadTutorPrompt(): Promise<string> {
  return readFile(path.join(process.cwd(), "prompts", `${TUTOR_PROMPT_VERSION}.md`), "utf8");
}

export function buildTutorContext(item: MathItem, testCase: EvalCase): Record<string, unknown> {
  return {
    item: {
      id: item.id,
      statement: item.statement,
      shown_hints: item.hint_ladder.slice(0, 2)
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
