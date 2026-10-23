# v2 UI — the maths-game look, one-screen practice

Status: **draft — implemented behind a PR; Dave approves by merging.**
Owner: Dave approves; agent drafts. Non-goals are as binding as goals.

## 1. Problem

The app works but does not look like the sibling maths game (`maths.zt489.com`), and it
opens on a grown-up setup screen instead of on a word. George has to be handed a
configuration screen before he can read anything. The bee toggle also does nothing from a
plain load: `src/main.ts` passes `beeDeck` only when the URL already holds `#bee`, and
`app.ts` guards every mode click with `if (!beeDeck …) return`, so the toggle is inert.

The redesign makes the app open like the maths game: one screen, one big piece of work in
the middle, one row of verdict buttons where the maths keypad sits, and the two switches a
grown-up needs (mode, word list) in the header.

## 2. Behaviour

| ID  | Behaviour                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | The app opens **in a run**, not on a setup screen — the maths game generates a problem on load and this must do the same.                    |
| U2  | The first run is Sound patterns over the five short vowels (`a e i o u`).                                                                    |
| U3  | The header carries the two controls: a mode toggle (Sound patterns / Spelling bee) and a word-list toggle that opens the pattern picker.     |
| U4  | The word is the largest thing on screen and sits in the framed box that the maths equation occupies.                                         |
| U5  | The verdict pair sits where the maths number pad sits.                                                                                       |
| U6  | The visual language is the maths game's: pastel gradient page, one rounded white card, coral/teal pills, pale-yellow bordered tile, Fredoka. |
| U7  | Nothing a browser test relies on may disappear: the `data-testid` contract survives.                                                         |
| U8  | No runtime network request is added — the font is self-hosted, not fetched from Google.                                                      |

## 3. Acceptance criteria

| ID   | Given                               | When                               | Then                                                                                                                                                                                                                       |
| ---- | ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC35 | a fresh load with empty storage     | the app mounts                     | the practice screen renders with a word, and the selected patterns are exactly `a,e,i,o,u`; no setup screen is shown first                                                                                                 |
| AC36 | the practice screen                 | it renders                         | the header holds a mode toggle with `mode-patterns` and `mode-bee`, exactly one `aria-pressed="true"`, and a `pattern-toggle` button                                                                                       |
| AC37 | a fresh load with no `#bee` hash    | the grown-up presses Spelling bee  | the screen becomes bee practice (word hidden, peek present) — the deck is mounted regardless of URL                                                                                                                        |
| AC38 | the practice screen                 | it renders                         | the word sits inside `data-testid="word-box"` and that box precedes the verdict pad in document order                                                                                                                      |
| AC39 | the practice screen                 | it renders                         | exactly one `mark-right` and one `mark-wrong`, both enabled, both inside `data-testid="verdict-pad"`; CSS gives them ≥96px min-height in a two-column grid                                                                 |
| AC40 | the stylesheet                      | it is read                         | it declares the maths palette (`#ff6b6b`, `#4ecdc4`, gradient `#ffd1dc`→`#a2d8f1`), a 15px-radius white panel shadow, and a self-hosted `@font-face` for Fredoka                                                           |
| AC41 | bee practice                        | it renders                         | the word is hidden, `peek` reveals it, and no `word-smaller`/`word-bigger` exist (AC34 preserved)                                                                                                                          |
| AC42 | any screen the browser suites drive | it renders                         | every test id in the contract list still exists: `app, mode-bar, mode-patterns, mode-bee, pattern-toggle, pattern-option, word-count, word, mark-right, mark-wrong, progress, hear, track, celebration, celebration-close` |
| AC43 | a 600px viewport                    | the stylesheet applies             | the verdict pad stays two columns and the page stays single column                                                                                                                                                         |
| AC44 | the pattern panel is open           | the grown-up unticks every pattern | the run does not restart, the count reads "pick at least one pattern", and re-ticking any pattern restarts it                                                                                                              |

## 4. Edge cases and refusals

- An eight-letter word (`alphabet`) must not push the verdicts below the fold at 1024x768.
- Bee mode keeps its dictation rules: word hidden, spoken once on arrival, `Show word` peek, no size buttons.
- The pattern panel starts **closed**; opening it must not restart the run.
- Celebration overlay still fires at every tenth right answer, not just the first.
- The picker panel uses `<details>`/`hidden` rather than a modal dialog — no focus trap needed for a grown-up screen.
- `localStorage` selection wins over the default: only a _first_ run gets the five short vowels.

## 5. Test map

A row appears here in the same PR as its test.

| Criterion | Test file            | Test name                                                      | Status |
| --------- | -------------------- | -------------------------------------------------------------- | ------ |
| AC35      | `src/layout.test.ts` | AC35 — a fresh load opens a short-vowel run                    | green  |
| AC36      | `src/layout.test.ts` | AC36 — the header carries the mode and word-list toggles       | green  |
| AC37      | `src/layout.test.ts` | AC37 — bee mode is reachable from a plain load                 | green  |
| AC38      | `src/layout.test.ts` | AC38 — the word sits in the framed box before the verdicts     | green  |
| AC39      | `src/layout.test.ts` | AC39 — the verdict pair fills the pad, enabled and two columns | green  |
| AC40      | `src/layout.test.ts` | AC40 — the stylesheet carries the maths palette and the font   | green  |
| AC41      | `src/layout.test.ts` | AC41 — bee practice hides the word and drops the size controls | green  |
| AC42      | `src/layout.test.ts` | AC42 — every test id the browser suites need still renders     | green  |
| AC43      | `src/layout.test.ts` | AC43 — the verdict pad stays two columns under 600px           | green  |
| AC44      | `src/layout.test.ts` | AC44 — unticking everything does not restart the run           | green  |

## 6. Decisions

| #   | Decision                                                                 | Alternative rejected, and why                                                                                                                 |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Land straight in a run; the picker becomes a header-toggled panel.       | Keeping the setup screen as the landing page — the maths game starts on a problem, and Dave asked for the word to be where the arithmetic is. |
| D2  | Port the maths CSS tokens and structure; do not import its stylesheet.   | Sharing one stylesheet across repos — two separate Pages projects, no build coupling, and the maths file carries seven dead selectors.        |
| D3  | Self-host Fredoka woff2 under `public/fonts/`.                           | Google Fonts `@import` — a runtime network call (breaks offline-first) and a URL in a tracked file, which `guardrail:scan` rejects.           |
| D4  | Assert layout as strings against `views.ts` and by reading `styles.css`. | jsdom layout assertions — `jsdom` is an optional peer here and the unit gate cannot rely on it starting.                                      |
| D5  | Keep every existing `data-testid`; add `word-box` and `verdict-pad`.     | Renaming ids for tidiness — the e2e suite and `verify:behaviour` drive those selectors, and they gate CI.                                     |

## 7. Open questions

1. Should the pattern panel close itself once a selection changes? Default: stay open, so
   a grown-up can tick several patterns without reopening it.
2. Does the bee mode want the same one-screen landing? Default: yes — bee opens a run from
   the default Cambridge deck (starters + movers + nonsense).
