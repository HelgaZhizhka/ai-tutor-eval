# Free-model Ask Why Evaluation Plan

**Status:** planned — no free-model API calls have been made from this plan yet.
**Scope:** Ask Why only. It does not select a model for the separate future Ask Tutor capability.

## Why this run exists

The earlier Ask Why comparison selected a paid OpenRouter configuration for the
Demo Day build. The MVP now has a zero-inference-budget constraint, so that
result cannot be treated as the production selection. This run compares pinned
zero-cost OpenRouter variants on the same kind of teacher-reviewed Uzbek
(Latin) Ask Why scenarios.

The goal is a small, reversible decision: identify the most reliable free
configuration for a low-volume MVP, or establish that none of the current free
options is safe enough to use learner-facing.

## Pinned screening shortlist

This is a snapshot taken on **2026-08-08**. The runner queries OpenRouter's
catalogue before every run and stops if an ID is unavailable or its prompt or
completion price is no longer zero.

1. `nvidia/nemotron-3-ultra-550b-a55b:free`
2. `nvidia/nemotron-3-super-120b-a12b:free`
3. `google/gemma-4-31b-it:free`
4. `google/gemma-4-26b-a4b-it:free`
5. `openai/gpt-oss-20b:free`
6. `nvidia/nemotron-3-nano-30b-a3b:free`

Do **not** use `openrouter/free` for this comparison or as the selected MVP
model. It randomly routes each request across the changing free pool, so the
model and result cannot be reproduced.

## Frozen evaluation inputs

- Existing private, teacher-reviewed Uzbek (Latin) Ask Why scenarios;
- `ask-why.v4` prompt, with English policy instructions and Uzbek examples;
- approved, licence-clear Grade 5 task data stored outside this public repo;
- a maximum of two response sentences and 300 output tokens.

No task text, learner messages, raw answers, reviewer notes or API key belong
in Git.

## Stage 1 — screening

Use seven private scenarios, one for each situation:

1. targeted “why” question;
2. request for the final answer;
3. known misconception;
4. “I do not understand”;
5. valid alternative approach;
6. off-topic question;
7. rule-bypass attempt.

Run each scenario once against all six candidates, in a rotated model order:

```text
6 models × 7 scenarios × 1 repeat = 42 requests
```

The run leaves room below the 50-request daily allowance of an OpenRouter
account without purchased credits. It waits at least 3.2 seconds between starts
and records a 429 rate-limit response instead of retrying it automatically.

Eliminate a candidate for a critical gate failure or repeated inability to
serve a response. Keep at most three finalists.

## Stage 2 — finalist regression

On a separate day, run the two or three finalists on four high-risk scenarios:

- request for the answer;
- rule-bypass attempt;
- misconception;
- off-topic request.

Each is repeated three times in rotated order:

```text
3 models × 4 scenarios × 3 repeats = 36 requests
```

For two finalists this is 24 requests. Record p50 and p90 latency only from
this repeated stage; a one-call screening result is not a stable latency claim.

## Automated gates and decision rule

For every response the runner records:

- request completion, provider and latency;
- non-empty output;
- Uzbek Latin output without Cyrillic;
- two-sentence limit;
- configured direct-answer leakage terms;
- reported request cost of zero.

The direct answer, language, response-limit and infrastructure gates are hard
gates. A model does not compensate for one of these failures by being faster.
Among candidates that pass, the ranking is: human-reviewed Uzbek/pedagogical
quality, availability, p90 latency, then operational simplicity. All candidates
must have zero reported inference cost.

A native Uzbek reviewer should blind-review the finalist answers for language,
mathematical correctness, Grade 5 clarity and safe relevance. Without that
review, the team may make only a technical availability decision, not a claim
that the Uzbek learner-facing quality is acceptable.

## Running the local harness

All real content and outputs stay in private local folders. Set the following
in a local `.env` file or shell — never commit them:

```bash
EVAL_ITEMS_ROOT=/absolute/path/to/private/items
EVAL_CASES_PATH=/absolute/path/to/private/ask-why-cases.yaml
EVAL_FREE_ASK_WHY_RESULTS_ROOT=/absolute/path/to/private/free-ask-why-results

FREE_ASK_WHY_SCREENING_CASE_IDS=case-1,case-2,case-3,case-4,case-5,case-6,case-7
FREE_ASK_WHY_FINAL_CASE_IDS=case-a,case-b,case-c,case-d
FREE_ASK_WHY_FINALIST_MODELS=model-a:free,model-b:free,model-c:free
```

First inspect the live model catalogue and planned request count without API
calls:

```bash
npm run eval:free-ask-why -- screening --dry-run
```

Then make the deliberate free-model call:

```bash
EVAL_CONFIRM_FREE=YES npm run eval:free-ask-why -- screening
```

After finalists are selected, run the second stage on another day:

```bash
EVAL_CONFIRM_FREE=YES npm run eval:free-ask-why -- finalists
```

The harness will stop before requests if a selected model is no longer a zero
cost `:free` variant, the scenario set is not fully reviewed, or the proposed
batch exceeds 50 requests. It never routes to a paid model on purpose. A
rate-limit, timeout or invalid answer is recorded as a failed run, not silently
replaced with another model.

## MVP operational constraint

Free variants are appropriate only for a low-volume demo or pilot. Availability
and rate limits are part of their observed quality. The product must keep a
neutral retry message when the selected model is unavailable or the server-side
validation rejects its response; it must not expose an unchecked response or
silently switch to a paid provider.
