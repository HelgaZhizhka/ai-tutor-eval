# Synthetic Uzbek Ask Why Smoke Test Report — 2026-07-30

## Status

**Technical preflight only. This is not a teacher-approved content evaluation and not a production model-selection decision.**

## Purpose

Before approved Uzbek tasks are available, this test checks whether the Ask Why API workflow can call candidate models, retain protected context server-side, collect latency/cost, and detect a literal disclosure of a task's canonical answer.

## Scope and limitations

- 9 synthetic Grade 5-style Uzbek scenarios.
- Scenarios cover targeted explanation, an answer request, a common misconception, “I do not know”, off-topic input and a rule-bypass attempt.
- No real student data or teacher-approved Olympiad Academy task content was used.
- The direct-answer check only looks for a literal occurrence of a protected canonical answer. It cannot prove that a model avoided an indirect answer or an early solution method.
- Uzbek language quality, mathematical correctness and age appropriateness still require review by a native Uzbek mathematics Content Lead on approved tasks.

## Expanded initial screen

The test began with two initial candidates, then added one Anthropic model and four current Chinese candidates. The row counts are intentionally not all equal: a slow candidate was stopped after enough evidence showed that it was not viable for an interactive MVP under this exact OpenRouter configuration. These are **operational screening observations**, not a fair quality ranking.

| Candidate | Recorded scenarios | Direct-answer flags | Output-length stops | Median latency | Recorded cost | Initial operational observation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| GPT-5.6 Terra | 9 | 0 | 0 | ~2.0 sec | ~$0.0095 | Passed this synthetic technical screen. |
| Gemini 3.6 Flash | 9 | 0 | 4 | ~3.4 sec | ~$0.0372 | Needs configuration investigation: four incomplete replies. |
| Claude Sonnet 5 | 9 | 0 | 0 | ~6.5 sec | ~$0.0175 | Completed the technical screen; slower than Terra. |
| DeepSeek V4 Flash | 6 | 0 | 0 | ~14.6 sec | ~$0.0009 | Stopped early: too slow for an interactive Ask Why call in this route/configuration. |
| DeepSeek V4 Pro | 3 | 0 | 0 | ~10.6 sec | ~$0.0017 | Stopped early: too slow for this interactive screen. |
| Qwen 3.7 Plus | 1 | 0 | 0 | ~26.8 sec | ~$0.0018 | Stopped after the first response: interactive latency was not viable. |
| Kimi K3 | 3 | 0 | 0 | ~7.5 sec | ~$0.0140 | Completed the basic policy screen, but is slower than Terra and briefly discussed football in the off-topic case. |

## What we learned

- The evaluation runner, provider logging, cost collection and local result persistence work.
- Terra completed all nine synthetic scenarios without API or output-length failures.
- Claude also completed all nine, with higher latency.
- Gemini had four incomplete replies under this configuration; this needs investigation before a fair comparison.
- The tested DeepSeek and Qwen routes were too slow for a live child-facing interaction in the current OpenRouter configuration.
- OpenRouter may select different upstream providers for one model ID. A later product decision must therefore evaluate the selected **model + provider + configuration**, not a model name alone.

## Current consequence

For the later teacher-approved Uzbek evaluation, keep **Terra, Claude Sonnet 5 and Kimi K3** as provisional candidates. Revisit Gemini only after investigating its output-length configuration. Do not spend further evaluation effort on the tested DeepSeek and Qwen routes unless the team deliberately changes provider or reasoning configuration.

## What this does not decide

This result does not choose a production model and does not establish Uzbek language quality or pedagogical safety. When 3–5 approved Uzbek tasks are ready, run the separate [Ask Why Evaluation](ASK_WHY_EVALUATION.md) with Content Lead review.

Raw API responses remain local and ignored by Git. The reusable method is described in [Synthetic Uzbek Ask Why Smoke Test](SYNTHETIC_UZBEK_SMOKE_TEST.md).
