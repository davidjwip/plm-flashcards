# Sound practice

A supervised pronunciation game for a child learning to read by phonics pattern.
The grown-up picks the sound patterns being taught; the app builds a word set from
them and shows one word at a time, very large. The child reads it aloud, the
grown-up presses **✓ got it** or **✗ not yet**, and the next word appears. Score at
the end, a small celebration every tenth right answer.

Static site, no accounts, no backend, no network calls at runtime.

## Commands

```
npm run dev            # dev server
npm test               # engine tests (Vitest)
npm run e2e            # browser tests against the built app (Playwright)
npm run validate:bank  # word bank: tags, duplicates, dead patterns
npm run guardrail:scan # no emails, private IPs or tokens in tracked files
npm run build          # static build to dist/
```

## How it works

- `data/wordbank.json` — the only content: patterns, and words tagged with the
  patterns they demonstrate. A word may carry several tags (`train` = `ai` + `a`).
- `src/engine.ts` — pure functions: build the dictionary from a selection,
  create a session, record a verdict, decide when to celebrate. No DOM.
- `src/main.ts` — two screens, thin: setup and practice.
- `specs/v1.md` — the spec and its acceptance criteria. `AGENTS.md` — the rules
  the agent works under.

## Rules that matter

- No child-identifying data: no names, school, class, photos, in any commit.
- No book or worksheet content: the word bank is ours. The pattern _sequence_ is
  a fact about the method; someone else's word list is not.
- No timers, no self-marking: this game is supervised by design.

## Licence

MIT
