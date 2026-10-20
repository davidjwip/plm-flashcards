---
description: Write ONE failing test for an acceptance criterion (RED)
agent: build
---

Criterion: $ARGUMENTS

Do exactly this, in the `tdd-loop` skill's RED step:

1. Read the criterion's row in `specs/v1.md`. Quote it back verbatim so we agree
   on what is being tested. If you cannot find it, stop and say so.
2. Write one test whose name starts with the criterion ID, in the file the test
   map names (or the nearest sibling `src/<area>.test.ts`).
3. Run `npx vitest run -t "$ARGUMENTS"` and paste the output.
4. Confirm the failure is for the right reason — not a missing import, not a typo
   in the test.
5. Stop. Do not touch any implementation file. Do not start the next criterion.

If the criterion cannot be tested without a real browser, say so, and put the
test in `e2e/` instead — then run `npm run e2e -- --grep "$ARGUMENTS"`.
