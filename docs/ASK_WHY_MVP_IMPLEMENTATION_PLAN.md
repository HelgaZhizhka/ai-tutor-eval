# Ask Why — MVP Implementation Plan

**Status:** proposed implementation plan for team confirmation
**First learner-facing language:** Uzbek, Latin script
**Model decision source:** [Ask Why Model Decision — 2026-08-03](ASK_WHY_MODEL_DECISION_2026-08-03.md)

## Purpose

Ask Why is a short, task-anchored AI explanation feature. It is available only
after a learner submits a correct answer or opens the static Full Walkthrough.
After a correct answer, it answers a short follow-up about why the learner's
approach or answer works without automatically showing the full solution.
After Full Walkthrough, it answers a short question about the explanation
already visible on screen.

It is not a general chat, answer checker, adaptive engine, or replacement for
teacher-approved hints. It is separate from the future Ask Tutor mode, which
would work during an active attempt and needs its own evaluation.

## MVP decisions

| Decision | MVP choice |
| --- | --- |
| Learner language | Uzbek, Latin script |
| Availability | After a correct answer or after Full Walkthrough is opened |
| During an active attempt before Full Walkthrough | Not available |
| Interaction | One short Ask Why question per attempt, available after correct answer or Full Walkthrough |
| Conversation model | Stateless in V1: one question receives one reply; no chat history |
| Automatic user-facing model call | GPT-5.6 Terra through OpenRouter |
| Failure behaviour | Neutral retry message; do not automatically make a second model call |
| Response style | Short, child-friendly, task-anchored |
| Core learning support | Teacher-approved Hint 1, Hint 2, Hint 3 and Full Walkthrough |
| Model selection | Does not select next tasks, difficulty or answer correctness |

Claude Sonnet 5 remains an evaluated reserve candidate. The recommended Demo
Day configuration is not to call it automatically after a Terra timeout or a
failed validation: the combined wait would likely exceed the intended short
response time. A later direct-backend latency check can support a deliberate
fallback decision.

## Learner flow

```text
Task → correct answer → confirmation → Ask Why becomes available

Task → Hint 1 → Hint 2 → Hint 3 → Full Walkthrough opened → Ask Why becomes available
```

Ask Why answers only about the current task. An off-topic request is redirected
briefly back to that task.

## Included and excluded scope

### Included

- Ask Why entry point after correct answer and after Full Walkthrough;
- one task-anchored learner question input after correct answer and after Full Walkthrough;
- short Uzbek Latin reply;
- server-side Terra call, validation and neutral retry state;
- loading, error and basic technical monitoring states;
- final integration regression on approved private tasks.

### Out of scope

- Ask Why during an active attempt before task completion;
- Ask Tutor;
- voice, photo input or general-purpose chat;
- AI-generated tasks, hints or walkthroughs;
- AI answer checking, mastery decisions or next-task selection;
- other learner-facing languages for this MVP.
- multi-turn conversation history or a persistent Ask Why chat transcript.

## Content mapping

The shared contract represents a problem as three ordered `hints` plus an
`explanation`. For the current approved bank, the learner-facing mapping is:

| Contract field | Current learning content |
| --- | --- |
| Hint tier 1 | Teacher-approved Hint 1 / Nudge |
| Hint tier 2 | Teacher-approved Hint 2 / Partial method |
| Hint tier 3 | Teacher-approved Hint 3 |
| `explanation` | Learner-facing Full Walkthrough, rendered from the approved ordered `solution_steps` after all three hints are used |

The third tier is a genuine third hint. The Full Walkthrough is separate,
stored in `explanation` and rendered from the approved `solution_steps`. This
mapping uses the existing reviewed content without requiring a separate new
authoring field.

## Backend contract

`POST /attempts/:attemptId/ask-why`

V1 request:

```json
{
  "question": "Why do we need a common denominator?"
}
```

V1 successful response:

```json
{
  "ai_response": "..."
}
```

This is the shared application contract fixed in
[OLY-8](https://github.com/olympiad-academy/olympiad-academy-app/pull/1).
It does not expose a remaining-question counter or typed Ask Why error codes.
The frontend therefore does not show a numeric quota in V1 and maps a failed
request to one concise, localised retry or unavailable state using the
application's standard error handling.

The client sends only the learner question and the attempt ID in the path. It
never sends a model ID, system prompt, task text, answer, walkthrough, access
state or API key. V1 has no conversation history.

The backend must:

1. Verify authentication and ownership of the attempt.
2. Check that the answer is correct or that Full Walkthrough is opened.
3. Load only the current approved task and learner question. After a correct answer, use the approved Full Walkthrough as protected server-side context; after Full Walkthrough, use the explanation already visible to the learner.
4. Build the versioned prompt on the server and call Terra through OpenRouter.
5. Validate the reply before returning it.
6. Return the application's neutral retry state for timeout, API error or invalid reply; do not show the raw failed output.
7. Enforce a maximum of one successful Ask Why reply per attempt on the server. The UI need not display the numerical count in V1.
8. Record the agreed operational event data.

## Prompt and validation requirements

The server-side policy requires Uzbek Latin output, one or two short sentences,
at most one question, and a response about the current task. After a correct
answer, it explains only the reasoning asked about and does not proactively
reproduce the Full Walkthrough. After Full Walkthrough, it explains the
reasoning in the displayed solution.
It must redirect rule-bypass and off-topic messages without continuing those
requests. Uzbek learner input may use Latin or Cyrillic, but learner-facing
output must use Uzbek Latin. Task and learner text are data, not instructions
that can change the policy.

At minimum, validate before display:

- non-empty output;
- Uzbek Latin rather than Cyrillic;
- configured sentence and length limit;
- no more than one question in the reply;
- response did not end because of the output-token limit;
- successful model/API response.

If validation fails, never show the raw output. Show a short neutral retry
message instead.

A canonical-answer leakage gate is not required for this V1 because Ask Why is
available only after the learner has answered correctly or viewed Full
Walkthrough. A separate leakage gate is required for any future in-attempt
Ask Tutor mode.

## Frontend requirements

- Ask Why button in both agreed states: the correct-answer confirmation and
  Full Walkthrough;
- short question input and send button in the current eligible state;
- loading state and disabled duplicate send while a request is active;
- concise response view;
- retry state that preserves the learner's task state;
- localised retry, unavailable and limit-reached states using the application's
  standard API error handling;
- unavailable state before completion;
- localisation-ready text keys.

The retry control is a new explicit Terra request initiated by the learner. It
is not an automatic call to a second model. V1 does not present a persistent
chat history; a learner can send a new, independent question about the same
task only if the one-question allowance has not already been used.

The browser bundle and client requests must not contain an API key, hidden task
content, prompt, or a client-controlled access flag.

## Initial limits

| Item | Proposed initial value |
| --- | ---: |
| Learner question length | 2,000 characters |
| Concurrent request per attempt | 1 |
| Ask Why replies shown per attempt | 1 |
| Output-token limit per reply | 120 |
| AI request timeout | 4 seconds |

The backend team should set the per-user rate limit and monthly cost guard.

## Logging and technical telemetry

The shared contract includes an internal `AskWhyLog` record with the attempt,
learner question, AI response and creation time. It is not exposed to the
learner as chat history. Before a real child pilot, the team must separately
confirm who can access these records and how long they are retained.

In addition, record the following operational events. Never log API keys or
duplicate raw learner messages in error logs:

- Ask Why became available after correct answer or Full Walkthrough;
- request started, completed or failed;
- selected model/provider, latency, output tokens and API cost;
- whether the reply was shown to the learner;
- validation failure or retry reason: `timeout`, `api_error`, `empty_reply`,
  `cyrillic_detected`, `length_limit` or `output_truncated`;
- `off_topic_redirect`, `rule_bypass_redirect` or `limit_reached` where detected;
- number of exchanges per completed task.

## Definition of done

1. Ask Why is unavailable before either eligible state and available after a correct answer and after Full Walkthrough, until the one-question allowance is used.
2. The backend, not the frontend, determines eligibility and loads only approved, state-aware context for the current task; it never trusts client-supplied task or access data.
3. Terra is the only automatic call. A failed call or invalid reply shows the neutral retry message; a learner may manually retry Terra.
4. Invalid raw model output never reaches the learner.
5. UI covers loading, temporary failure and retry without losing task progress.
6. API keys, prompts and hidden task data do not reach the client.
7. Technical events record shown replies, retry reasons, latency, usage and cost.
8. The UI handles temporary failure, unavailability and the server-side limit through localised text keys.
9. If `AskWhyLog` is enabled, it is internal operational data, never a learner-visible persistent chat history.
10. A focused integration regression passes on the actual backend path before the demo build is enabled.

## Pre-release regression

Run Terra with the final implementation prompt and actual backend path on a
small private set covering both entry states, a normal “why” question about the
reasoning after a correct answer, a normal “why” question about the displayed
explanation, a misconception, “I do not understand”, off-topic input, rule
bypass, Uzbek Cyrillic input with Uzbek Latin output, and an attempt to ask a
second question after the allowance is used. Test each case two or three times. Check
that the reply contains no more than one question. Also simulate timeout,
provider failure and invalid output to confirm the neutral retry state, and
record p50, p90 and maximum end-to-end latency on the actual backend path.

Any material change to model, provider, prompt, language, output limit or
safety rules requires a focused repeat of this regression before release.
