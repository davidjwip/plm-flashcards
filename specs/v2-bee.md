# v2 — Spelling-bee mode

A second mode in the same app: dictation practice for a written spelling bee. The contest
gives no word list, so the deck is the merged Cambridge Young Learners A–Z vocabulary
(Pre A1 Starters + A1 Movers), and nonsense words are generated because the bee uses them
to test decoding rather than recognition.

**Grown-up screen.** The app says the word out loud; the child writes it on paper; the
grown-up presses got it / not yet. No typing, no self-marking, no timer.

## Behaviour

| #   | Behaviour                                                                                   |
| --- | ------------------------------------------------------------------------------------------- |
| C1  | Bee mode is reached by the `#bee` route; sound-pattern mode is unaffected.                  |
| C2  | The grew-up chooses which levels to draw from: Starters, Movers, nonsense, any combination. |
| C3  | A round is ten words, drawn without repeating a word inside the round.                      |
| C4  | A nonsense word is labelled on screen as not a real word.                                   |
| C5  | With no level chosen there are no words and Start is disabled.                              |

## Acceptance criteria

| ID   | Given                                       | When                               | Then                                                                                                                                                              |
| ---- | ------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC26 | a level selection                           | the bee dictionary is built        | it contains only words from the chosen levels, deduplicated and alphabetical                                                                                      |
| AC27 | no level chosen                             | the bee dictionary is built        | it is empty and Start is disabled                                                                                                                                 |
| AC28 | a bee dictionary                            | a round starts                     | the round is ten words with no repeats                                                                                                                            |
| AC29 | nonsense words are requested                | they are generated                 | each is lowercase, pronounceable (onset + rime), and never a word already in the bank or deck                                                                     |
| AC30 | nonsense words are generated                | the dictionary is built            | each carries the `nonsense` tag so the screen can label it                                                                                                        |
| AC31 | a word has just been spoken                 | the grown-up presses hear it again | it plays again, and a stalled utterance never leaves the button dead                                                                                              |
| AC32 | a bee round is running                      | a word appears                     | the word is hidden and only the audio gives it away, with a Show word control for the grown-up marking it                                                         |
| AC33 | the setup screen renders                    | the mode is shown                  | Sound patterns and Spelling bee are both visible, the active one is marked, and the choice survives a reload                                                      |
| AC34 | a bee round is running with the word hidden | the game screen renders            | the word-size buttons are absent, the volume controls and label remain, and the footer link says "Change settings"; with the word shown it says "Change patterns" |

## Test map

| ID   | Test file         | Test name                                                           | Status |
| ---- | ----------------- | ------------------------------------------------------------------- | ------ |
| AC26 | `src/bee.test.ts` | a bee round only uses words from the chosen levels                  | green  |
| AC27 | `src/bee.test.ts` | with no level chosen there are no words at all                      | green  |
| AC28 | `src/bee.test.ts` | a round is ten words, never repeating one                           | green  |
| AC29 | `src/bee.test.ts` | nonsense words are plausible decodable non-words, never a real word | green  |
| AC30 | `src/bee.test.ts` | a nonsense word is tagged so the screen can say so                  | green  |

## Data

`data/bee.json` — merged Cambridge Starters (385) + Movers-only (300) entries, parsed from
Cambridge's published 2025 A–Z wordlists (proper names, grammar terms and multiword phrases
removed). Cambridge © Cambridge University Press & Assessment; used here as a derived list for
personal practice, not redistributed as the original document.

## Out of scope

Spelling aloud against a clock, oral-bee rehearsal, per-child progress history.

## Fixes after first use (2026-10-22)

### AC31 — a word can be heard as many times as the child asks

Given a word has just been spoken
When the grown-up presses "hear it" again
Then it is spoken again, and a stalled utterance never leaves the button dead.

### AC32 — bee mode never shows the word

Given a bee round is running
When a word appears
Then the word is hidden and only the audio gives it away, with a "Show word"
control for the grown-up marking the spelling.

### AC33 — mode is a visible toggle

Given the setup screen
When it renders
Then "Sound patterns" and "Spelling bee" are both visible, the active one is
marked, and the choice survives a reload.

| AC31 | `src/audio.test.ts` | a word can be heard again after it finishes | green |
| AC32 | `src/views.test.ts` | bee mode hides the word and offers the grown-up a peek | green |
| AC33 | `src/views.test.ts` | the setup screen shows which mode is active | green |
| AC34 | `src/views.test.ts` | bee mode keeps only meaningful game controls | green |
