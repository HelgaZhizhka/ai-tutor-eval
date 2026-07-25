# Olympiad Academy MVP Wiki

This folder records the product and engineering decisions for the first Olympiad Academy AI Tutor MVP. It is deliberately short: these documents are a shared source of truth for the team, not a full product specification.

## MVP in one sentence

Olympiad Academy helps beginner Grade 5 students build mathematical problem-solving skills through teacher-approved tasks, adaptive practice and an AI tutor that guides reasoning without revealing the answer too early.

## Product boundaries

- First subject: mathematics.
- First learner: a beginner around Grade 5 who has not previously participated in olympiads.
- First market: Uzbekistan.
- Delivery: web first.
- Initial evaluation language: English. Russian and Uzbek (`uz-UZ`, Latin script) follow human review of translations.

## Read next

| Document | Purpose |
| --- | --- |
| [AI Tutor MVP](AI_TUTOR_MVP.md) | The mission, responsibilities, boundaries and interaction flow of the tutor. |
| [Content Contract](CONTENT_CONTRACT.md) | What a teacher-approved task must contain before it can be used by the tutor or model evaluation. |
| [Evaluation Harness](../TEAM_README.md) | How candidate LLMs are compared before one is selected for the MVP. |

## Core principle

The model is not the mathematical source of truth. Teacher-approved content, deterministic checks where possible, and product rules constrain the model's tutoring behaviour.
