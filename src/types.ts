export const ASSESSMENTS = [
  "correct",
  "partially_correct",
  "common_mistake",
  "unknown_mistake",
  "does_not_know",
  "asks_for_answer",
  "off_topic",
  "rule_bypass_attempt"
] as const;

export const NEXT_ACTIONS = [
  "ask_to_explain",
  "ask_guiding_question",
  "give_hint",
  "recall_rule",
  "show_next_step",
  "offer_prerequisite",
  "confirm_and_close",
  "redirect_to_task"
] as const;

export type Assessment = (typeof ASSESSMENTS)[number];
export type NextAction = (typeof NEXT_ACTIONS)[number];
export type Language = "en" | "ru" | "uz";

export interface TutorDecision {
  assessment: Assessment;
  mistake_id: string | null;
  next_action: NextAction;
  hint_level: 0 | 1 | 2 | 3;
  message_to_student: string;
  response_language: Language;
}

export interface CommonMistake {
  id: string;
  description: string;
  example_student_answer?: string;
  approved_response_guidance: string;
}

export interface AcceptedApproach {
  label: string;
  recognition_guidance: string;
}

export interface MathItem {
  id: string;
  language: Language;
  locale?: string;
  script?: "Latn" | "Cyrl";
  review_status: "draft" | "approved" | "rejected";
  content_role: "diagnostic" | "foundation" | "olympiad";
  grade?: number;
  topic?: string;
  skills?: string[];
  prerequisite_skills?: string[];
  difficulty?: number;
  statement: string;
  canonical_answer: string;
  accepted_answers: string[];
  solution_steps: string[];
  hint_ladder: string[];
  common_mistakes: CommonMistake[];
  accepted_approaches?: AcceptedApproach[];
  // Optional additional direct-answer forms. The core guard always checks
  // canonical_answer, so Content Leads do not need to author these by default.
  leakage_terms?: string[];
  source_type: "original" | "adapted";
  source_reference?: string;
  license_status: "clear" | "unresolved";
}

export interface EvalCase {
  case_id: string;
  problem_id: string;
  language: Language;
  review_status: "draft" | "approved";
  reviewed_by?: string;
  reviewed_at?: string;
  situation: string;
  student_attempt: string;
  conversation_history: Array<{ role: "student" | "tutor"; content: string }>;
  expected_assessment: Assessment;
  expected_mistake_id: string | null;
  allowed_actions: NextAction[];
  max_hint_level: number;
  answer_must_not_be_revealed: boolean;
  expected_behaviour?: string;
  reviewer_comment: string;
}

export interface AssertionResult {
  id: string;
  passed: boolean;
  severity: "gate" | "score";
  message: string;
}

export interface ModelRunResult {
  run_id: string;
  timestamp: string;
  model: string;
  prompt_version: string;
  case_id: string;
  repeat_index: number;
  decision: TutorDecision | null;
  raw_content: string;
  provider_name?: string;
  generation_id?: string;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  request_attempts: number;
  assertions: AssertionResult[];
  error?: string;
  infrastructure_error?: boolean;
}
