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

| ID   | Given                                                       | When                               | Then                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC35 | a fresh load with empty storage                             | the app mounts                     | the practice screen renders with a word, and the selected patterns are exactly `a,e,i,o,u`; no setup screen is shown first                                                                                                 |
| AC36 | the practice screen                                         | it renders                         | the header holds a mode toggle with `mode-patterns` and `mode-bee`, exactly one `aria-pressed="true"`, and a `pattern-toggle` button                                                                                       |
| AC37 | a fresh load with no `#bee` hash                            | the grown-up presses Spelling bee  | the screen becomes bee practice (word hidden, peek present) — the deck is mounted regardless of URL                                                                                                                        |
| AC38 | the practice screen                                         | it renders                         | the word sits inside `data-testid="word-box"` and that box precedes the verdict pad in document order                                                                                                                      |
| AC39 | the practice screen                                         | it renders                         | exactly one `mark-right` and one `mark-wrong`, both enabled, both inside `data-testid="verdict-pad"`; CSS gives them ≥96px min-height in a two-column grid                                                                 |
| AC40 | the stylesheet                                              | it is read                         | it declares the maths palette (`#ff6b6b`, `#4ecdc4`, gradient `#ffd1dc`→`#a2d8f1`), a 15px-radius white panel shadow, and a self-hosted `@font-face` for Fredoka                                                           |
| AC41 | bee practice                                                | it renders                         | the word is hidden, `peek` reveals it, and no `word-smaller`/`word-bigger` exist (AC34 preserved)                                                                                                                          |
| AC42 | any screen the browser suites drive                         | it renders                         | every test id in the contract list still exists: `app, mode-bar, mode-patterns, mode-bee, pattern-toggle, pattern-option, word-count, word, mark-right, mark-wrong, progress, hear, track, celebration, celebration-close` |
| AC43 | a 600px viewport                                            | the stylesheet applies             | the verdict pad stays two columns and the page stays single column                                                                                                                                                         |
| AC44 | the pattern panel is open                                   | the grown-up unticks every pattern | the run does not restart, the count reads "pick at least one pattern", and re-ticking any pattern restarts it                                                                                                              |
| AC45 | any screen                                                  | it renders                         | the screen title uses the maths h1 scale (2.5rem, 2rem under 600px) and is centred, in both modes                                                                                                                          |
| AC46 | the mode toggle                                             | a pill is active                   | the 4px active ring is fully visible — the mode bar does not clip it (`overflow` is not hidden)                                                                                                                            |
| AC47 | bee practice                                                | it renders                         | the `Show word` button is at least double the standard action-button height (min-height 5rem)                                                                                                                              |
| AC48 | every screen                                                | it renders                         | the footer reads exactly `© 2026 David Ip. Created for George and Teddy Ip.`                                                                                                                                               |
| AC49 | the practice screen                                         | it renders                         | the progress area is the maths "Path to the Party! 🎉" panel: two rows of five numbered steps (1–5, 6–10), filled = right answers mod 10, a goal-end 🎉, and a `Problems Solved: n / Total Problems: n` line               |
| AC50 | the party track                                             | it renders                         | the two rows of steps are horizontally centred whether or not the mascot is shown, and the mascot/goal do not shift them off-centre                                                                                        |
| AC51 | Sound patterns practice                                     | the word card renders              | the word is not bold — `.card` font-weight is 500 or less                                                                                                                                                                  |
| AC52 | the practice screen                                         | it renders                         | the vertical gap above “hear it” equals the gap below it — the empty flash slot reserves no height and `.hear` has symmetric margins                                                                                       |
| AC53 | the practice screen                                         | it renders                         | no `choose-patterns` control is rendered; the header `pattern-toggle` is the only route back to the pattern list                                                                                                           |
| AC54 | the practice screen                                         | it renders                         | the header carries a `how-to` toggle; the instructions panel is closed by default and opens with an `h2` heading plus at least four numbered steps, and the button label flips between "How to Use" and "Close"            |
| AC55 | the header control row                                      | it renders at any width            | the row never wraps (`flex-wrap: nowrap`), the controls scale with the viewport through `clamp()` sizing and short labels under 480px, and the active mode pill's 4px ring stays unclipped                                 |
| AC56 | a long word at the adult's largest size on a 390px viewport | the practice screen renders        | the word stays on one line — the font shrinks to fit instead of wrapping (`fitSizes`/`firstFit` are pure, unit-tested helpers; Playwright asserts one line at 390px and 1024px)                                            |
| AC57 | the viewport is 480px or narrower                           | the header renders                 | the word-list toggle shows a word, not a bare count — `Patterns` in sound-pattern mode and `Levels` in bee mode — and the header row still fits one line at 360px                                                          |
| AC58 | the pattern panel is open                                   | a pattern is ticked or unticked    | the panel keeps its scroll position (and the page does not jump to the top); the ticked row stays where the grown-up left it                                                                                               |
| AC59 | a run starts                                                | the session is built               | the words are drawn in a fresh random order — two runs over the same selection differ in order, and the shuffle is a permutation (every word appears exactly once)                                                         |

## 4. Edge cases and refusals

- An eight-letter word (`alphabet`) must not push the verdicts below the fold at 1024x768.
- Bee mode keeps its dictation rules: word hidden, spoken once on arrival, `Show word` peek, no size buttons.
- The pattern panel starts **closed**; opening it must not restart the run.
- Celebration overlay still fires at every tenth right answer, not just the first.
- The picker panel uses `<details>`/`hidden` rather than a modal dialog — no focus trap needed for a grown-up screen.
- `localStorage` selection wins over the default: only a _first_ run gets the five short vowels.

## 5. Test map

A row appears here in the same PR as its test.

| Criterion | Test file                                     | Test name                                                                                                       | Status |
| --------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| AC35      | `src/layout.test.ts`                          | AC35 — a fresh load opens a short-vowel run                                                                     | green  |
| AC36      | `src/layout.test.ts`                          | AC36 — the header carries the mode and word-list toggles                                                        | green  |
| AC37      | `src/layout.test.ts`                          | AC37 — bee mode is reachable from a plain load                                                                  | green  |
| AC38      | `src/layout.test.ts`                          | AC38 — the word sits in the framed box before the verdicts                                                      | green  |
| AC39      | `src/layout.test.ts`                          | AC39 — the verdict pair fills the pad, enabled and two columns                                                  | green  |
| AC40      | `src/layout.test.ts`                          | AC40 — the stylesheet carries the maths palette and the font                                                    | green  |
| AC41      | `src/layout.test.ts`                          | AC41 — bee practice hides the word and drops the size controls                                                  | green  |
| AC42      | `src/layout.test.ts`                          | AC42 — every test id the browser suites need still renders                                                      | green  |
| AC43      | `src/layout.test.ts`                          | AC43 — the verdict pad stays two columns under 600px                                                            | green  |
| AC44      | `src/layout.test.ts`                          | AC44 — unticking everything does not restart the run                                                            | green  |
| AC45      | `src/layout.test.ts`                          | AC45 — the title is the maths scale and centred                                                                 | green  |
| AC46      | `src/layout.test.ts`                          | AC46 — the active mode pill ring is not clipped                                                                 | green  |
| AC47      | `src/layout.test.ts`                          | AC47 — the bee peek button is double height                                                                     | green  |
| AC48      | `src/layout.test.ts`                          | AC48 — the footer carries the copyright line                                                                    | green  |
| AC49      | `src/layout.test.ts`                          | AC49 — the party track mirrors the maths game                                                                   | green  |
| AC50      | `src/layout.test.ts`                          | AC50 — the party steps are centred with or without the mascot                                                   | green  |
| AC51      | `src/layout.test.ts`                          | AC51 — the word card is not bold                                                                                | green  |
| AC52      | `src/layout.test.ts`                          | AC52 — the gap above hear-it matches the gap below                                                              | green  |
| AC53      | `src/layout.test.ts`                          | AC53 — the practice screen has no change-patterns link                                                          | green  |
| AC54      | `src/layout.test.ts`                          | AC54 — the How to Use toggle opens a numbered instructions panel                                                | green  |
| AC55      | `src/layout.test.ts`                          | AC55 — the header row never wraps and keeps the mode ring                                                       | green  |
| AC56      | `src/wordFit.test.ts`, `e2e/practice.spec.ts` | AC56 — the shrink ramp; every word one line at 390px; the box stays inside its card at 1024px; bee peek re-fits | green  |
| AC57      | `src/layout.test.ts`                          | AC57 — the short word-list label names the mode                                                                 | green  |
| AC58      | `src/app.test.ts`                             | AC58 — ticking a pattern keeps the panel scroll position                                                        | green  |
| AC59      | `src/engine.test.ts`                          | AC59 — each run shuffles the word order                                                                         | green  |

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

## 8. Amendments after the first look (2026-10-23)

Dave reviewed the preview build and named five defects. Each is now an acceptance criterion
(AC45–AC49) rather than a styling opinion, so it cannot silently regress:

| #   | What he saw                                               | Cause                                                                                                                            | Fix  |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | the Spelling bee header is the wrong size and not centred | `.title` was 1.4rem with no centring, while the maths `h1` is 2.5rem                                                             | AC45 |
| 2   | the highlight around the active mode pill is cut off      | `.mode-bar { overflow: hidden }` clipped the 4px `box-shadow` ring                                                               | AC46 |
| 3   | `Show word` is too small in bee mode                      | it reused the header pill class                                                                                                  | AC47 |
| 4   | the footer is missing                                     | the practice footer held only the _Change patterns_ link                                                                         | AC48 |
| 5   | Path to the Party does not match the maths page           | PLM drew an 11-column mini-grid; the maths page draws a panel with two rows of five, a mascot, a goal 🎉 and a solved/total line | AC49 |

Copied from `simpleKindergartenAdditionWebpage/src/style.css` for AC49 (values, not vibes):
`.progress-area` white / 15px radius / `0 5px 15px rgba(0,0,0,.1)` / 15px padding; `.goal-track` flex,
`gap:6px`, 10px padding, `#f8f9fa`, 15px radius; `.goal-steps-wrapper` column, `gap:4px`; `.goal-steps`
flex centred, `gap:5px`; `.step` 35×35, 8px radius, `#e0e0e0`, `#7f8c8d`, bold; `.step.filled`
`linear-gradient(135deg,#4ecdc4,#ff6b6b)` with white text and `0 2px 8px rgba(78,205,196,.4)`;
`.mascot` 2.5rem with the `bounce` animation; `.goal-end` 2.5rem. Footer per maths: `margin-top:20px`,
teal, 1.2rem.

## 9. Amendments after the second look (2026-10-23)

| #   | What Dave saw                                         | Cause                                                                                     | Fix  |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| 1   | the scoring numbers are not centred                   | `.goal-track { justify-content: space-between }` pinning the rows between mascot and goal | AC50 |
| 2   | words are bold in Sound patterns                      | `.card { font-weight: 700 }`                                                              | AC51 |
| 3   | too much space above _hear it_                        | the empty `.flash-slot` reserved `min-height: 2.2rem`                                     | AC52 |
| 4   | the _Change patterns_ link at the bottom is redundant | the header `pattern-toggle` already opens the list                                        | AC53 |

## 10. Amendments after merge (2026-10-23, post-#24)

| #   | Ask                                              | Detail                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | a _How to Use_ button like the maths page (AC54) | The maths page toggles an instructions card from a header pill whose label flips **How to Use → Close**. Same shape here: a closed-by-default panel with an `h2` and numbered steps a grown-up can read in ten seconds. It must not push the header onto a second line.                                                 |
| 2   | the header row must never wrap (AC55)            | `.header-controls` is `flex-wrap: wrap` today, so adding a third control wraps it on a phone. Requires `nowrap`, `clamp()`-based sizing, and short labels under 480px — while the active mode pill's 4px ring stays visible (no `overflow: hidden` on any ancestor).                                                    |
| 3   | the word must stay on one line (AC56)            | An adult can raise the size to 20rem; on a 390px phone a long word then wraps to two lines. The card gets `white-space: nowrap`, and after render (and on resize) the app steps the font down until the word fits, instead of letting it wrap. The shrink rule is a pure helper so it can be unit-tested without jsdom. |

## 11. Amendments from real-device use (2026-10-23)

Dave tried the word list on Edge for Android and found three problems. All three are behavioural, not
cosmetic, so they are criteria rather than polish.

| #   | What he saw                                       | Cause                                                                                                                      | Fix  |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | the word-list button has no label on mobile       | the short label is derived from the text after `·`, i.e. just the count — at ≤480px the button renders `5`, 24px wide      | AC57 |
| 2   | ticking a pattern throws the list back to the top | every change re-renders the whole app, discarding the panel's scroll position                                              | AC58 |
| 3   | the same words recur in the same order            | `buildDictionary` sorts alphabetically and `createSession` copies the array verbatim, so every run starts at the same word | AC59 |
