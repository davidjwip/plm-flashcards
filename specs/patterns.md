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

## Decodability rule

A word is decodable at unit N when every grapheme in it belongs to a pattern
introduced at unit ≤ N. The validator (`npm run validate:decks`) implements this
against a typed table mirroring the above; a violating word fails the build.

Consonant graphemes assumed known before unit 1: single consonants, and the
digraphs `sh ch th ng` — if a deck needs one of these earlier than that, the
catalogue is wrong and must be corrected here first.
