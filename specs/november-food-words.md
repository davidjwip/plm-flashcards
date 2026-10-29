# November food words — spec

Status: approved by Dave 2026-10-29 ("add the missing words and retag the 4 that exist").
Owner: Dave approves; agent drafts.

## 1. Problem

November's English list (circular 26-27-K053, theme 食物 / Food, 2–27 Nov) is seven
words: **salad, chicken, potato, fish, cheese, rice, milk**. Four are already in the bank
but carry only their consonant tag, so nothing in the app puts them in a vowel set. Three
are absent entirely, which means the app cannot practise the class list at all.

## 2. Behaviour

| ID  | Behaviour |
| --- | --------- |
| B1  | All seven November words are in the bank, so a pattern set that includes their patterns serves them. |
| B2  | A word carries every pattern it demonstrates, in the order the patterns are met reading the word — leading grapheme first, vowel, then ending. A tag is a spelling claim, not a pronunciation claim: `potato` carries `schwa` because its first vowel is a schwa, and carries no `o` because the second is not short. |
| B3  | The four words that already existed are retagged rather than left consonant-only, so their vowels are practisable. |

## 3. Acceptance criteria

| ID  | Given | When | Then |
| --- | ----- | ---- | ---- |
| AC1 | the bank as committed | it is read | every one of the seven November words is present |
| AC2 | a November word | its tags are read | they are exactly the patterns it demonstrates, in reading order |
| AC3 | the retagged bank | the bank validator runs | it exits 0 |

## 4. Edge cases and refusals

- `milk` ends in `-lk`, a cluster the bank already carries at twelve words, so it is not a
  new pattern.
- `potato` gets no `o` tag: its second vowel is the /əʊ/ diphthong, which the catalogue has
  no pattern for, and its first is a schwa. Tagging it `o` would teach the wrong rule.
- `rice` is `i_e` only — the `c` is not a `k` spelling the child has been taught to name.
- No new pattern, so no migration of the picker and no change to `specs/patterns.md`.

## 5. Test map

| Criterion | Test file                  | Test name                                            | Status |
| --------- | -------------------------- | ---------------------------------------------------- | ------ |
| AC1       | `src/novemberFood.test.ts` | `AC1 every November word is in the bank`             | green  |
| AC2       | `src/novemberFood.test.ts` | `AC2 every November word carries the patterns it shows` | green |
| AC3       | `src/novemberFood.test.ts` | `AC3 the retagged bank passes its own validator`      | green  |

## 6. Decisions

- **Retag in place, do not duplicate.** A second copy of `cheese` under a different tag
  would be a duplicate word, which the validator refuses and which splits a set in two.
- **Reading-order tags, not alphabetical.** It is the only ordering rule that survives a
  new word: alphabetical order would put `-lk` before `i` in `milk` and read as noise.
- **No new words beyond the list.** The class list is the input; the bank is not padded.

## 7. Open questions

None.
