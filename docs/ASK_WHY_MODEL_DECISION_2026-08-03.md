# Ask Why Model Decision for Demo Day

**Status:** decision-ready for the August 8 internal demo  
**Feature:** Ask Why only — not the separate future Ask Tutor mode

## Decision

Use **GPT-5.6 Terra through OpenRouter** as the automatic model for the Uzbek Ask Why feature in the Demo Day build. If Terra is unavailable, times out, or its response fails server-side validation, show a short neutral retry message.

Claude Sonnet 5 remains an evaluated reserve candidate, but it is not called automatically in the same learner session. Its observed latency would make a Terra-then-Sonnet sequence unlikely to meet the intended short response time.

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

The final automated checks covered direct canonical-answer leakage, Uzbek Latin script, response length and empty output. Terra had zero failures. This small regression does not prove that Terra and Sonnet differ materially in overall response quality; Terra is the selected option because both were safe finalists while Terra was materially faster and less expensive in this configuration.

### Final regression configuration

| Setting | Value |
| --- | --- |
| Date | 2026-08-03 |
| Prompt | `ask-why.v4` |
| Models | `openai/gpt-5.6-terra`, `anthropic/claude-sonnet-5` |
| Cases and repeats | 4 high-risk approved Uzbek cases × 3 repeats per model |
| Output limit | 300 tokens |
| Reasoning | `none` |
| Observed provider path | OpenAI for Terra; Amazon Bedrock for Sonnet |
| Terra recorded cost | about $0.000725 per response; about $0.725 per 1,000 responses |
| Sonnet recorded cost | about $0.002675 per response; about $2.675 per 1,000 responses |

This is a decision about the tested prompt and configuration, not a claim about every possible configuration of either model.

## How to evaluate an additional model later

Yes — this decision can be extended without starting from scratch. A proposed candidate should first be run on the **same frozen private ten-scenario set** with the same Ask Why prompt and configuration as the first comparison. It should meet the same automated gates.

If it is competitive, it then goes through the same high-risk regression alongside the current primary model. Only after that comparison may the team replace Terra, select a fallback, or record the candidate as unsuitable. A new run should be documented as an addendum with its date, model ID, provider, prompt version, repeat count, latency, cost and gate results.

## Product boundaries

- Ask Why is a short, task-anchored explanation feature. In the Demo Day flow it appears only after the learner has completed a problem or seen the full walkthrough.
- The model does not check answers, choose hint tiers, choose the next task or change difficulty.
- Teacher-approved hints and `solution_steps` remain the core learning support.
- This decision does **not** validate the future Ask Tutor mode. Ask Tutor works during an active attempt and requires a separate multi-turn evaluation.

## Integration requirements

- Call the model from the server, never directly from the client.
- Keep API keys and protected task data server-side.
- Require short Uzbek Latin output.
- Add a server-side safety-validation and neutral retry path before exposing a response to a learner.

## Scope of this decision

This is a narrow, evidence-based and reversible choice for the Demo Day Ask Why feature. It does not claim that GPT-5.6 Terra is the best model in general or that the product has already proven learning outcomes.

## Privacy note

This public repository document intentionally excludes task statements, student scenarios, raw model responses, reviewer notes and the candidate-label key. Those materials remain in the private evaluation workspace.
