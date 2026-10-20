# AGENTS.md — plm-flashcards

Read this before touching anything in this repo.

## The one rule

**No code without an approved spec.**

- Every behaviour lives in `specs/` first, with acceptance criteria written as
  `Given / When / Then`.
- Every acceptance criterion gets a test that fails **before** it passes. A
  commit may not contain implementation code without the failing test that
  preceded it in an earlier or same commit.
- A spec is *approved* only when Dave says so in the project thread. "The agent
  thinks it's clear" is not approval. Silence is not approval.

## Test-first loop

1. **RED** — write the smallest test expressing one acceptance criterion. Run it.
   It must fail for the right reason. Paste the failure output in the PR body.
2. **GREEN** — smallest change that makes it pass. Run the whole suite.
3. **REFACTOR** — clean up with the suite still green.
4. Repeat per criterion. One commit per loop: `test(<area>): <criterion>`.

Never: write implementation then back-fill tests; skip the failing run; mark a
criterion done without a row in the feature's test map.

## Definition of done (per PR)

- [ ] every changed behaviour has a criterion in `specs/`
- [ ] test map updated (criterion → test file → test name)
- [ ] `npm test` green — output pasted in the PR body, not summarised
- [ ] `npm run e2e` green for the affected flows (Playwright, chromium)
- [ ] `npm run validate:decks` green for any deck touched
- [ ] no new dependency without an entry in `specs/decisions.md` (what, why,
      what we rejected)
- [ ] guardrails below hold

## Stack

Vite + TypeScript, no UI framework, vanilla DOM. Vitest for logic, Playwright
for UI + audio behaviour. Static build to `dist/`, deployed to GitHub Pages by
Actions. Audio is pre-generated (piper, one UK voice) and committed — the same
pronunciation every time matters for a spelling bee.

## Commands

| command | does |
|---|---|
| `npm run dev` | dev server on :5173 |
| `npm test` | Vitest unit + logic |
| `npm run e2e` | Playwright chromium |
| `npm run validate:decks` | every word decodable from patterns already taught at its unit |
| `npm run build` | static build to `dist/` |

## Guardrails — public repo, non-negotiable

1. **No PLM book content.** No scans, screenshots, page images, PDFs. Only our
   own generated decks plus the pattern *sequence* as facts about the method.
2. **No child-identifying data.** No names, school, class, photos. Weekly class
   lists live in `localStorage` on the device only — never in a commit, fixture,
   log, screenshot or error string.
3. **No secrets.** No tokens, calendar ids, homelab addresses. `.env` is denied
   to agents by config; an agent must never ask for one.
4. **Test fixtures are invented**, not real class content.
