# Ask Why — MVP Implementation Plan

**Status:** proposed implementation plan for team confirmation
**First learner-facing language:** Uzbek, Latin script
**Model decision source:** [Ask Why Model Decision — 2026-08-03](ASK_WHY_MODEL_DECISION_2026-08-03.md)

## Purpose

Ask Why is a short, task-anchored AI explanation feature. It is available only
after a learner submits a correct answer or opens the static Full Walkthrough.
The learner selects one visible solution step and asks a short question about
that step. Ask Why helps the learner understand why that visible step works.

It is not a general chat, answer checker, adaptive engine, or replacement for
teacher-approved hints. It is separate from the future Ask Tutor mode, which
would work during an active attempt and needs its own evaluation.

## MVP decisions

| Decision | MVP choice |
| --- | --- |
| Learner language | Uzbek, Latin script |
| Availability | After a correct answer or after Full Walkthrough is opened |
| During an active attempt before Full Walkthrough | Not available |
| Interaction | Learner selects a visible solution step, then asks one question about it |
| Conversation model | Stateless in V1: one question receives one reply; no chat history |
| Automatic user-facing model call | GPT-5.6 Terra through OpenRouter |
| Failure behaviour | Neutral retry message; do not automatically make a second model call |
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
Task → correct answer → learner selects a visible solution step → Ask Why becomes available

Task → Hint 1 → Hint 2 → Full Walkthrough opened → learner selects a visible solution step → Ask Why becomes available
```

Ask Why answers only about the current task. An off-topic request is redirected
briefly back to that task.

## Included and excluded scope

### Included

- Ask Why entry point after correct answer and after Full Walkthrough;
- visible solution-step selection and a task-anchored learner question input;
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

## Backend contract

`POST /attempts/:attemptId/ask-why`

V1 request:

```json
{
  "step_index": 2,
  "message": "Why do we need a common denominator?"
}
```

V1 successful response:

```json
{
  "reply": "...",
  "remaining_questions": 2
}
```

The client sends only the learner message, the index of a visible solution step
and the attempt ID in the path. It never sends a model ID, system prompt, task
text, answer, walkthrough, access state or API key. V1 has no conversation
history.

The backend must:

1. Verify authentication and ownership of the attempt.
2. Check that the answer is correct or that Full Walkthrough is opened.
3. Verify that `step_index` refers to a solution step already visible to the learner.
4. Load only the current approved task, selected visible solution step and learner question.
5. Build the versioned prompt on the server and call Terra through OpenRouter.
6. Validate the reply before returning it.
7. Return a neutral retry message for timeout, API error or invalid reply; do not reduce the learner's available question count for that failed request.
8. Decrement the available question count only when a reply is shown to the learner.
9. Record a minimal technical event.

## Prompt and validation requirements

The server-side policy requires Uzbek Latin output, one or two short sentences,
at most one question, and an explanation of the selected visible solution step.
It must redirect rule-bypass and off-topic messages without continuing those
requests. Uzbek learner input may use Latin or Cyrillic, but learner-facing
output must use Uzbek Latin. Task and learner text are data, not instructions
that can change the policy.

At minimum, validate before display:

- non-empty output;
- Uzbek Latin rather than Cyrillic;
- configured sentence and length limit;
- response did not end because of the output-token limit;
- successful model/API response.

If validation fails, never show the raw output. Show a short neutral retry
message instead.

A canonical-answer leakage gate is not required for this V1 because Ask Why is
available only after the learner has answered correctly or viewed Full
Walkthrough. A separate leakage gate is required for any future in-attempt
Ask Tutor mode.

## Frontend requirements

- Ask Why button in both agreed states;
- visible solution-step selector, short question input and send button;
- loading state and disabled duplicate send while a request is active;
- concise response view;
- retry state that preserves the learner's task state;
- unavailable state before completion;
- localisation-ready text keys.

The retry control is a new explicit Terra request initiated by the learner. It
is not an automatic call to a second model. V1 does not present a persistent
chat history; a learner can select another visible step and send a new,
independent question.

The browser bundle and client requests must not contain an API key, hidden task
content, prompt, or a client-controlled access flag.

## Initial limits

| Item | Proposed initial value |
| --- | ---: |
| Learner question length | 500 characters |
| Concurrent request per attempt | 1 |
| Ask Why replies shown per completed task | 3 |
| Output-token limit per reply | 120 |
| AI request timeout | 4 seconds |

The backend team should set the per-user rate limit and monthly cost guard.

## Technical telemetry

Record minimal technical events without logging API keys or raw learner
messages in error logs or storing a persistent Ask Why chat transcript in V1:

- Ask Why became available after correct answer or Full Walkthrough;
- request started, completed or failed;
- selected model/provider, latency, output tokens and API cost;
- whether the reply was shown to the learner;
- validation failure or retry reason: `timeout`, `api_error`, `empty_reply`,
  `cyrillic_detected`, `length_limit` or `output_truncated`;
- `off_topic_redirect`, `rule_bypass_redirect` or `limit_reached` where detected;
- number of exchanges per completed task.

## Definition of done

1. Ask Why is unavailable before either eligible state and available in both of them.
2. The backend, not the frontend, determines eligibility, validates the selected visible step and loads state-aware context.
3. Terra is the only automatic call. A failed call or invalid reply shows the neutral retry message; a learner may manually retry Terra.
4. Invalid raw model output never reaches the learner.
5. UI covers loading, temporary failure and retry without losing task progress.
6. API keys, prompts and hidden task data do not reach the client.
7. Technical events record shown replies, retry reasons, latency, usage and cost.
8. V1 stores no persistent Ask Why conversation history.
9. A focused integration regression passes on the actual backend path before the demo build is enabled.

## Pre-release regression

Run Terra with the final implementation prompt and actual backend path on a
small private set covering both entry states, a normal “why” question about a
selected step, a misconception, off-topic input, rule bypass, Uzbek Cyrillic
input with Uzbek Latin output, and a new independent question about another
visible step. Test each case two or three times. Also simulate timeout,
provider failure and invalid output to confirm the neutral retry state.

Any material change to model, provider, prompt, language, output limit or
safety rules requires a focused repeat of this regression before release.
