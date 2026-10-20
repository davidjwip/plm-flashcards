---
name: deck-authoring
description: Use when adding or editing a word deck. Covers decodability, grapheme segmentation, deck format and the content-hygiene rules that keep the repo publishable.
license: MIT
compatibility: opencode
metadata:
  stage: content
---

# Authoring a deck

A deck is data, and the data has a rule that a machine checks. Read
`specs/patterns.md` first; it is the source of truth for what is taught when.

## Rules

1. **Decodable only.** Every grapheme in a word must belong to a pattern taught
   at or before the deck's unit. `npm run validate:decks` enforces this and fails
   the build. If a word you love fails, the word is wrong, not the rule.
2. **8–12 words per deck.** Fewer is a thin lesson, more is a lost child.
3. **One tap = one tile, and the tiles must spell the word.** Multi-letter
   graphemes are one tile (`ship` → `sh · i · p`, `rain` → `r · ai · n`,
   `night` → `n · igh · t`). A split digraph is **not** merged: the child spells
   all four letters, so `cake` → `c · a · k · e`, with the `a` tile tagged
   `pattern: "a_e"`. The validator enforces `tiles.join('') === word`, which is
   what caught the first draft of this model trying `["c","a_e","k"]`.
4. **No proper nouns, no names.** Ever — that is a child-identity rule wearing a
   deck's clothes.
5. **Words are ours.** Invented or ordinary English words that fit the pattern.
   Never transcribe a word list from printed material, a worksheet, a photo or a
   screenshot. Pattern _order_ is a fact about the method; word _lists_ are not.
6. **Audio is generated, not recorded**, and every built-in word gets a file
   (see the `audio-pipeline` skill).

## Format

`decks/<unit>-<slug>.json`:

```json
{
  "id": "l2-u3-long-i",
  "unit": 3,
  "title": "Long i — i_e, ie, igh",
  "patterns": ["i_e", "ie", "igh"],
  "words": [
    {
      "word": "bike",
      "graphemes": [
        { "text": "b" },
        { "text": "i", "pattern": "i_e" },
        { "text": "k" },
        { "text": "e" }
      ]
    },
    { "word": "night", "graphemes": [{ "text": "n" }, { "text": "igh" }, { "text": "t" }] }
  ]
}
```

`unit` and `patterns` are what the validator reads. The `text` values must concatenate to `word` exactly, and any `pattern` used
must appear in the deck's `patterns` list — the validator checks both.

## Adding a deck is two changes

1. The deck file.
2. A test in `src/decks.test.ts` asserting the validator accepts it **and** that
   it is reachable from the deck picker in teaching order. RED first, as always.

A deck without its test does not merge, even though it is only data.
