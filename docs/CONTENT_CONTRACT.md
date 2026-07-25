# Content Contract for the AI Tutor MVP

## Why this exists

The tutor is only as safe and useful as its task content. A task cannot be considered ready for an AI Tutor evaluation or a student-facing pilot merely because it has a question and an answer.

## Required content for every approved task

| Field | Why the tutor needs it |
| --- | --- |
| Stable task ID | Links the task, evaluation cases and later learner progress. |
| Language and locale | Ensures the correct student-facing version is used. |
| Review and approval status | Prevents draft content entering a pedagogical evaluation. |
| Approval scope | Distinguishes technical smoke testing from `initial_model_evaluation` items. |
| Statement | The student-facing problem. |
| Canonical answer and accepted answer forms | Gives a reliable outcome to check against. |
| Canonical solution steps | Provides one proven route for tutor context; it is not the only allowed route. |
| Hint ladder | Defines safe progressive hints, from the smallest nudge to later support. |
| Common misconceptions | Lets the tutor recognise anticipated incorrect reasoning. |
| Approved response guidance | Tells the tutor what to do after each known misconception. |
| Answer-leakage terms | Supports automatic checks that the tutor did not reveal the result too early. |
| Source and licence status | Confirms that the item is appropriate for use. |

## Alternative approaches

The Content Lead does not need to enumerate every mathematically valid solution. However, when a task has an important or likely alternative strategy, it should be recorded as an optional `accepted_approach`:

```yaml
accepted_approaches:
  - label: "drawing or grouping"
    recognition_guidance: "A diagram that accounts for every group is a valid starting method. Ask the student to explain how the diagram covers the full quantity."
```

This is guidance for the tutor, not a closed list. A student may still use another correct method.

## What the Content Lead approves for the first evaluation

For each of the five selected Grade 5 tasks, the Content Lead confirms:

1. the task statement and suitable Grade 5 level;
2. canonical and accepted answers;
3. one reliable solution route;
4. the hint ladder;
5. common misconceptions and appropriate next tutor action;
6. any important alternative approach to recognise;
7. `review_status: approved`, `license_status: clear`, and `approval_scope: initial_model_evaluation`.

## Translation rule

English is the source language for the first model comparison. Russian and Uzbek versions are separate reviewed content, not automatic translations performed by the model under evaluation. Uzbek MVP content uses Latin script.
