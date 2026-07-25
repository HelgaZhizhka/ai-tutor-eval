# AI Tutor Evaluation Harness

This repository evaluates candidate LLMs for Olympiad Academy's constrained Grade 5 mathematics tutor. It does **not** build the product tutor.

For a non-technical team-meeting overview, see [TEAM_README.md](TEAM_README.md).
For the shared MVP product and architecture decisions, start with the [Olympiad Academy MVP Wiki](docs/README.md).

## Purpose and reuse

This is a reusable evaluation and regression harness for the AI Tutor decision layer. It helps the team make evidence-based changes instead of relying on a model's public benchmark score or an individual chat impression.

The first use is to compare candidate models on the same teacher-approved Grade 5 scenarios and select a model for the MVP. After that, the same harness should be run again whenever a material AI behaviour changes, including:

- a change of model, model provider or provider configuration;
- a new tutor prompt version;
- a change to the structured response schema or tutor-policy rules;
- a new hint ladder, important misconception or answer-leakage rule;
- a new supported language;
- a new product scenario, such as a longer tutoring conversation.

After the first approved task set and its scenarios are tested, preserve them as `golden-v1`. Do not silently edit that baseline: create a new version when the product needs additional coverage. This makes it possible to compare a later model or prompt with the same evidence.

This harness evaluates the AI decision layer only. It does not replace UI tests, product integration tests, deterministic mathematics checks or supervised pilot testing with real learners.

## Current scope

- Main evaluation language: English.
- Russian and Uzbek (`uz-UZ`, Latin script) are added only after a human reviewer approves translations.
- The first pedagogical evaluation uses five teacher-approved items.
- All API calls are opt-in and require `OPENROUTER_API_KEY`. No real student data may be added.

## Safety rules

1. Keep all API keys in local environment variables or an ignored `.env` file.
2. Never treat a draft item or AI translation as teacher validation.
3. Preserve raw model responses locally in `results/raw/`; they are intentionally ignored by Git.
4. Before a paid batch, inspect the estimated maximum cost and use the configured safety cap.

## Why this pilot uses a custom runner

We intentionally use a small TypeScript runner rather than Promptfoo for the pilot. It gives direct control over the strict tutor JSON contract, project-specific checks such as hint limits and answer leakage, OpenRouter cost controls, upstream-provider logging and Uzbek text normalization. We can revisit Promptfoo later if the evaluation suite grows into frequent large-scale regression testing.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run eval:screening -- --dry-run
```

The last command previews the initial comparison and will refuse to run until five teacher-approved items and their matching scenarios are present.
