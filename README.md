# AI Tutor Evaluation Harness

This repository evaluates candidate LLMs for Olympiad Academy's constrained Grade 5 mathematics tutor. It does **not** build the product tutor.

For a non-technical team-meeting overview, see [TEAM_README.md](TEAM_README.md).

## Current scope

- Main evaluation language: English.
- Russian and Uzbek (`uz-UZ`, Latin script) are added only after a human reviewer approves translations.
- The first pedagogical evaluation uses five teacher-approved items.
- All API calls are opt-in and require `OPENROUTER_API_KEY`. No real student data may be added.

## Safety rules

1. Keep all API keys in local environment variables or an ignored `.env` file.
2. Never treat a draft item, AI translation or model confidence value as teacher validation.
3. Preserve raw model responses locally in `results/raw/`; they are intentionally ignored by Git.
4. Before a paid batch, inspect the estimated maximum cost and use the configured safety cap.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run eval:smoke
```

The last command will refuse to run until a valid key and selected teacher-approved items are present.

## Sources

- [Original content bank](content/original/grade5_math_item_bank.v0.1.md)
- [Initial Claude Code brief](docs/claude-code-brief-v1.md)
- [Content review requests](REVIEW_NEEDED.md)
