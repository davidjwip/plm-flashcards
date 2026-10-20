---
description: Compare the spec's test map against the tests that actually exist
agent: review
---

Audit the repo for spec drift. Read-only: change nothing.

1. List every criterion in `specs/v1.md` with its test-map row.
2. List every test in `src/**/*.test.ts` and `e2e/**/*.spec.ts` that names a
   criterion ID.
3. Report three lists:
   - **uncovered** — criteria with no test at all
   - **orphaned** — tests naming an ID that the spec does not define
   - **mislabelled** — test-map rows pointing at a file or test that no longer
     exists, or whose status says green while the test does not exist
4. Then run `npm test` and `npm run validate:decks`, and paste both outputs.

Finish with one sentence: is the repo in a state where the next criterion can be
started, and if not, what is in the way.
