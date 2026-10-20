# plm-flashcards

An offline-first, audio-led practice app for spelling and blending, built around
a phonics pattern sequence (short vowels → vowel teams → r-controlled → schwa).
Static site, no accounts, no backend.

**Status:** pre-v1. `specs/v1.md` is not yet approved, so there is no
implementation here — by design. See `AGENTS.md`.

## The rule

No code without an approved spec, and no behaviour without a test that failed
first. `AGENTS.md` is the contract; `specs/` is where behaviour is argued out
before it is built.

## Guardrails

- No copyrighted book content — no scans, screenshots or page images.
- No child-identifying data — no names, school, class, photos, or class lists.
  Weekly lists live in the browser's local storage and nowhere else.
- No secrets. Ever.

## Commands

```
npm run dev            # dev server on :5173
npm test               # Vitest
npm run e2e            # Playwright, chromium
npm run validate:decks # deck/pattern consistency
npm run build          # static build to dist/
```

## Licence

MIT
