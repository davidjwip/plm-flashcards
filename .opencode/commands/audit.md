---
description: Check the spec's test map against the tests that actually exist
agent: review
---

Run the deterministic audit first. Do not do this by hand — the script is the
source of truth and it is what CI can gate on.

```
npm run spec:audit
```

Read every finding. For each one, decide and say which of these it is:

- **the spec is stale** — the behaviour changed and the criterion no longer describes it.
  Fix the criterion, and say what changed.
- **the test is misnamed** — the test exists and covers the criterion, but its name does
  not carry the id. Rename the test to `ACn — …`. That is a one-line fix, and it is the
  usual cause.
- **the criterion is unbuilt** — nothing covers it yet. Either map it to the criterion's
  future test with status `pending`, or leave it uncovered and say so; do not invent a
  passing row for work that does not exist.
- **the map is wrong** — the row points at a file that no longer holds that test. Point it
  at the file that does.

Then run `npm test`, `npm run validate:bank` and `npm run verify:behaviour`, and paste
the three outputs. Change no implementation code: this command is read-only apart from
test names, spec rows and the map.

Finish with one sentence: is the repo in a state where the next criterion can be started,
and if not, what is in the way.
