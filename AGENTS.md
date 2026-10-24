# AGENTS.md — sound-pattern-practice

Read this before touching anything in this repo.

## The one rule

**No code without an approved spec.**

- Every behaviour lives in `specs/` first, with acceptance criteria written as
  `Given / When / Then`.
- Every acceptance criterion gets a test that fails **before** it passes. A
  commit may not contain implementation code without the failing test that
  preceded it in an earlier or same commit.
- A spec is _approved_ only when Dave says so in the project thread. "The agent
  thinks it's clear" is not approval. Silence is not approval.

## Test-first loop

1. **RED** — write the smallest test expressing one acceptance criterion. Run it.
   It must fail for the right reason. Paste the failure output in the PR body.
2. **GREEN** — smallest change that makes it pass. Run the whole suite.
3. **REFACTOR** — clean up with the suite still green.
4. Repeat per criterion. One commit per loop: `test(<area>): <criterion>`.

Never: write implementation then back-fill tests; skip the failing run; mark a
criterion done without a row in the feature's test map.

A **spec-only** branch must still map its new criteria, or `spec-audit` fails them as
uncovered. Map each one to `(step N)` with status `pending` — the audit reports it as
pending, not failed — and repoint the row at the real test file as that step lands.

## Definition of done (per PR)

- [ ] every changed behaviour has a criterion in `specs/`
- [ ] test map updated (criterion → test file → test name)
- [ ] `npm test` green — output pasted in the PR body, not summarised
- [ ] `npm run e2e` green for the affected flows (Playwright, chromium)
- [ ] `npm run validate:bank` green for any word-bank change
- [ ] no new dependency without an entry in `specs/decisions.md` (what, why,
      what we rejected)
- [ ] `npm run spec:audit` green, or its findings explained in the PR body
- [ ] `npm run verify:behaviour` green for any change that touches the game flow,
      with the `verify/<stamp>/` path in the PR body
- [ ] guardrails below hold

## Stack

Vite + TypeScript, no UI framework, vanilla DOM. Vitest for logic, Playwright
for UI. Static build to `dist/`, deployed to GitHub Pages by Actions (Cloudflare
Pages later). Layering mirrors Dave's maths game: a pure engine with no DOM, a
thin rendering layer, tests against both.

The product is a **supervised** pronunciation game: the grown-up picks sound
patterns, the app builds the word set, the child reads each word aloud and the
grown-up presses got-it / not-yet. No timers, no self-marking, no child data.

## Commands

| command                    | does                                                                          |
| -------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`              | dev server on :5173                                                           |
| `npm test`                 | Vitest unit + logic                                                           |
| `npm run e2e`              | Playwright chromium                                                           |
| `npm run validate:bank`    | word bank: tags exist, no duplicates, plain words, no dead patterns           |
| `npm run guardrail:scan`   | fails if a tracked file contains an email, private IP or token                |
| `npm run verify:behaviour` | drives the built game in Chromium, screenshots every step, prints what it saw |
| `npm run spec:audit`       | checks every criterion has a test and every test names a real criterion       |
| `npm run format`           | prettier                                                                      |
| `npm run build`            | static build to `dist/`                                                       |

## Tooling layout

- `.opencode/skills/` — on-demand know-how: `tdd-loop`, `word-bank`,
  `audio-pipeline`, `supervised-game-ux`, `spec-audit`, `verify-behaviour`. Load the relevant
  one before starting.
- `.opencode/commands/` — `/red <AC>`, `/green <AC>`, `/audit`, invoked inside the
  opencode TUI. (Headless `opencode run --command` errors in 1.19.3 — a client
  bug, so these are interactive conveniences; the loop itself lives in the
  `tdd-loop` skill, which loads headless.)
- `opencode.json` — agents, models, permissions. `formatter: true` (prettier on
  write), and **bash is deny-by-default**: only the test, build, format and
  local-git commands are allowed. In a headless run "ask" is effectively "allow",
  so anything not explicitly permitted is refused.

## Git workflow

- `main` is never pushed to directly. One branch per change, one pull request
  per branch, reviewed and merged by Dave.
- **One branch per change, created fresh from `main` after the previous PR
  merges.** Never continue work on a merged branch, never stack a second change
  on top of an open PR.
- Branch names: `spec/<slug>` for spec-only work, `feat/<slug>` for a feature,
  `fix/<slug>` for a defect, `chore/<slug>` for tooling.
- Agents may commit on a branch but may **not** push: `git push` is denied in
  `opencode.json`, so the agent that wrote the code is never the one that
  publishes it.
- A PR body carries the failing-test output and the passing-test output, pasted,
  not summarised.

## Guardrails — public repo, non-negotiable

1. **No PLM book content.** No scans, screenshots, page images, PDFs. Only our
   own word bank plus the pattern _sequence_ as facts about the method.
2. **No child-identifying data.** No names, school, class, photos. A class word
   list lives in `localStorage` on the device only — never in a commit, fixture,
   log, screenshot or error string.
3. **No secrets.** No tokens, calendar ids, homelab addresses. `.env` is denied
   to agents by config; an agent must never ask for one.
4. **Test fixtures are invented**, not real class content.
