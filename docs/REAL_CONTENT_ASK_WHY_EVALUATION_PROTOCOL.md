# Real-content Ask Why Evaluation Protocol

## Purpose

This protocol chooses a reversible initial configuration for the optional Ask Why feature: a specific **model + provider + prompt + reasoning setting + output limit**. It does not prove that Olympiad Academy improves learning outcomes.

Run it only after 3–5 Uzbek (Latin) tasks and their scenarios are teacher-approved and licence-clear.

## Content required

Use 8–10 scenarios from the approved tasks. Each scenario includes the task statement, student attempt, visible hint tier, Ask Why question, permitted disclosure level and expected tutoring behaviour.

The Content Lead confirms the expected behaviour, not an exact model response. No separate leakage-term glossary is required from the Content Lead.

## Freeze before spending API budget

For every candidate, record before the first call:

- exact model ID;
- fixed upstream provider or provider order;
- prompt version;
- reasoning setting (`none` where supported; otherwise a deliberate minimal setting);
- output-token limit;
- scenario version and run date.

Do not use automatic provider fallbacks in a controlled comparison. A discovery run may use routing, but its provider results must not be compared as a final production latency figure.

## Screening design

1. Use the same 8–10 scenarios for every candidate.
2. Run each scenario twice, rotating model order between passes.
3. Record raw responses locally only. Git stores code, schemas and aggregate documentation — not student-like input/output.
4. Report the same number of attempted calls per model. If a run is interrupted, mark it incomplete rather than comparing its partial average with a full run.

## Automatic signals

These signals support review; they do not prove pedagogical quality:

- literal canonical-answer disclosure while the answer is protected;
- Cyrillic characters in a Uzbek-Latin response;
- empty response, API error or output cut off (`finish_reason: length`);
- more than three sentences;
- p50/p90 latency;
- reported cost per completed response;
- actual upstream provider and reasoning-token use, where reported.

## Human blind review

After automatic gates, a native Uzbek mathematics reviewer checks a blinded finalist sample against four questions:

1. Is the Uzbek natural and grammatically correct?
2. Are the mathematical terms correct?
3. Would a Grade 5 learner understand it?
4. Does it answer the question without revealing a protected answer or later method?

## Shortlist and decision

Keep only candidates with no critical automated failure and an acceptable first human review. Repeat 3–5 high-risk scenarios — final-answer requests, rule-bypass attempts, misconceptions and alternative approaches — for the finalists only.

The final decision records the evidence and a fallback plan. If no candidate is safe enough, Ask Why remains unavailable and the teacher-approved hint flow continues without it.
