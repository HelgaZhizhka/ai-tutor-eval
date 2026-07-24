# Content and evaluation review needed

This file records questions for humans. The evaluation code must not silently resolve them.

## Blocking approval for the first pedagogical evaluation

The Content Lead should select and mark five Grade 5 items as **Approved for initial AI model evaluation**. For each selected item, confirm:

1. problem statement;
2. canonical and accepted answers;
3. solution steps;
4. hint ladder;
5. misconceptions, example incorrect answers and the appropriate next tutoring action.

## Known item-bank issues

| ID / area | Observation | Needed decision |
| --- | --- | --- |
| Bank metadata | Header says 15 items, index lists 13, file contains 18. | Keep the normalized metadata at 18; Content Lead need not act. |
| Merzlyak block | The five tasks reuse `G5-EN-0001` to `G5-EN-0005`. | Technical rename to `G5-MZ-0001` to `G5-MZ-0005`. |
| `G5-EN-0008` | The suggested regrouping `20.00` → `19.100` is not mathematically equivalent. | Content Lead to supply or approve a corrected misconception response. |
| `G5-EN-0013` | Adding the listed numerators and denominators appears to produce `7/14`, not `7/16`. | Content Lead to confirm the intended misconception and example. |
| Merzlyak source | Entries are described as adapted from a published workbook but also as original/free to distribute. | Clarify source, adaptation extent and permission before external use. |
| All items | Current review status is `draft`. | Do not present model results as pedagogically final until selected items are approved. |
| Russian and Uzbek | There are no human-reviewed translations yet. Uzbek MVP uses Latin script. | Add human-reviewed translations and glossary before multilingual ranking. |

## Technical decisions already made

- The first model comparison will use English as the primary language.
- Uzbek is `uz-UZ` in Latin script; Uzbek Cyrillic is outside MVP scope.
- Merzlyak tasks are excluded from the first evaluation unless their use is explicitly cleared.
