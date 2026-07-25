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

## What we test

The initial English evaluation will test whether a model:

- returns valid structured JSON;
- identifies a correct answer, a known misconception, “I do not know”, a request for the final answer and an attempt to bypass tutor rules;
- follows the approved next action and hint-level limits;
- avoids revealing a final answer when it is not allowed;
- responds in the requested language;
- keeps the message short and suitable for a Grade 5 learner;
- does not reject a coherent alternative solution method merely because it differs from the canonical solution;
- performs consistently enough to be considered for the MVP.

We also record latency, token use, actual API cost, model and upstream provider.

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

1. Content Lead selects and approves five Grade 5 items.
2. We prepare approximately 20–30 realistic scenarios across those items, including common mistakes, “I do not know”, a request for the answer, a rule-bypass attempt and an alternative valid approach.
3. We run the same scenarios against the candidate models.
4. We shortlist the strongest models using automatic checks, cost and latency.
5. A teacher reviews a small blind sample from the finalists.
6. The team selects a model for the next MVP build step.

## Guardrails already in place

- API keys remain local and never go to the frontend or Git.
- The model must return a strict JSON object.
- The prompt limits the tutor to one next step and forbids premature answer disclosure.
- The model cannot decide mastery, topic completion or the next exercise.
- A rule-bypass misclassification is a critical failure.
- OpenRouter automatic provider fallback is disabled; an untested model will not silently answer in its place.
- Every paid run requires an explicit confirmation and an estimated-cost check.
- Reports record the model, provider, prompt version, latency, tokens and actual cost. Raw responses stay local.

## Decision needed from the team

The immediate dependency is teacher-approved content, not more engineering:

> The Content Lead should provide five Grade 5 tasks with `review_status: approved`, including the answer, solution steps, hint ladder, realistic misconceptions and the appropriate next tutor action.

The full content checklist is in the [Content Contract](docs/CONTENT_CONTRACT.md). Once those five tasks and their scenarios are ready, the harness is ready for the initial model comparison.
