---
name: word-bank
description: Use when adding or editing words or patterns in data/wordbank.json. Covers the validator's rules, multi-pattern tagging, and the content-hygiene constraints that keep the repo publishable.
license: MIT
compatibility: opencode
metadata:
  stage: content
---

# The word bank

`data/wordbank.json` is the only content in this app. Two arrays:

```json
{
  "patterns": [{ "id": "ai", "label": "ai (rain)" }],
  "words": [{ "word": "train", "patterns": ["ai", "a"] }]
}
```

## Rules the validator enforces (`npm run validate:bank`)

1. Every `patterns` id is `[a-z_]+`, has a label, and has at least one word —
   a pattern with no words is a dead dropdown option and fails the build.
2. Every word is plain lowercase letters (apostrophes and hyphens allowed).
3. No duplicate words. A word carries **every** pattern it demonstrates
   (`train` = `ai` + `a`), and appears once in the dictionary however many of
   its patterns are selected.
4. Every tag must exist in `patterns`.

## Rules the validator cannot check — they are yours

- **Decodable.** The word really is read with the pattern it is tagged with.
  `said` is not an `ai` word; `great` is not an `ea` word. When unsure, leave it
  out — a wrong word teaches a wrong sound.
- **No proper nouns, no names.**
- **Words are ours.** Invented or ordinary English. Never transcribe a printed
  word list, worksheet, photo or screenshot. The pattern _sequence_ is a fact
  about the method; someone else's word _list_ is not.
- Prefer 6–10 words per pattern so a selection gives a usable session.

## Adding a pattern is two changes

The pattern plus its words, and a sentence in the PR saying which unit teaches
it. Data without its provenance is how a bank drifts into being someone else's
copyrighted list.
