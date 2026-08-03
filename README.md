# Olympiad Academy — AI Model Evaluation

This repository helps Olympiad Academy test AI models before using them in a learner-facing feature. It is an **evaluation project**, not the student application.

We test models only on teacher-reviewed mathematics tasks and learner scenarios. The goal is not to find the “smartest” model in general, but to check whether a model is safe, useful and clear for a Grade 5 learner in Uzbek Latin.

## Two separate evaluations

| Evaluation | What the AI does | Status |
| --- | --- | --- |
| **Ask Why** | After a learner completes a task or sees the full walkthrough, the learner may ask a short question about that task. | Completed for Demo Day. GPT-5.6 Terra is the selected automatic model; failures show a neutral retry message. |
| **Ask Tutor** | During an active attempt, after Hint 1 and Hint 2, the AI gives one small next step without solving the task. | Not evaluated yet. This is a separate future test. |

The two modes must not be mixed: they appear at different moments in the learning flow and require different test scenarios.

## How evaluation works

```text
Teacher-reviewed task + learner scenario
                ↓
Same prompt and scenario for each candidate model
                ↓
Automatic safety checks + blind Content Lead review
                ↓
Evidence-based model decision
```

We check that a model does not reveal a protected answer, follows the required language and response limits, responds appropriately to common learner situations, and is clear for Grade 5.

## Current result: Ask Why

The Demo Day decision and the tested models are documented in [Ask Why Model Decision — 2026-08-03](docs/ASK_WHY_MODEL_DECISION_2026-08-03.md).

Private task texts, scenarios, raw model answers and reviewer notes are deliberately kept outside this public repository.

## Documentation

- [Ask Why evaluation method](docs/ASK_WHY_EVALUATION.md)
- [Ask Why MVP implementation plan](docs/ASK_WHY_MVP_IMPLEMENTATION_PLAN.md)
- [Ask Tutor evaluation plan](docs/ASK_TUTOR_EVALUATION.md)
- [Content requirements for an evaluation](docs/CONTENT_CONTRACT.md)

## Local checks

```bash
npm install
npm run typecheck
npm test
```

API runs require a local `OPENROUTER_API_KEY` and private content paths. See [.env.example](.env.example). Do not commit keys, real learner data or raw model responses.
