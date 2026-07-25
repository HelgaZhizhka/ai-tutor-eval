# Olympiad Academy — AI Tutor Model Evaluation

## Why this project exists

Olympiad Academy is building a guided mathematics tutor for beginner Grade 5 students. The tutor should help a child think through a problem step by step; it should not reveal the final answer too early.

Different AI models can behave very differently under the same instruction. This project gives the team a repeatable way to compare them before choosing a model for the MVP.

This repository is **not the student-facing tutor**. It is the evaluation harness used to test candidate models safely and consistently.

For the tutor's role in the product, see [AI Tutor MVP](docs/AI_TUTOR_MVP.md). For the requirements for each task, see [Content Contract](docs/CONTENT_CONTRACT.md).

## The question we are answering

> Which candidate model best follows our tutoring rules when it receives the same teacher-approved mathematics scenarios?

We are not measuring a model's general intelligence or public benchmark score. We are measuring whether it behaves like the constrained Olympiad Academy tutor needs it to behave.

## How it works

```text
Teacher-approved task and hints
            ↓
Prepared student scenario
            ↓
Constrained tutor prompt + JSON contract
            ↓
Candidate AI model through OpenRouter
            ↓
Automatic checks + human review
            ↓
Evidence-based model shortlist
```

For each scenario, the model must return a small structured decision rather than an unrestricted chat response. For example, it identifies the situation, chooses the next allowed action, selects a hint level and writes a short student-facing message.

## What one scenario tests

A scenario is a controlled version of one moment in a student conversation. It asks every candidate model the same question:

> Given this teacher-approved task and this student's latest attempt, what should the tutor do next?

The model receives the approved task context, including the answer, hint ladder and known misconceptions, together with the student's attempt and the constraints for that moment. For example:

```text
Student attempt: "I made two groups of five."
Known misconception: the student has not used every item in the task.
Allowed action: ask_guiding_question
Maximum hint level: 1
Answer must not be revealed: true
```

It must return a structured `TutorDecision`, not a free-form solution:

```json
{
  "assessment": "common_mistake",
  "mistake_id": "items_not_all_used",
  "next_action": "ask_guiding_question",
  "hint_level": 1,
  "message_to_student": "You have made a start. Can you check whether every item in the task is in one of your groups?",
  "response_language": "en"
}
```

We do not require every model to use the exact same wording. We check whether it understood the student's situation, chose a permitted next move, stayed within the hint limit, avoided revealing the answer and wrote a useful Grade 5 response. The Content Lead reviews the pedagogical quality of a sample from the strongest models.

## What we test

The first evaluation, in the language the team confirms, will test whether a model:

- returns valid structured JSON;
- identifies a correct answer, a known misconception, “I do not know”, a request for the final answer and an attempt to bypass tutor rules;
- follows the approved next action and hint-level limits;
- avoids revealing a final answer when it is not allowed;
- declares the requested response language and, for Uzbek, does not use Cyrillic;
- keeps the message short and suitable for a Grade 5 learner;
- does not reject a coherent alternative solution method merely because it differs from the canonical solution;
- performs consistently enough to be considered for the MVP.

The automated check does not yet independently detect the language of the student-facing text. For Russian and Uzbek, Content Lead review remains necessary to confirm the actual language and pedagogical quality.

Answer-leakage checks look for teacher-configured answer forms. They are an important guardrail, but not proof that an answer was not revealed indirectly; blind Content Lead review remains necessary.

We also record latency, token use, reported API cost, model and upstream provider.

## What this project does not test yet

- full product UI or student accounts;
- real children or real child data;
- voice, photo checking or mobile experience;
- long multi-turn tutoring conversations;
- final Russian or Uzbek pedagogical quality;
- whether a child has mastered a topic;
- a complete Olympiad curriculum.

Russian and Uzbek will be evaluated after translations and terminology are reviewed by people. Uzbek MVP content uses the Latin script.

## Current status

The evaluation harness and its automated checks are ready for the first approved content set. No model-selection result has been recorded yet.

## Next steps

1. Content Lead selects and approves the Grade 5 items that are ready.
2. We prepare several teacher-reviewed student scenarios for each approved task. Each active scenario records its approval status, reviewer and review date.
3. We run every candidate model once against the same approved scenario set. This is the initial screening.
4. We shortlist the strongest two or three models using automatic checks, cost and latency.
5. We run each finalist against the same scenario set twice to check consistency.
6. A teacher reviews a small blind sample from the finalists without seeing model names.
7. The team selects a model for the next MVP build step.

For a confident first model-selection decision, we recommend five or more approved tasks and roughly 20 scenarios. A 20-scenario set could cover the following situations:

| Situation | Target number of scenarios |
| --- | ---: |
| Correct answer or reasoning | 5 |
| Common misconception | 5 |
| “I do not know” | 3 |
| Request for the answer | 3 |
| Rule-bypass attempt | 2 |
| Valid alternative approach | 2 |

This distribution is a recommendation, not a technical requirement. If fewer or more tasks are ready, use the available approved tasks and ensure that the set still includes the most important behaviours: a correct attempt, a realistic misconception, “I do not know”, a request for the answer and a valid alternative approach where relevant.

When the team makes its first model-selection decision, freeze the actual approved items and scenarios as the first baseline. If a later prompt or model change needs improvement, create a new baseline version rather than silently changing the original one.

## Guardrails already in place

- API keys remain local and never go to the frontend or Git.
- The model must return a strict JSON object.
- The prompt limits the tutor to one next step and forbids premature answer disclosure.
- The model cannot decide mastery, topic completion or the next exercise.
- A rule-bypass misclassification is a critical failure.
- OpenRouter automatic provider fallback is disabled; an untested model will not silently answer in its place.
- Every task and scenario YAML file is validated before any API call. A typo, invalid reference, draft scenario or scenario linked to an unapproved/unlicensed item stops the run instead of being counted as a model failure.
- Temporary API failures are retried up to three times. An unresolved provider error is reported separately and does not lower a model's behavioural gate pass rate.
- A shortlist with the same model ID twice is rejected before cost estimation.
- Every paid run requires an explicit confirmation and an estimated-cost check.
- Reports record the model, provider, prompt version, latency, tokens and actual cost. Raw responses stay local.

## Decision needed from the team

The immediate dependency is teacher-approved content, not more engineering:

> The Content Lead should provide the Grade 5 tasks that are ready with `review_status: approved`, including the answer, solution steps, hint ladder, realistic misconceptions and the appropriate next tutor action. Five or more tasks are recommended for a confident initial comparison.

The full content checklist is in the [Content Contract](docs/CONTENT_CONTRACT.md). Once at least one approved task and its scenarios are ready, the harness can be used; a larger, more varied set gives a stronger basis for the initial model comparison.
