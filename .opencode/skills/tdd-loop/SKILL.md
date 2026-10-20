---
name: tdd-loop
description: Use for every behaviour change in this repo. Runs the RED, GREEN, REFACTOR loop one acceptance criterion at a time, with pasted test output as evidence.
license: MIT
compatibility: opencode
metadata:
  stage: core
  opencode/slash: 'true'
---

# The loop

One acceptance criterion at a time, in this order, no shortcuts.

## 1. RED

1. Pick exactly **one** criterion from `specs/v1.md` (e.g. `AC4`). If it has no
   ID, stop — the spec is wrong, fix the spec first.
2. Write **one** test whose name contains the ID: `it('AC4 — tiles are the
word's graphemes', ...)`.
3. Put it in the file the test map says, or the nearest sensible sibling
   (`src/<area>.test.ts`).
4. Run it: `npx vitest run -t "AC4"`.
5. **Paste the failure output.** A test that passes before the implementation
   exists is either testing nothing or testing the wrong thing. Fix the test.
6. Touch **no** implementation file in this step.

## 2. GREEN

1. Write the smallest implementation that makes that one test pass. Not the
   general case, not the neighbouring cases, not "while I'm here".
2. Run the **whole** suite: `npm test`. Paste it.
3. If another test broke, that is information: either your change is wrong or an
   existing test needed its criterion changed. Both are decisions for Dave, not
   quiet edits.

## 3. REFACTOR

1. Clean up with the suite green, and only with the suite green.
2. Re-run `npm test` after. Paste it.

## 4. Record

Update the test map row in `specs/v1.md`: criterion → test file → test name →
green. One commit per loop:

```
test(AC4): tiles are the word's graphemes
feat(AC4): segment word into taught graphemes
```

## Refusals

Stop and ask, rather than proceeding, when:

- the criterion is ambiguous or two criteria conflict;
- making the test pass would need a dependency (AGENTS.md requires a
  `specs/decisions.md` entry first);
- the criterion cannot be tested without a real browser — then it belongs in
  `e2e/`, and the test map says so;
- you are tempted to write implementation "ready for" a later criterion. Don't.
  The later criterion gets its own RED.

## What does not count as evidence

- "tests pass" without pasted output
- a test written after the implementation
- a test that asserts on a mock of the thing under test
- `--passWithNoTests` hiding an empty suite
