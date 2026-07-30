# Synthetic Uzbek Ask Why Smoke Test

## Why we run this now

Before teacher-approved Uzbek content is available, this small, local-only test checks whether candidate models can follow the basic Ask Why policy in Uzbek. It is a technical preflight, not an evaluation of Olympiad Academy content and not a model-selection decision.

It helps us catch inexpensive problems early: a model may answer in an unsuitable language, reveal a direct numeric answer, ignore a request not to reveal it, or make the API workflow unexpectedly slow or expensive.

## What it tests

The synthetic pack contains nine Grade 5-style Uzbek cases: a targeted “why” question, requests for the final answer, common misconceptions, “I do not know”, off-topic input and a rule-bypass attempt.

For each candidate model, the runner records the reply, provider, latency, token use and reported cost. It also flags a literal occurrence of the synthetic task's canonical answer while that answer is protected.

## What it does not establish

- The cases are synthetic and not approved Olympiad Academy tasks.
- No result may be used to select a production model or to claim Uzbek mathematical quality.
- The direct-answer flag does not detect indirect answers, paraphrases or early method disclosure.
- A native Uzbek mathematics reviewer is still needed for real learner-facing results.

## How to run

Use two candidates and inspect the estimate before any call:

```bash
npm run eval:ask-why-smoke -- --models openai/gpt-5.6-terra,google/gemini-3.6-flash --dry-run
```

The real run is deliberately blocked until both the local API key and an explicit confirmation are present:

```bash
EVAL_CONFIRM=YES npm run eval:ask-why-smoke -- --models openai/gpt-5.6-terra,google/gemini-3.6-flash
```

Results are stored locally under `results/synthetic-smoke/` and ignored by Git. They must not be moved into `cases/base-cases.yaml` or presented as the teacher-approved Ask Why evaluation.

For a constrained environment, the same pack can be run in small batches using `--case-limit` and `--case-offset`. The runner saves results after each response, so an interrupted batch keeps its completed local observations.

## What happens next

When 3–5 approved Uzbek tasks arrive, the team prepares 8–10 real scenarios from them and uses [Ask Why Evaluation — Phase A](ASK_WHY_EVALUATION.md). That is the point at which Content Lead review and a model-selection decision become meaningful.
