# UAT → main pipeline — spec

Status: approved by Dave 2026-10-29 (asked for the maths pattern to be mirrored).
Owner: Dave approves; agent drafts.

## 1. Problem

The maths game has a rehearsed release path — a `UAT` integration branch, a preview
hostname, branch rulesets and a gate that must be green — and the literacy app has none.
`plm-flashcards` pushes straight to `main`, and `main` is what children see. One bad word
bank or one broken build reaches `spelling.zt489.com` with nobody having looked at it first.

## 2. Behaviour

| ID  | Behaviour |
| --- | --------- |
| B1  | Every change lands on `UAT` first, through a pull request, with the gate green. |
| B2  | `main` accepts merges only from this repository's `UAT` branch, so production is always a thing that was on UAT and was looked at. |
| B3  | `UAT` is served at `spelling-uat.zt489.com`, `main` at `spelling.zt489.com`, both by Cloudflare Pages from the same repository. |
| B4  | The gate is the same one the laptop runs: tests with coverage thresholds, the word-bank validator, the guardrail scan, the build and the spec audit. |
| B5  | Browser evidence (e2e + behavioural screenshots) is attached to the PR but is not a required check, so a flaky chromium run cannot block a merge. |
| B6  | Neither branch can be deleted or force-pushed by anyone, including the agent. |
| B7  | Approvals are not required: one human account cannot approve its own pull request, so a required review would deadlock every change. |

## 3. Acceptance criteria

Each criterion names the flow rule in `scripts/check-branch-flow.sh`, which runs as the
`flow` job on any pull request into `main`.

| ID  | Given | When | Then |
| --- | ----- | ---- | ---- |
| AC1 | a base of `UAT` | any pull request is opened into it | the flow rule allows it; only the gate decides |
| AC2 | a base of `main` | `UAT` from this repository is opened into it | the flow rule allows the release |
| AC3 | a base of `main` | a feature branch is opened into it | the flow rule refuses and names `UAT` as the route |
| AC4 | a base of `main` | a branch from a fork is opened into it | the flow rule refuses and says the source is a fork |
| AC5 | a base of `main` | the head repository cannot be resolved | the flow rule refuses rather than assuming provenance |
| AC6 | the flow script is invoked | `BASE` or `HEAD` is unset | it exits 2 and names the missing variables |

## 4. Edge cases and refusals

- A pull request into a branch that does not exist yet, or a push to `UAT` — the `gates`
  job runs, the `flow` job is skipped, because only `main` carries a source rule.
- A direct push to either protected branch — refused by the ruleset, not by the workflow.
- The Cloudflare Pages GitHub App losing access to the repository — deployments stop while
  pushes still succeed; checked by verifying a `github:push` deployment for the merge commit.

## 5. Test map

| Criterion | Test file                | Test name                                                             | Status |
| --------- | ------------------------ | --------------------------------------------------------------------- | ------ |
| AC1       | `src/branchFlow.test.ts` | `AC1 allows any pull request into UAT`                                | green  |
| AC2       | `src/branchFlow.test.ts` | `AC2 allows UAT to main from this repository`                          | green  |
| AC3       | `src/branchFlow.test.ts` | `AC3 refuses a feature branch heading for main and names UAT …`        | green  |
| AC4       | `src/branchFlow.test.ts` | `AC4 refuses a fork and says the source is a fork`                     | green  |
| AC5       | `src/branchFlow.test.ts` | `AC5 refuses when provenance cannot be proved`                         | green  |
| AC6       | `src/branchFlow.test.ts` | `AC6 exits 2 when BASE or HEAD is missing`                             | green  |

## 6. Decisions

- **Mirror the maths pipeline rather than invent one.** Same branch names, same ruleset
  shape, same `pr-gates.yml` job names (`gates`, `flow`), so one habit covers both repos
  and the landing script's expectations transfer.
- **Browser evidence is a separate, non-required job.** The maths gate has no e2e for
  exactly this reason; a required check that flakes teaches the owner to bypass it.
- **No required approvals.** GitHub forbids approving your own pull request; with one
  human account a review requirement is a deadlock, not a control.
- **`ci.yml` is replaced by `pr-gates.yml`.** Two workflows running the same suite on the
  same event is double the minutes for one answer.

## 7. Open questions

None. The Cloudflare project name (`plm-uat`), hostname (`spelling-uat.zt489.com`) and
production branch (`UAT`) were specified by Dave on 2026-10-29.
