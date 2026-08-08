# Free Ask Why Model Decision — 2026-08-08

**Decision:** use `google/gemma-4-26b-a4b-it:free` through OpenRouter as the
**provisional free primary** for the Uzbek Ask Why MVP.

This is a narrow, reversible choice for the current prompt, free endpoint and
low-volume feature. It does not claim that Gemma is the best model in general,
that free endpoints have production-grade uptime, or that the product has
already proved learning outcomes.

## Exact configuration

| Setting | Value |
| --- | --- |
| Model | `google/gemma-4-26b-a4b-it:free` |
| Prompt | `ask-why.v4` |
| Language | Uzbek, Latin script |
| Response limit | 300 tokens; at most two sentences after server-side validation |
| Reasoning | `none` |
| Provider policy | `data_collection: deny`; no paid fallback |
| Timeout | 30 seconds |
| Failure behaviour | neutral retry message; do not show unchecked output |

## Evidence

The candidate was evaluated on the private teacher-reviewed Uzbek Grade 5 Ask
Why scenarios. Raw model replies remain private.

| Stage | Result |
| --- | --- |
| Seven-scenario screening | 5/7 completed; two temporary upstream 429 rate limits; completed replies passed automatic gates. |
| Four high-risk scenarios × three repeats | 12/12 completed; no direct-answer leakage, Cyrillic, empty-output or non-zero-cost failures. |
| Length gate after decimal-aware reassessment | 1/12 replies had three sentences; the other apparent decimal-related failure was a checker bug, not model behaviour. |
| Final latency | p50 9.1 s; p90 20.5 s. |

The decision is relative to the other tested free candidates:

- Gemma 31B completed 0/12 high-risk calls because the free upstream pool was
  rate-limited.
- GPT-OSS completed 12/12 after its required `minimal` reasoning configuration,
  but exceeded the two-sentence limit in 6/12 replies and showed weaker Uzbek
  terminology in private review.
- NVIDIA free variants had no compatible endpoint under the retained
  `data_collection: deny` policy.

## Required product guardrails

1. Call the exact `:free` model from the server only.
2. Keep the API key, canonical answer and non-visible support server-side.
3. Validate the raw reply before showing it: non-empty, Uzbek Latin, maximum
   two sentences and any agreed answer-leakage rule.
4. If the model times out, is rate-limited or fails validation, show a short
   retry message. Do not silently call a paid model.
5. Record latency, provider, response validation result and failure reason.

The one over-length response in the regression would be safely caught by this
flow. It is a product quality event to monitor, not a reason to expose the
unchecked reply to a learner.

## Re-evaluation trigger

Repeat the same high-risk regression if the model ID, provider policy, prompt,
language, response limit or server-side validation changes. Reconsider the
selection if rate-limit errors become frequent in the actual pilot or if an
approved privacy-compatible free candidate demonstrably performs better.
