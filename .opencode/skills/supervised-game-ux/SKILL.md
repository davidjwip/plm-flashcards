---
name: supervised-game-ux
description: Use when building any screen of the pronunciation game. Constraints for a five-year-old reading aloud while an adult presses the verdict buttons, on an iPad, in either orientation.
license: MIT
compatibility: opencode
metadata:
  stage: ui
---

# The child reads; the adult judges

Two people use one screen. The child reads the word; the adult's hands do the
pressing. Every design decision follows from that.

## Hard constraints

- **Nothing on screen requires the child to read an instruction.** The word card
  is the only text that matters to the child; everything else is for the adult.
- **Verdict buttons are the biggest things on screen** — `✓ Got it` and
  `✗ Not yet`, at least 96 px tall, side by side, colour-coded and worded
  differently (colour alone fails a colour-blind adult).
- **No timers, no auto-advance.** The word changes only when a human presses.
  This is the difference between a practice game and a test.
- **The word is huge.** `clamp(3.5rem, 18vw, 8rem)`, centred, no truncation.
- **One decision at a time.** No menus, counters or settings competing with the
  word while a run is in progress.
- **Both orientations**, no scrolling during a run.
- **"Hear it" is a hint, not the prompt** — the child reads first, the hint
  exists for when they are stuck.
- **Celebration is brief and non-blocking**: it must not cover the word or need
  dismissing. It fires once on a milestone, not while the score sits on one.
- **Offline** after first load; no off-origin requests.

## Testing UI

Playwright against the built app. Assert on `data-testid`, never on CSS classes
or copy. Speech is stubbed or ignored in tests — assert the button exists and the
run advances, never that sound was audible.
