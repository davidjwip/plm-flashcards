# REVIEW.md — review passes for this repo

Reviewers (human or agent) run these passes in order and tag every finding with the pass it came from.
Findings do not approve or block a PR on their own: Dave approves, informed by them.

## Pass 1 — Bugs

Logic errors, broken edge cases, off-by-one in slicing or ranges, state that survives when it shouldn't,
races between the engine and the renderer, anything that only works on the happy path.

Ask specifically: what happens with an empty word bank, a one-word set, a pattern with zero matching
words, a double-tap during feedback, a reload mid-session?

## Pass 2 — Security and privacy

- This repo is **public**: no email, private IP, token, hostname or family detail in any tracked file.
  `npm run guardrail:scan` must be green.
- No runtime network calls. This app is a static site with no backend, no analytics, no accounts.
- No child data of any kind is stored, logged or transmitted — not a name, not a score history, nothing.
  The only state is in-memory for the session.

## Pass 3 — Compliance with `specs/`

- Every changed behaviour traces to an acceptance criterion in `specs/`. Name the file and the criterion.
- Every criterion has a row in the feature's test map (criterion → test file → test name).
- The diff does not contain work that `plan.md` did not name. If it does, that is either a missing plan
  update in the same commit, or scope creep to be split out.
- Any new dependency has an entry in `specs/decisions.md`.

## Pass 4 — Fit with the product

A supervised pronunciation game for a child: large targets, one word at a time, audio-first, no timers,
no self-marking, no gamified pressure. Flag anything that drifts toward unsupervised use or
competitive scoring.

## What counts as Important

Reserve it for findings that would break behaviour, leak data, breach a policy, or make the app
unusable for a child. Style, naming and micro-optimisation are nits.

## Cap the nits

At most five nits per review; summarise the rest as a count. Do not report formatting that
`npm run format` already fixes, generated audio under `public/audio/`, or anything CI already enforces.

## Feed back

A finding that comes up twice becomes a line in `AGENTS.md`, in the same PR that fixes it.
