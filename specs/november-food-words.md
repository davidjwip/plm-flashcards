# Food words — the November bank additions

Status: approved by Dave 2026-10-29 ("add the missing words and retag the 4 that exist").
Owner: Dave approves; agent drafts.

## 1. Problem

Seven food words were wanted in the bank for November practice: **salad, chicken, potato,
fish, cheese, rice, milk**. Four were already present but carried only their consonant tag,
so no vowel set served them; three were absent, so the app could not practise them at all.

Bank data only. Nothing here records where the words came from: no school, class, teacher,
term or circular detail belongs in this public repository (AGENTS.md, guardrails 2 and 4).

## 2. Behaviour

| ID  | Behaviour |
| --- | --------- |
| B1  | All seven words are in the bank, so a pattern set that includes their patterns serves them. |
| B2  | A word carries every pattern it demonstrates, listed in the order the patterns are met reading the word — leading grapheme, vowel, ending. A tag is a spelling claim, not a pronunciation claim. |
| B3  | Words that already existed are retagged rather than duplicated, so their vowels are practisable. |

## 3. Acceptance criteria

| ID  | Given | When | Then |
| --- | ----- | ---- | ---- |
| AC1 | the bank as committed | it is read | all seven words are present |
| AC2 | one of the seven words | its tags are read | they are exactly the patterns it demonstrates, in reading order |
| AC3 | the retagged bank | the bank validator runs | it exits 0 |

## 4. Edge cases and refusals

- `milk` ends in `-lk`, a cluster the bank already carries, so it is not a new pattern.
- `potato` carries `schwa` for its first vowel. Its `a` spells /eɪ/ and its final `o` spells
  /əʊ/; the catalogue has no pattern for either, so no further tag. Tagging it `o` would teach
  the wrong rule, which is how an earlier draft read.
- `chicken` carries `ch`, `i`, `ck`. Its second vowel is the reduced /ɪ/ of the unstressed
  `-en`; that is not the schwa the catalogue teaches (the unstressed `a e i o u` of `about`,
  `away`), and short-i-spelled-`e` is not a pattern either, so it carries no vowel tag for it.
  Recorded here because the decision is a judgement, not a mechanical result.
- `rice` is `i_e` only — the `c` is not a `k` spelling the child has been taught to name.
- **Reading order is a documentation rule enforced by review and by the per-word tests**, not
  by the validator: the validator checks that a tag exists, that words are not duplicated,
  that words are plain lowercase and that no pattern is dead. It does not and should not judge
  tag order — a rule with no mechanical check is stated as such rather than implied.

## 5. Test map

| Criterion | Test file                  | Test name                                            | Status |
| --------- | -------------------------- | ---------------------------------------------------- | ------ |
| AC1       | `src/novemberFood.test.ts` | `AC1 every word is in the bank`                       | green  |
| AC2       | `src/novemberFood.test.ts` | `AC2 every word carries the patterns it shows`        | green  |
| AC3       | `src/novemberFood.test.ts` | `AC3 the retagged bank passes its own validator`      | green  |

AC3 is a regression guard: it was already green before the change (the bank was valid then
too) and cannot go red on this change. Only AC1 and AC2 were seen red first.

## 6. Decisions

- **Retag in place, do not duplicate.** A second copy of `cheese` under another tag is a
  duplicate word, which the validator refuses and which splits a set in two.
- **Reading order, not alphabetical.** It is the only ordering rule that survives a new word;
  alphabetical would put `-lk` before `i` in `milk` and read as noise. Enforcement is review
  plus these tests (see §4).
- **No words beyond the seven.** The list is the input; the bank is not padded.

## 7. Open questions

None.
