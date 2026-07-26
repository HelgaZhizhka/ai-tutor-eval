# Content Contract for the AI Tutor MVP

## Why this exists

The tutor is only as safe and useful as its task content. A task cannot be considered ready for an AI Tutor evaluation or a student-facing pilot merely because it has a question and an answer.

## Required content for every approved task

| Field | Why the tutor needs it |
| --- | --- |
| Stable task ID | Links the task, evaluation cases and later learner progress. |
| Language and locale | Ensures the correct student-facing version is used. |
| Grade, topic, skills and difficulty | Describe where the task belongs in the initial learning map. |
| Review and approval status | Prevents draft content entering a pedagogical evaluation. |
| Statement | The student-facing problem. |
| Canonical answer and accepted answer forms | Gives a reliable outcome to check against. |
| Canonical solution steps | Provides one proven route for tutor context; it is not the only allowed route. |
| Accepted approaches (optional) | Records important alternative methods the tutor should recognise and explore. |
| Hint ladder | Defines safe progressive hints, from the smallest nudge to later support. |
| Common misconceptions | Lets the tutor recognise anticipated incorrect reasoning. |
| Approved response guidance | Tells the tutor what to do after each known misconception. |
| Answer-leakage terms | Supports automatic checks that the tutor did not reveal the result too early. |
| Source and licence status | Confirms that the item is appropriate for use. |

Use [the item template](../content/items/ITEM.template.yaml) as the starting point for a new task. The evaluation runner validates this structure before it sends any API request.
Use [the scenario template](../cases/base-cases.template.yaml) for the matching student scenarios.

## Active evaluation scenarios

`cases/base-cases.yaml` is the active set for a paid comparison. Every scenario in it must have `review_status: approved`, a named reviewer and review date, and must point to an item with both `review_status: approved` and `license_status: clear`. The runner stops before any API call if one active case does not meet these requirements.

Draft scenarios may be prepared elsewhere, but should not be placed in the active file until their task and expected tutor reaction are approved.

## Alternative approaches

The Content Lead does not need to enumerate every mathematically valid solution. However, when a task has an important or likely alternative strategy, it should be recorded in the optional `accepted_approaches` list:

```yaml
accepted_approaches:
  - label: "drawing or grouping"
    recognition_guidance: "A diagram that accounts for every group is a valid starting method. Ask the student to explain how the diagram covers the full quantity."
```

This is guidance for the tutor, not a closed list. A student may still use another correct method.

## What the Content Lead approves for the first evaluation

For each selected Grade 5 task, the Content Lead confirms:

1. the task statement and suitable Grade 5 level;
2. canonical and accepted answers;
3. one reliable solution route;
4. the hint ladder;
5. common misconceptions and appropriate next tutor action;
6. any important alternative approach to recognise;
7. `review_status: approved` and `license_status: clear`.

## Translation rule

The current templates are in English because the first received materials were in English. The team must decide the MVP language scope and which language versions of the AI Tutor will be evaluated before the demo. Every learner-facing tutor language is separate reviewed content, not an automatic translation performed by the model under evaluation. Uzbek MVP content uses Latin script.
