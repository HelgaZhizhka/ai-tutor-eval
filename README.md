# AI Tutor Evaluation Harness

This repository evaluates candidate LLMs for Olympiad Academy's constrained Grade 5 mathematics tutor. It does **not** build the product tutor.

For a non-technical team-meeting overview, see [TEAM_README.md](TEAM_README.md).
For the shared MVP product and architecture decisions, start with the [Olympiad Academy MVP Wiki](docs/README.md).

## Purpose and reuse

This is a reusable evaluation and regression harness for the AI Tutor decision layer. It helps the team make evidence-based changes instead of relying on a model's public benchmark score or an individual chat impression.

The immediate prepared use is to compare candidate models for the optional Ask Why feature on the same teacher-approved Uzbek scenarios. The retained active-tutor harness can later be used whenever a material AI behaviour changes, including:

- a change of model, model provider or provider configuration;
- a new tutor prompt version;
- a change to the structured response schema or tutor-policy rules;
- a new hint ladder, important misconception or answer-leakage rule;
- a new supported language;
- a new product scenario, such as a longer tutoring conversation.

After the first approved task set and its scenarios are tested, preserve them as `golden-v1`. Do not silently edit that baseline: create a new version when the product needs additional coverage. This makes it possible to compare a later model or prompt with the same evidence.

This harness evaluates the AI decision layer only. It does not replace UI tests, product integration tests, deterministic mathematics checks or supervised pilot testing with real learners.

## Current scope

- The current one-month MVP uses a teacher-approved, rule-based core hint flow. A live LLM is optional P1 functionality for the anchored **Ask Why** feature, not a requirement for the August 8 internal demo.
- Uzbek (Latin script) is the proposed learner-facing MVP language. The architecture should remain localisation-ready, but Russian and English content must be independently reviewed before it is shown to learners.
- [Ask Why Evaluation — Phase A](docs/ASK_WHY_EVALUATION.md) contains the prepared scenario plan. It will use approved Uzbek items when they are ready.
- The existing `TutorDecision` runner is retained for a possible future active-tutor mode, where a model evaluates an attempt and selects a next tutoring move. It is not a blocker for the current rule-based hint flow.
- All API calls are opt-in and require `OPENROUTER_API_KEY`. No real student data may be added.

## Safety rules

1. Keep all API keys in local environment variables or an ignored `.env` file.
2. Never treat a draft item or AI translation as teacher validation.
3. Validate every task and scenario YAML file before any API call; unknown fields, misspelled actions, invalid references and an active case linked to a draft or unlicensed item stop the run.
4. Preserve raw model responses locally in `results/raw/`; they are intentionally ignored by Git.
5. Before a paid batch, inspect the cost estimate and use the configured local estimate guard. The estimate assumes 2,000 input tokens and the same 1,200-token output limit sent to each model; it is not a provider-side spending cap.
6. Retry only temporary API failures. A request that still fails is reported as an infrastructure error, not as evidence that the model failed the tutoring task.

## Why this pilot uses a custom runner

We intentionally use a small TypeScript runner rather than Promptfoo for the pilot. It gives direct control over the strict tutor JSON contract, project-specific checks such as hint limits and answer leakage, OpenRouter cost controls, upstream-provider logging and Uzbek text normalization. We can revisit Promptfoo later if the evaluation suite grows into frequent large-scale regression testing.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run eval:screening -- --dry-run
```

The last command previews the initial comparison and will refuse to run until at least one teacher-approved item and its matching, teacher-reviewed scenario are present.
