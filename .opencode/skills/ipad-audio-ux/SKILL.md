---
name: ipad-audio-ux
description: Use when building any screen or interaction. Constraints for a 4½-year-old on an iPad who cannot read, in either orientation, offline.
license: MIT
compatibility: opencode
metadata:
  stage: ui
---

# The child cannot read

Every instruction the child meets is spoken or pictorial. Text on screen is for
the adult and must be visually secondary.

## Hard constraints

- **No reading required.** If a screen needs a sentence to explain it, the screen
  is wrong.
- **Targets ≥ 64 px**, spaced ≥ 16 px apart — a child's aim, not an adult's.
- **Both orientations.** Nothing scrolls during a round; test landscape and
  portrait (AC17).
- **No fail state** in practice modes: a wrong answer is corrected and the round
  continues. Only the bee round scores.
- **No timers** except nothing: the bee round scores by correctness, not speed
  (spec decision 4).
- **Audio is the primary feedback.** Visual states accompany sound; they never
  replace it.
- **Offline.** After first load the app must run with no network (AC18) — service
  worker caches the shell, decks and audio manifest.
- `prefers-reduced-motion` honoured; no autoplaying sound on load.
- No external fonts, no analytics, no requests off-origin (AC19) — the test suite
  asserts this, not a promise.

## Testing UI

Playwright, chromium, mobile viewport. Assert on `data-testid`, never on CSS
classes or copy. Audio in tests: stub the `Audio` element and assert the
`src` requested — do not assert that sound was audible.
