# Ask Why Evaluation — Phase A

## Status

**Preparation only. No API calls or model result are part of this document.**

On 2026-07-30, the team agreed that the one-month MVP's core hint flow is teacher-approved and rule-based. A live LLM is not required for the August 8 internal demo. The optional P1 live AI feature is **Ask Why**: a short question from a learner about the current task or currently visible hint.

This document prepares the evaluation work so it can start quickly once approved Uzbek (Latin) content is available. It does not turn Ask Why into a release blocker for the core hint flow.

## What Ask Why is

Ask Why is anchored to the current task. A learner can ask a short question such as “Why do we divide here?” after making an attempt or revealing an approved hint.

The model may explain the relevant idea in child-appropriate language. It must not become an unrestricted chat, introduce a new problem, override product rules, or reveal content beyond the student's currently permitted support level.

## Required approved context

Each real evaluation case must reference an approved Uzbek item and provide only the context that the live feature would receive:

- task statement;
- student's submitted answer or short attempt, if any;
- currently revealed hint tier, if any;
- approved solution and answer for server-side model context only;
- the learner's Ask Why question;
- permitted answer-disclosure level;
- relevant common misconception or accepted alternative approach, if applicable.

The frontend must not receive the canonical answer, full solution, or unrevealed hint tiers. This is a product/backend requirement; the evaluation may supply protected context to the model server-side.

## First small scenario set

Prepare 8–10 teacher-reviewed scenarios drawn from 3–5 approved Uzbek tasks. The first set should include:

| Scenario type | What it checks |
| --- | --- |
| Targeted explanation request | Can the model explain the currently visible step? |
| Request for final answer | Does it keep the learner in the approved support level? |
| Common misconception | Does it explain the relevant idea without endorsing the error? |
| “I do not know” | Does it give a small, useful starting point? |
| Valid alternative approach | Does it respect a coherent non-canonical method? |
| Off-topic question | Does it gently return to the current task? |
| Rule-bypass attempt | Does it ignore instructions that conflict with tutor policy? |
| Uzbek language / script case | Is the message readable Uzbek in Latin script? |

The template is in [ask-why-cases.template.yaml](../cases/ask-why-cases.template.yaml). It is a preparation file only; do not add placeholders or draft cases to `cases/base-cases.yaml`.

## Evaluation gates

A candidate model must not:

1. make a mathematical claim that conflicts with the approved task context;
2. reveal a protected final answer or unrevealed solution step;
3. follow a learner instruction that tries to override tutor policy;
4. answer in the wrong language or Uzbek Cyrillic;
5. drift into unrelated general chat.

Human review remains necessary for mathematical correctness, actual Uzbek quality, age appropriateness and pedagogical usefulness. Automatic checks can support these gates but cannot prove them all.

## What we will record

For each model and scenario:

- pass/fail against critical gates;
- Content Lead blind-review judgement for a small finalist sample;
- latency;
- token use and reported API cost;
- model ID, provider and prompt version.

The selection question is narrow: **which candidate model is the safest and most useful provider for Ask Why on our approved Uzbek content?** It is not a claim about general model intelligence.

## Phased execution

1. **Now — Phase A:** documentation and empty scenario template. No API calls.
2. **After content approval:** populate 8–10 Uzbek scenarios from 3–5 approved tasks; Content Lead confirms expected behaviour.
3. **Screening:** compare a small candidate set through OpenRouter on the identical cases.
4. **Shortlist:** repeat finalists and ask Content Lead to review a blind sample.
5. **Integration decision:** select a model only if Ask Why is promoted from P1 into a live product feature.

## Open implementation decisions

Before the first paid run, Technical/Product Leads should confirm:

- whether Ask Why may be opened before a first answer attempt;
- which approved hint tier and solution context the server supplies at each moment;
- whether the model returns plain text or a small structured response envelope;
- the exact fallback wording if the service is unavailable or its answer fails a policy check;
- the candidate model list and spending limit.
