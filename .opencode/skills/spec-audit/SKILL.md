---
name: spec-audit
description: Use before opening or merging a PR, and whenever a test or a criterion is added, renamed or removed. Runs the deterministic spec-to-test audit and classifies each finding.
license: MIT
compatibility: opencode
metadata:
  stage: core
  opencode/slash: 'true'
---

# Spec audit

`verify:behaviour` asks *does it work*. This asks *is it in the spec, and is the spec
actually tested*. Run it before every PR, and after any change to `specs/` or to a test
name — those are exactly the changes where the map silently drifts.

## Run

```
npm run spec:audit              # exit 1 on any FAIL
npm run spec:audit -- --json    # machine-readable, for CI
npm run spec:audit -- --base=HEAD~3
```

Five checks: `uncovered`, `orphaned`, `mislabelled`, `stale-refs`, `diff-scope`.

## Classify, don't paper over

Every finding is one of four things, and saying which is the whole job:

| Finding | Usual cause | Right fix |
|---|---|---|
| criterion unmapped | nobody wrote the test yet | map it to `(step N)` **pending**, or say it is unbuilt — never invent a green row |
| test names an unknown id | typo, or the criterion was renamed | fix the test name, or restore the criterion |
| mapped file names no criterion | the test exists but is unnamed | rename the test to carry the id |
| map points at the wrong file | the test moved | repoint the row |
| `npm run X` unknown | a script was renamed | fix the reference |

## Never

- Never delete a criterion to make the audit pass.
- Never mark a row `green` for a test that does not exist.
- Never rename a test to a *different* criterion id to silence a failure; if the test covers
  something new, that needs a criterion first.

## After it passes

Put the audit output (or "clean") in the PR body. Then `npm test`, `npm run validate:bank`,
`npm run verify:behaviour`.
