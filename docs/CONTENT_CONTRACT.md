# Content Contract for AI Features and Model Evaluation

## Purpose

This document defines which teacher-reviewed content is needed for the current learning flow and which additional information is needed before an AI model is evaluated. It does not replace the private task bank.

## Current confirmed content boundary

For the Grade 5 Uzbek (Latin) MVP, the task bank is the source of truth for
learner-facing mathematics. Each task used in the flow has reviewed task
wording, Hint 1, Hint 2, Hint 3, a static Full Walkthrough and accepted answer
forms.

The public repository does not contain the task texts or learner scenarios. The technical team records item-level status in the private content workspace.

### Core task fields

| Field | Current use |
| --- | --- |
| Stable task ID | Links task, attempt and private evaluation scenarios. |
| Uzbek language and locale | Selects the reviewed learner-facing wording and Latin script. |
| Review status | Prevents unreviewed content entering a learner flow or paid evaluation. |
| Statement | Shown to the learner and, when required, sent to the AI as current task context. |
| Hint 1, Hint 2 and Hint 3 | Static teacher-approved support during an active attempt. A future Ask Tutor may receive only hints already shown to the learner. |
| Static Full Walkthrough | Shown after the three hints when the learner remains stuck. It is never sent to Ask Tutor. |
| Accepted answers and answer type | Used by the answer verifier and product logic; never sent to Ask Tutor. |
| Source and licence status | Confirms that the project may use the task. |

Grade, topic, skills, prerequisite skills and difficulty remain useful bank metadata for reporting and future adaptive routes. They are not required for a single Ask Tutor call.

## Mapping for the current flow

    hint_ladder[0] → Hint 1
    hint_ladder[1] → Hint 2
    hint_ladder[2] → Hint 3
    solution_steps  → Full Walkthrough

Ask Why is the only AI capability in the current Demo Day flow. It may use the
approved Full Walkthrough as protected server-side context after a correct
answer, and the visible walkthrough after it has been opened. Future Ask Tutor
must not receive the Full Walkthrough or any unrevealed hint.

## Additional information for AI evaluation

The following fields are useful only when a selected task enters an AI evaluation. They do not need to be newly authored for every task before the static learning flow can work.

| Field | When it is needed |
| --- | --- |
| Private learner scenario | For a specific Ask Why or Ask Tutor test case. |
| Expected tutor behaviour | Reviewed expectation for that scenario; it is not an exact model response. |
| Common misconception | Optional. Add when it represents a likely, well-understood wrong turn that the AI should handle. |
| Accepted alternative approach | Optional. Add when a task has a likely alternative method that the AI should not incorrectly reject. |
| Response guidance | Optional support for a known misconception or accepted approach. It is only sent to the AI if Product and Content Lead mark it safe. |

The Content Lead does not need to enumerate every valid solution or create a separate answer-leakage glossary. The direct-answer check starts from the existing canonical answer. Add other protected forms only if real model behaviour shows they are needed.

## Active evaluation scenarios

The private active case file used by the structured Ask Tutor runner contains only reviewed scenarios. Each scenario must have:

- review status: approved;
- reviewer name and review date;
- a link to an approved, licence-clear task;
- permitted actions, maximum hint level and expected behaviour.

The runner stops before API calls if an active scenario does not meet these requirements. Draft cases may be prepared elsewhere, but do not belong in the active paid evaluation set.

For Ask Why, use its own private reviewed scenario set and the process in [Ask Why Evaluation](ASK_WHY_EVALUATION.md). For Ask Tutor, use [the base scenario template](../cases/base-cases.template.yaml) and [Ask Tutor Evaluation](ASK_TUTOR_EVALUATION.md).

## Content Lead involvement

For a selected task or scenario, Content Lead confirms:

1. learner-facing wording and Grade 5 suitability;
2. accepted answer forms and the static Hint 1, Hint 2, Hint 3 and Full Walkthrough;
3. expected safe behaviour for any scenario that will be used in an AI test;
4. any important misconception or alternative approach that is deliberately included in that test;
5. Uzbek Latin learner-facing wording.

The technical team maintains IDs, YAML transfer, status fields, scenario wiring and validation. Content Lead does not need to edit YAML or Git.

## Language rule

The current learner-facing MVP language is Uzbek in Latin script. Every future learner-facing language version needs its own human review; a model-generated translation is not an approval.
