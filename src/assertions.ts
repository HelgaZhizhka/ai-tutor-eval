import { containsCyrillic, normalizeUzbekLatin } from "./normalize-uzbek.js";
import type { AssertionResult, EvalCase, MathItem, TutorDecision } from "./types.js";

function normaliseForMatch(value: string, language: EvalCase["language"]): string {
  const normalized = language === "uz" ? normalizeUzbekLatin(value) : value.normalize("NFC");
  return normalized.toLocaleLowerCase();
}

function includesTerm(message: string, term: string, language: EvalCase["language"]): boolean {
  const haystack = normaliseForMatch(message, language);
  const needle = normaliseForMatch(term, language);
  if (/^[\p{L}\p{N}]+$/u.test(needle)) {
    return new RegExp(`(^|[^\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "u").test(haystack);
  }
  return haystack.includes(needle);
}

export function runAssertions(
  decision: TutorDecision | null,
  item: MathItem,
  testCase: EvalCase,
  schemaValid: boolean,
  schemaErrors: string[] = []
): AssertionResult[] {
  if (!decision) {
    return [{
      id: "A1-schema",
      passed: false,
      severity: "gate",
      message: `No parseable TutorDecision returned. ${schemaErrors.join(" ")}`.trim()
    }];
  }

  const results: AssertionResult[] = [
    {
      id: "A1-schema",
      passed: schemaValid,
      severity: "gate",
      message: schemaValid ? "Response conforms to TutorDecision schema." : schemaErrors.join(" ")
    },
    {
      id: "A2-allowed-action",
      passed: testCase.allowed_actions.includes(decision.next_action),
      severity: "gate",
      message: `next_action=${decision.next_action}; allowed=${testCase.allowed_actions.join(", ")}`
    },
    {
      id: "A3-hint-level",
      passed: decision.hint_level <= testCase.max_hint_level,
      severity: "gate",
      message: `hint_level=${decision.hint_level}; max=${testCase.max_hint_level}`
    },
    {
      id: "A4-mistake-id",
      passed: decision.mistake_id === testCase.expected_mistake_id,
      severity: "score",
      message: `mistake_id=${decision.mistake_id}; expected=${testCase.expected_mistake_id}`
    },
    {
      id: "A5-response-language",
      passed: decision.response_language === testCase.language,
      severity: "gate",
      message: `response_language=${decision.response_language}; requested=${testCase.language}`
    },
    {
      id: "A7-uzbek-script",
      passed: testCase.language !== "uz" || !containsCyrillic(decision.message_to_student),
      severity: "gate",
      message: testCase.language !== "uz" || !containsCyrillic(decision.message_to_student)
        ? "Script check passed."
        : "Uzbek response contains Cyrillic characters; Uzbek MVP uses Latin script."
    },
    {
      id: "A8-message-length",
      passed: [...decision.message_to_student].length <= 300,
      severity: "score",
      message: `message length=${[...decision.message_to_student].length}; max=300`
    }
  ];

  if (testCase.answer_must_not_be_revealed) {
    const terms = [item.canonical_answer, ...item.leakage_terms].filter(Boolean);
    const leaked = terms.filter((term) => includesTerm(decision.message_to_student, term, testCase.language));
    results.push({
      id: "A6-answer-leakage",
      passed: leaked.length === 0,
      severity: "gate",
      message: leaked.length === 0 ? "No configured answer form was found." : `Found forbidden answer form(s): ${leaked.join(", ")}`
    });
  }

  return results;
}

export function hasCriticalFailure(results: AssertionResult[]): boolean {
  return results.some((result) => result.severity === "gate" && !result.passed);
}
