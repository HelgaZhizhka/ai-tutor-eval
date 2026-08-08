# Free Ask Why Screening Results — 2026-08-08

**Status:** operational screening complete. No model qualified at this stage;
the subsequent focused regression is recorded in the
[free Ask Why model decision](FREE_ASK_WHY_MODEL_DECISION_2026-08-08.md).

## Configuration

- six pinned zero-cost `:free` model variants;
- seven teacher-reviewed private Uzbek (Latin) Ask Why scenarios;
- one repeat per model, rotated order;
- prompt `ask-why.v4`;
- two-sentence / 300-token response limit;
- `data_collection: deny` retained for child-facing content;
- no paid fallback and no automatic retry after a 429 rate limit.

This was `6 × 7 = 42` attempted free-model requests. Raw task context,
learner messages and model replies remain in the private evaluation workspace.

## Aggregate result

| Candidate | Completed / attempted | Automated gate failures among completed replies | Operational outcome |
| --- | ---: | ---: | --- |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 0 / 7 | — | No eligible free endpoint under `data_collection: deny`. |
| `nvidia/nemotron-3-super-120b-a12b:free` | 0 / 7 | — | No eligible free endpoint under `data_collection: deny`. |
| `google/gemma-4-31b-it:free` | 0 / 7 | — | Temporarily rate-limited by its upstream shared pool. |
| `google/gemma-4-26b-a4b-it:free` | 5 / 7 | 0 | Two upstream 429 responses; completed replies had p50 6.4 s and p90 11.4 s. |
| `openai/gpt-oss-20b:free` | 0 / 7 | — | Endpoint requires reasoning and rejected the common `reasoning: none` configuration. |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 0 / 7 | — | No eligible free endpoint under `data_collection: deny`. |

The five completed Gemma 26B replies passed the mechanical checks: non-empty
output, Uzbek Latin, two-sentence limit, configured direct-answer terms and
zero reported cost. This is not enough to select it: it completed only five of
seven calls, and a manual pedagogical read found that its answer to a
rule-bypass case gave a more explicit method than the approved first-level
response.

## Decision

No candidate proceeds to the finalist regression from this run.

The main result is not a quality ranking; it is an availability finding. Under
the current privacy-preserving request policy, most current free candidates are
not operationally reachable. Disabling `data_collection: deny` merely to test
or use them would be a product/privacy decision, not a technical workaround;
it should not be done implicitly for a child-facing MVP.

## Next controlled step

Run a fresh, smaller follow-up after the free daily quota resets:

1. retry Gemma 31B only if its upstream rate limit has cleared;
2. retry Gemma 26B to measure whether the 429 rate is persistent;
3. test GPT-OSS with its explicitly recorded `minimal` reasoning setting;
4. add only a free candidate that supports the same `data_collection: deny`
   policy.

Each new run must use the same reviewed private scenarios, record its exact
configuration and remain separate from a paid-model fallback. Only candidates
that are both available and safe on the real scenarios may enter a repeated
finalist regression and blind Uzbek review.
