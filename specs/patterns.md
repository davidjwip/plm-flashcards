# Pattern catalogue — teaching order

Facts about the sequence, not content from the printed books. The word lists are
ours; only the order of patterns (which is what makes a word "decodable") comes
from the method.

Level 2, in order. A deck may use any pattern at or above its own row.

| Unit | Patterns introduced                          | Notes                            |
| ---- | -------------------------------------------- | -------------------------------- |
| 1    | short `a e i o u`                            | CVC words only                   |
| 2    | `a_e`, `ai`, `ay`; `ee`, `ea`                | first split digraph              |
| 3    | `i_e`, `ie`, `igh`; `o_e`, `oa`              |                                  |
| 4    | `ue`, `ui`; `u_e`, `ew`                      |                                  |
| 5    | `ou`, `ow`; `oi`, `oy`                       |                                  |
| 6    | `ar`; `or`                                   | r-controlled begins              |
| 7    | `ear`, `eer`; `air`, `are`                   |                                  |
| 8    | `au`, `aw`, `al`; `oo` (long and short), `u` |                                  |
| 9    | `ur`, `ir`; `or`, `er`; schwa                | schwa is the last concept taught |

Level 3, seeded in this spec by unit 1 only.

| Unit | Patterns introduced  | Notes                                      |
| ---- | -------------------- | ------------------------------------------ |
| 1    | `ck`, `c`, `k` = /k/ | alternative spellings, sentence-level work |

## How the app uses this

The order above is why the pattern picker is grouped the way it is: a pattern
is offered once its prerequisites have been taught. The app itself does not
enforce prerequisites — the grown-up chooses what to practise, and this file is
the reference for what is reasonable to choose together.

Consonant graphemes assumed known before unit 1: single consonants, and the
digraphs `sh ch th ng` — if a deck needs one of these earlier than that, the
catalogue is wrong and must be corrected here first.

## Word structure

A word is shown whole and read aloud; there are no tiles in this game. Patterns
are tags on words in `data/wordbank.json`, and the validator enforces that every
tag exists and every pattern has words.
