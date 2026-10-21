---
name: verify-behaviour
description: Use after any change that touches the game flow, before reporting it done. Drives the built app in Chromium, screenshots every step, and compares what it saw against plan.md.
license: MIT
compatibility: opencode
metadata:
  stage: core
  opencode/slash: 'true'
---

# Behavioural verification

E2E asserts what we thought to assert. This loop *observes* the app and leaves
evidence a human can look at. Run it whenever the change affects what a child or
grown-up sees or does — not for pure refactors, styling-only tweaks, or word-bank
data edits.

## Run it

```
npm run verify:behaviour                    # builds, serves, drives, screenshots
node scripts/verify-behaviour.mjs --pattern=oa   # one pattern only
node scripts/verify-behaviour.mjs --headful      # watch it happen
```

It writes `verify/<stamp>/report.json` and numbered PNGs, one per step.

## Judge it, don't just pass it

1. Read every row of the step table. PASS means *the step behaved*, not that the
   app is right.
2. **Open the screenshots.** Check: the word is large and legible, exactly one
   word is on screen, no dev cruft, the celebration or flash never covers the
   word, nothing is clipped at 1280×900.
3. Compare against `plan.md` and `specs/v1.md`: does what you see match what was
   promised for this change?
4. A screenshot that looks wrong while every assertion passed is a **failure**.
   Say so, with the file name.

## Report, then fix deliberately

- Report what you saw and the `verify/<stamp>/` path *before* changing anything.
- Fixes go through the normal loop: failing test first (RED), then GREEN.
- Never adjust the harness to turn a red step green. If the harness itself is
  wrong, fix it in its own commit, with the reason in the message.
- Put the evidence path in the PR body beside the test output.

## What this cannot see

Headless Chromium at 1280×900 judges layout and flow, not sound, not touch, not
a real iPad. When you did not verify something, say which — silence reads as
"verified".
