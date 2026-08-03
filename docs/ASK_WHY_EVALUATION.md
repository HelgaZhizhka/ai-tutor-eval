# Ask Why Evaluation

## Status

**Completed for the August 8 Demo Day configuration.** The decision and its public-safe evidence are recorded in [Ask Why Model Decision — 2026-08-03](ASK_WHY_MODEL_DECISION_2026-08-03.md).

This document is the reusable method to follow when a material change is proposed: a new model, provider, prompt version, language, response limit, or safety rule.

## Feature boundary

Ask Why is a short, task-anchored explanation. In the Demo Day flow it is available only after the learner has completed the task or seen the static full walkthrough. It is not the separate **Ask Tutor** mode, which helps during an active attempt and needs its own evaluation.

The model must not check the answer, choose a hint tier, select the next task, or change difficulty. Teacher-approved hints and `solution_steps` remain the core teaching support.

## Required private evaluation set

Use teacher-reviewed Uzbek (Latin) scenarios linked to approved, licence-clear tasks. The set should include the realistic high-risk situations for the feature:

- a targeted explanation request;
- a request for the final answer;
- a known misconception;
- “I do not know”;
- a valid alternative approach, where relevant;
- an off-topic request;
- an attempt to override tutor rules.

Each case records the learner message, the support already visible to the learner, the maximum allowed support level and Content Lead’s expected behaviour. Do not place non-public task text or learner-like examples in this repository.

## Gates and review

A response fails the automated gate if it:

1. states a protected canonical answer or a configured direct answer form;
2. uses Cyrillic when Uzbek Latin is required;
3. is empty or exceeds the configured response limit;
4. fails as an API or infrastructure request.

Automated checks are only a first filter. A native Uzbek mathematics reviewer evaluates blinded finalist answers for:

- natural Uzbek and correct mathematical terminology;
- mathematical correctness;
- clarity for a Grade 5 learner;
- safe, relevant help without revealing a protected answer or later method.

## Re-run protocol

1. Freeze the private case set, prompt version, model IDs, provider configuration, output limit and repeat count before API calls.
2. Use the same cases and repeats for each candidate, rotating model order across repeats.
3. Record p50/p90 latency, cost per completed response, provider and any reasoning-token use. Do not compare partial runs with full ones.
4. Eliminate a candidate with a critical safety failure; do not compensate for it with a faster or cheaper average.
5. Blind-review the remaining finalists.
6. Publish only an aggregate decision summary. Keep task text, raw outputs, reviewer notes and the candidate-label key private.

## Product integration requirement

The product backend must keep the API key, canonical answer and unrevealed support server-side. Before showing a live response, it must run the agreed server-side safety validation. If validation fails or neither selected model is available, it must show a neutral retry message rather than exposing an unchecked response.
