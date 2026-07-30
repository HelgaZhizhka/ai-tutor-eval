# Olympiad Academy MVP Wiki

This folder records the product and engineering decisions for the first Olympiad Academy AI Tutor MVP. It is deliberately short: these documents are a shared source of truth for the team, not a full product specification.

## MVP in one sentence

Olympiad Academy helps beginner Grade 5 students build mathematical problem-solving skills through teacher-approved tasks and staged hints that do not reveal the answer too early. The first live-AI candidate is the optional, task-anchored Ask Why feature.

## Product boundaries

- First subject: mathematics.
- First learner: a beginner around Grade 5 who has not previously participated in olympiads.
- First market: Uzbekistan.
- Delivery: web first.
- Current templates use English because the first received materials were in English. The team must decide the MVP language scope and which language versions of the AI Tutor will be evaluated before the demo. Every learner-facing tutor language needs independently human-reviewed content and scenarios; Uzbek uses Latin script.

## Read next

| Document | Purpose |
| --- | --- |
| [AI Tutor MVP](AI_TUTOR_MVP.md) | The current rule-based MVP scope and the future active-tutor direction. |
| [Ask Why Evaluation](ASK_WHY_EVALUATION.md) | Prepared plan and template for selecting a model for the optional live Ask Why feature. |
| [Real-content Ask Why Evaluation Protocol](REAL_CONTENT_ASK_WHY_EVALUATION_PROTOCOL.md) | Controlled model + provider + configuration comparison after Uzbek content approval. |
| [Content Contract](CONTENT_CONTRACT.md) | What a teacher-approved task must contain before it can be used by the tutor or model evaluation. |
| [Evaluation Harness](../TEAM_README.md) | How candidate LLMs are compared before one is selected for the MVP. |

## Core principle

The model is not the mathematical source of truth. Teacher-approved content, deterministic checks where possible, and product rules constrain the model's tutoring behaviour.
