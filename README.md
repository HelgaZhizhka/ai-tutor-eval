# Olympiad Academy — AI Model Evaluation

This repository helps Olympiad Academy test AI models before using them in a learner-facing feature. It is an **evaluation project**, not the student application.

We test models only on teacher-reviewed mathematics tasks and learner scenarios. The goal is not to find the “smartest” model in general, but to check whether a model is safe, useful and clear for a Grade 5 learner in Uzbek Latin.

## One learner-facing assistant, two separate evaluations

| Evaluation | What the AI does | Status |
| --- | --- | --- |
| **Ask Why** | After a learner completes a task or sees the full walkthrough, the learner may ask a short question about that task. | Provisional free primary: Gemma 4 26B through OpenRouter. Server-side validation and a retry message remain required. |
| **Ask Tutor** | During an active attempt and before Full Walkthrough, the AI may give one small next step without solving the task. Its exact entry point will be decided before implementation. | Not evaluated yet. This is a separate future test. |

The learner should see one consistent AI assistant. Internally, Ask Why and Ask
Tutor remain separate capabilities: they appear at different moments, receive
different context and require different safety rules and test scenarios.

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

## Ask Why: previous baseline and current free-model work

The previous paid Demo Day decision and its tested models are documented in [Ask Why Model Decision — 2026-08-03](docs/ASK_WHY_MODEL_DECISION_2026-08-03.md). It is evidence from a prior configuration, not a free-model MVP decision.

The zero-cost comparison is in [Free-model Ask Why evaluation plan](docs/FREE_MODEL_ASK_WHY_EVALUATION_PLAN.md). It pins free `:free` candidates, uses the same private reviewed content, and records availability as well as response quality.

The first operational screening is documented in [Free Ask Why screening results — 2026-08-08](docs/FREE_ASK_WHY_SCREENING_RESULTS_2026-08-08.md). No free-model finalist was selected from that run.

The subsequent focused regression selected [Gemma 4 26B as the provisional free Ask Why primary](docs/FREE_ASK_WHY_MODEL_DECISION_2026-08-08.md). The earlier paid Terra decision remains historical evidence, not the current MVP configuration.

Private task texts, scenarios, raw model answers and reviewer notes are deliberately kept outside this public repository.

## Documentation

- [Ask Why evaluation method](docs/ASK_WHY_EVALUATION.md)
- [Free-model Ask Why evaluation plan](docs/FREE_MODEL_ASK_WHY_EVALUATION_PLAN.md)
- [Free Ask Why screening results — 2026-08-08](docs/FREE_ASK_WHY_SCREENING_RESULTS_2026-08-08.md)
- [Free Ask Why model decision — 2026-08-08](docs/FREE_ASK_WHY_MODEL_DECISION_2026-08-08.md)
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
