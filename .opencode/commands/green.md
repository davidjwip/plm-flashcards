---
description: Smallest change that makes the named criterion's test pass (GREEN)
agent: build
---

Criterion: $ARGUMENTS

1. Run `npx vitest run -t "$ARGUMENTS"` first. It must be red before you start.
   If it is green, stop — either the test is wrong or the work is already done.
2. Write the smallest implementation that makes that one test pass. No general
   case, no neighbouring criteria, no opportunistic refactors.
3. Run the whole suite: `npm test`. Paste the output.
4. If anything else broke, stop and explain what broke and why. Do not "fix" an
   existing test without saying so.
5. Update the test map row in `specs/v1.md` for this criterion to `green`.
6. Commit as `feat($ARGUMENTS): <what changed>` and stop.
