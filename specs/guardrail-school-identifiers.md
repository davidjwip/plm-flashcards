# Guardrail scan — school and class identifiers — spec

Status: approved by Dave 2026-10-29 ("513e13a leave as it, but fix the guardrail please").
Owner: Dave approves; agent drafts.

## 1. Problem

`guardrail:scan` catches emails, private IPs, token-shaped strings and 8+ digit runs. It does not
catch the class of thing that actually reached this public repository: a school circular id
(`NN-NN-KNNN`), a kindergarten class code, and the framing "the class list" that turns seven
ordinary food words into a record of one child's classroom.

A bank entry is ordinary data; the provenance around it is not. The scanner must know the difference
by **shape**, not by an enumeration of schools — a scanner that only rejects names someone thought to
list is a scanner that misses the next school.

## 2. Behaviour

| ID  | Behaviour                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | A circular identifier of the form `NN-NN-KNNN` anywhere in a tracked text file is a finding.                                                                                                                                                                                             |
| B2  | A kindergarten class code — a `K`, a digit from 1 to 3, then a capital letter — is a finding. The patterns are constructed so this document does not itself contain a match.                                                                                                             |
| B3  | An optional `scripts/guardrail-denylist.txt` adds plain substrings (one per line, `#` comments) for names and identifiers too specific to be recognised by shape. It is empty by default: adding an entry writes that name into the repo, which is the caller's call, not the scanner's. |
| B4  | The scanner can be pointed at explicit files (`--file <path>`, repeatable) so a test can prove each rule fires without touching the real tree.                                                                                                                                           |
| B5  | Every finding names the file, the line and the rule, and the process exits non-zero. A clean run still prints the count of files scanned.                                                                                                                                                |

## 3. Acceptance criteria

| ID  | Given                                   | When                                 | Then                                                        |
| --- | --------------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| AC1 | a file containing a circular identifier | the scanner is run on that file      | it exits 1 and names the `school circular identifier` rule  |
| AC2 | a file containing a class code          | the scanner is run on that file      | it exits 1 and names the `class code` rule                  |
| AC3 | the repository's own tracked files      | the scanner is run with no arguments | it exits 0                                                  |
| AC4 | an unprefixed benign word list          | the scanner is run on that file      | it exits 0 — the rules must not fire on ordinary vocabulary |
| AC5 | a denylist entry                        | the scanner runs with a denylist holding it | it exits 1 and names the entry it matched |
| AC6 | the scanner                             | it is given an unknown argument, or a named denylist that does not exist | it exits 2 with a message rather than scanning with an empty list |
| AC7 | an identifier written in lowercase, beside other punctuation, or separated by spaces, dots, slashes or underscores | the scanner reads the file | it is still a finding — the rules are shapes, not spellings |
| AC7b | ordinary prose containing a class-code shape inside a word (the word `back2school`) | the scanner reads the file | it exits 0 — the class-code rule is bounded on both sides, deliberately |

## 4. Decisions

- **Shape, not names.** Enumerating schools in a public repo publishes the list it is meant to
  suppress, and any list is incomplete by construction.
- **The denylist is empty by default.** It exists so a specific string can be blocked without a code
  change; leaving it empty is the honest default when the shapes already cover the case.
- **Scanner output is line-based and rule-named**, so a failure says _what_ matched and where, not
  simply that something did.
- **The two shapes are bounded differently, on purpose.** The circular identifier takes any single
  separator, including underscores and spacing, and no word boundaries, because a leak glued into a
  sentence is still a leak. The class code is bounded on both sides: the word `back2school` carries a
  class-code shape inside it, and a scanner that fails on innocent prose gets switched off. The cost — an identifier buried
  inside a longer token is not seen by that rule — is stated in AC7b rather than left implicit.

## 5. Test map

| Criterion | Test file                   | Test name                                                     | Status |
| --------- | --------------------------- | ------------------------------------------------------------- | ------ |
| AC1       | `src/guardrailScan.test.ts` | `AC1 a circular identifier fails the scan and names its rule` | green  |
| AC2       | `src/guardrailScan.test.ts` | `AC2 a class code fails the scan and names its rule`          | green  |
| AC3       | `src/guardrailScan.test.ts` | `AC3 the repository's own tree passes`                        | green  |
| AC4       | `src/guardrailScan.test.ts` | `AC4 ordinary word-bank-shaped text passes`                   | green  |
| AC5       | `src/guardrailScan.test.ts` | `AC5 a denylist entry fails the scan and names it`            | green  |
| AC6       | `src/guardrailScan.test.ts` | `AC6 an unknown argument exits 2 with usage`                  | green  |
| AC6b      | `src/guardrailScan.test.ts` | `AC6b a named denylist that does not exist exits 2 instead of loading nothing` | green |
| AC7       | `src/guardrailScan.test.ts` | `AC7 a lowercase or embedded identifier is still a finding`    | green  |
| AC7a      | `src/guardrailScan.test.ts` | `AC7a an identifier separated by other punctuation is still a finding` | green |
