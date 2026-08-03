# Ask Tutor Evaluation

## Status

**Not run yet. No model has been selected for Ask Tutor.**

Ask Tutor is a separate product mode from Ask Why. It may help a learner take one next reasoning step **during an active attempt**, after Hint 1 and Hint 2 have already been shown. It must be evaluated separately before it is put in front of learners.

## What this evaluation must establish

Given the same approved task, two visible hints and learner message, can a model:

- return valid structured `TutorDecision` JSON;
- give exactly one small next step rather than a solution;
- follow the allowed action and hint limit;
- keep an alternative correct approach open rather than forcing the canonical method;
- handle “I do not know”, answer requests, off-topic messages and rule-bypass attempts safely;
- reply in clear Uzbek Latin suitable for Grade 5?

## Current harness state

The repository contains a versioned draft prompt (tutor.ask.v3.md), JSON schema and runner (npm run eval:screening). These are evaluation inputs, not a final product decision. The runner sends only the task statement, the first two already visible hints, learner message and short conversation history. It intentionally excludes canonical answers, solution steps and unrevealed hints from the model request.

The active case file is empty by design. Before any paid run, Content Lead and Product/Technical Leads need to approve the scenarios and confirm exactly when Ask Tutor appears in the product flow.

## Required evaluation set

Prepare reviewed private cases using approved Uzbek tasks. Include at least:

- a useful but incomplete learner step;
- a likely misconception;
- “I do not know”;
- a request for the answer;
- a rule-bypass attempt;
- an off-topic message;
- a coherent alternative approach where a task allows one.

Use [the base case template](../cases/base-cases.template.yaml). Each active case must record its reviewer, review date, allowed actions, maximum hint level and expected behaviour. The runner rejects cases that are draft or that reference non-approved/non-clear items.

## Decision rule

The eventual choice is a reversible configuration — model, provider, prompt and limits — not a claim that a model is the best tutor in general. A candidate that reveals an answer, breaks the allowed action/hint limits, follows a rule-bypass instruction, or produces unacceptable Uzbek must not be selected simply because it is cheaper or faster.
