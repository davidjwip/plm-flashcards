# v2 — Spelling-bee mode

A second mode in the same app: dictation practice for a written spelling bee. The contest
gives no word list, so the deck is the merged Cambridge Young Learners A–Z vocabulary
(Pre A1 Starters + A1 Movers), and nonsense words are generated because the bee uses them
to test decoding rather than recognition.

**Grown-up screen.** The app says the word out loud; the child writes it on paper; the
grown-up presses got it / not yet. No typing, no self-marking, no timer.

## Behaviour

| # | Behaviour |
|---|---|
| C1 | Bee mode is reached by the `#bee` route; sound-pattern mode is unaffected. |
| C2 | The grew-up chooses which levels to draw from: Starters, Movers, nonsense, any combination. |
| C3 | A round is ten words, drawn without repeating a word inside the round. |
| C4 | A nonsense word is labelled on screen as not a real word. |
| C5 | With no level chosen there are no words and Start is disabled. |

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC26 | a level selection | the bee dictionary is built | it contains only words from the chosen levels, deduplicated and alphabetical |
| AC27 | no level chosen | the bee dictionary is built | it is empty and Start is disabled |
| AC28 | a bee dictionary | a round starts | the round is ten words with no repeats |
| AC29 | nonsense words are requested | they are generated | each is lowercase, pronounceable (onset + rime), and never a word already in the bank or deck |
| AC30 | nonsense words are generated | the dictionary is built | each carries the `nonsense` tag so the screen can label it |

## Test map

| ID | Test file | Test name | Status |
|---|---|---|---|
| AC26 | `src/bee.test.ts` | a bee round only uses words from the chosen levels | green |
| AC27 | `src/bee.test.ts` | with no level chosen there are no words at all | green |
| AC28 | `src/bee.test.ts` | a round is ten words, never repeating one | green |
| AC29 | `src/bee.test.ts` | nonsense words are plausible decodable non-words, never a real word | green |
| AC30 | `src/bee.test.ts` | a nonsense word is tagged so the screen can say so | green |

## Data

`data/bee.json` — merged Cambridge Starters (385) + Movers-only (300) entries, parsed from
Cambridge's published 2025 A–Z wordlists (proper names, grammar terms and multiword phrases
removed). Cambridge © Cambridge University Press & Assessment; used here as a derived list for
personal practice, not redistributed as the original document.

## Out of scope

Spelling aloud against a clock, oral-bee rehearsal, per-child progress history.
