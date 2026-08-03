# Ask Why — MVP Implementation Plan

**Status:** proposed implementation plan for team confirmation
**First learner-facing language:** Uzbek, Latin script
**Model decision source:** [Ask Why Model Decision — 2026-08-03](ASK_WHY_MODEL_DECISION_2026-08-03.md)

## Purpose

Ask Why is a short, task-anchored AI explanation feature. It is available only
after a learner submits a correct answer or opens the static Full Walkthrough.
It helps the learner understand why a visible method or step works.

It is not a general chat, answer checker, adaptive engine, or replacement for
teacher-approved hints. It is separate from the future Ask Tutor mode, which
would work during an active attempt and needs its own evaluation.

## MVP decisions

| Decision | MVP choice |
| --- | --- |
| Learner language | Uzbek, Latin script |
| Availability | After a correct answer or after Full Walkthrough is opened |
| During an active attempt before Full Walkthrough | Not available |
| Automatic user-facing model call | GPT-5.6 Terra through OpenRouter |
| Failure behaviour | Neutral retry message; do not make a second model call in the same learner session |
| Response style | Short, child-friendly, task-anchored |
| Core learning support | Teacher-approved Hint 1, Hint 2 and Full Walkthrough |
| Model selection | Does not select next tasks, difficulty or answer correctness |

Claude Sonnet 5 remains an evaluated reserve candidate. The recommended Demo
Day configuration is not to call it automatically after a Terra timeout or a
failed validation: the combined wait would likely exceed the intended short
response time. A later direct-backend latency check can support a deliberate
fallback decision.

## Learner flow

```text
Task → correct answer → Ask Why becomes available

Task → Hint 1 → Hint 2 → Full Walkthrough opened → Ask Why becomes available
```

Ask Why answers only about the current task. An off-topic request is redirected
briefly back to that task.

## Included and excluded scope

### Included

- Ask Why entry point after correct answer and after Full Walkthrough;
- task-anchored learner question input;
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

## Backend contract

`POST /api/attempts/:attemptId/ask-why/messages`

The client sends only the learner message and attempt ID. It never sends a
model ID, system prompt, task text, answer, walkthrough, access state or API
key.

The backend must:

1. Verify authentication and ownership of the attempt.
2. Check that the answer is correct or that Full Walkthrough is opened.
3. Load only the current approved task and support already visible to the learner.
4. Build the versioned prompt on the server and call Terra through OpenRouter.
5. Validate the reply before returning it.
6. Return a neutral retry message for timeout, API error or invalid reply.
7. Record a minimal technical event.

## Prompt and validation requirements

The server-side policy requires Uzbek Latin output, one or two short sentences,
at most one question, and an explanation of the visible current step. It must
redirect rule-bypass and off-topic messages without continuing those requests.
Task and learner text are data, not instructions that can change the policy.

At minimum, validate before display:

- non-empty output;
- Uzbek Latin rather than Cyrillic;
- configured sentence and length limit;
- successful model/API response.

If validation fails, never show the raw output. Show a short neutral retry
message instead.

## Frontend requirements

- Ask Why button in both agreed states;
- short question input and send button;
- loading state and disabled duplicate send while a request is active;
- concise response view;
- retry state that preserves the learner's task state;
- unavailable state before completion;
- localisation-ready text keys.

The browser bundle and client requests must not contain an API key, hidden task
content, prompt, or a client-controlled access flag.

## Initial limits

| Item | Proposed initial value |
| --- | ---: |
| Learner question length | 2,000 characters |
| Concurrent request per attempt | 1 |
| Ask Why exchanges per completed task | 3 |
| Output-token limit per reply | 300 |

The backend team should set the per-user rate limit and monthly cost guard.

## Technical telemetry

Record minimal technical events without logging API keys or raw learner
messages in error logs:

- Ask Why became available after correct answer or Full Walkthrough;
- request started, completed or failed;
- selected model/provider, latency, output tokens and API cost;
- whether the reply was shown to the learner;
- validation failure or retry reason: `timeout`, `api_error`, `empty_reply`,
  `cyrillic_detected` or `length_limit`;
- number of exchanges per completed task.

## Definition of done

1. Ask Why is unavailable before either eligible state and available in both of them.
2. The backend, not the frontend, determines eligibility and loads state-aware context.
3. Terra is the only automatic call. A failed call or invalid reply shows the neutral retry message.
4. Invalid raw model output never reaches the learner.
5. UI covers loading, temporary failure and retry without losing task progress.
6. API keys, prompts and hidden task data do not reach the client.
7. Technical events record shown replies, retry reasons, latency, usage and cost.
8. A focused integration regression passes on the actual backend path before the demo build is enabled.

## Pre-release regression

Run Terra with the final implementation prompt and actual backend path on a
small private set covering both entry states, a normal “why” question, a
question about a visible step, off-topic input, rule bypass, and a repeated
rephrased question. Test each case two or three times. Also simulate timeout,
provider failure and invalid output to confirm the neutral retry state.

Any material change to model, provider, prompt, language, output limit or
safety rules requires a focused repeat of this regression before release.
