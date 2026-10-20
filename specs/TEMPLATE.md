# <Feature name> — spec

Status: draft | in review | approved (date, by whom)
Owner: Dave approves; agent drafts.
Non-goals are as binding as goals.

## 1. Problem

One paragraph. Who is this for and what can they not do today.

## 2. Behaviour

Each behaviour gets an ID. No ID, no implementation.

| ID  | Behaviour |
| --- | --------- |
| B1  | …         |
| B2  | …         |

## 3. Acceptance criteria

Written so a test can be derived mechanically. One criterion per row, each with
a stable ID that appears in the test name.

| ID  | Given | When | Then |
| --- | ----- | ---- | ---- |
| AC1 | …     | …    | …    |
| AC2 | …     | …    | …    |

## 4. Edge cases and refusals

Empty list, duplicate word, offline, audio missing, unsupported browser,
paste-in list with punctuation, 4½-year-old mashing the keyboard.

## 5. Test map

Filled in as tests land. A PR that adds a test but not a row here is incomplete.

| Criterion | Test file       | Test name  | Status      |
| --------- | --------------- | ---------- | ----------- |
| AC1       | `src/x.test.ts` | `x does y` | red / green |

## 6. Decisions

Anything arguable, with the alternative rejected and why. Copy into
`specs/decisions.md` once approved.

## 7. Open questions

Numbered, each with the default if Dave doesn't answer.
