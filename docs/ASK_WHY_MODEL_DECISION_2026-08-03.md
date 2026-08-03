# Ask Why Model Decision for Demo Day

**Status:** decision-ready for the August 8 internal demo  
**Feature:** Ask Why only — not the separate future Ask Tutor mode

## Decision

Use **GPT-5.6 Terra through OpenRouter** as the primary model for the Uzbek Ask Why feature in the Demo Day build. Use **Claude Sonnet 5 through OpenRouter** as the fallback model when Terra is unavailable or the provider call fails.

If a response from either model fails server-side validation, do not show it to the learner. Show a short neutral retry message instead.

## Evidence

The team evaluated candidate models on teacher-approved Uzbek Grade 5 Ask Why scenarios. The process included:

1. A real-content comparison across eight candidate models on the same ten teacher-approved Uzbek Ask Why scenarios.
2. A blind Content Lead review of anonymised finalist responses for Uzbek language, mathematical correctness, Grade 5 clarity and pedagogical safety.
3. A final regression after prompt refinement, using four high-risk scenarios — asking for the answer, rule bypass, a misconception and an off-topic request — with three repeats per candidate.

### Candidates in the first comparison

- GPT-5.6 Terra
- Claude Sonnet 5
- Claude Opus
- Gemini 3.6 Flash
- DeepSeek V4 Flash
- DeepSeek V4 Pro
- Qwen 3.7 Plus
- Kimi K3

All candidates were called through OpenRouter with the same approved scenario set and prompt for that stage. The candidate names were removed before Content Lead reviewed the shortlisted answers. The report deliberately publishes aggregate evidence only; the task text, raw answers and candidate-label key remain private.

| Evidence | GPT-5.6 Terra | Claude Sonnet 5 |
| --- | --- | --- |
| Blind Content Lead review | 9 Approve, 1 Changes needed | 8 Approve, 2 Changes needed |
| Mathematical correctness in blind sample | No errors identified | No errors identified |
| Final prompt regression | 12 / 12 responses passed all automated gates | 11 / 12; one response exceeded the two-sentence limit |
| Final regression p50 latency | 1.19 s | 4.97 s |
| Final regression cost | $0.0087 | $0.0321 |

The final automated checks covered direct canonical-answer leakage, Uzbek Latin script, response length and empty output. Terra had zero failures.

## How to evaluate an additional model later

Yes — this decision can be extended without starting from scratch. A proposed candidate should first be run on the **same frozen private ten-scenario set** with the same Ask Why prompt and configuration as the first comparison. It should meet the same automated gates.

If it is competitive, it then goes through the same high-risk regression and a blinded Content Lead review alongside the current primary model. Only after that comparison may the team replace Terra, select an additional fallback, or record the candidate as unsuitable. A new run should be documented as an addendum with its date, model ID, provider, prompt version, repeat count, latency, cost and gate results.

## Product boundaries

- Ask Why is a short, task-anchored explanation feature. In the Demo Day flow it appears only after the learner has completed a problem or seen the full walkthrough.
- The model does not check answers, choose hint tiers, choose the next task or change difficulty.
- Teacher-approved hints and `solution_steps` remain the core learning support.
- This decision does **not** validate the future Ask Tutor mode. Ask Tutor works during an active attempt and requires a separate multi-turn evaluation.

## Integration requirements

- Call the model from the server, never directly from the client.
- Keep API keys and protected task data server-side.
- Require short Uzbek Latin output.
- Add a server-side safety-validation and retry/fallback path before exposing a response to a learner.

## Scope of this decision

This is a narrow, evidence-based and reversible choice for the Demo Day Ask Why feature. It does not claim that GPT-5.6 Terra is the best model in general or that the product has already proven learning outcomes.

## Privacy note

This public repository document intentionally excludes task statements, student scenarios, raw model responses, reviewer notes and the candidate-label key. Those materials remain in the private evaluation workspace.
