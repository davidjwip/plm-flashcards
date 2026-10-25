import { describe, expect, it } from 'vitest';
import { BEE_ROUND, NONSENSE_TAG, beeDictionary, beeRound, beeWords, nonsenseWords } from './bee';

const deck = {
  starters: ['cat', 'apple', 'sun'],
  movers: ['dog', 'elephant', 'sun'],
};

/**
 * Deterministic RNG for the nonsense-word assertions. xorshift, so there are no long
 * digit literals — the guardrail scan treats those as phone numbers in a public repo.
 */
function seeded(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000) / 1000;
  };
}

describe('spelling bee deck', () => {
  it('AC26 — a bee round only uses words from the chosen levels', () => {
    expect(beeWords(deck, { starters: false, movers: true, nonsense: false, l2: false })).toEqual([
      'dog',
      'elephant',
      'sun',
    ]);
    expect(beeWords(deck, { starters: true, movers: false, nonsense: false, l2: false })).toEqual([
      'apple',
      'cat',
      'sun',
    ]);
    expect(beeWords(deck, { starters: true, movers: true, nonsense: false, l2: false })).toEqual([
      'apple',
      'cat',
      'dog',
      'elephant',
      'sun',
    ]);
  });

  it('AC27 — with no level chosen there are no words at all', () => {
    const none = { starters: false, movers: false, nonsense: false, l2: false };
    expect(beeWords(deck, none)).toEqual([]);
    expect(beeDictionary(deck, none, { avoid: new Set(), rng: seeded(1) })).toEqual([]);
  });

  it('AC28 — a round is ten words, never repeating one', () => {
    const many = Array.from({ length: 25 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    const round = beeRound(
      many.map((word) => ({ word, patterns: ['bee'] })),
      seeded(7),
    );
    expect(round).toHaveLength(BEE_ROUND);
    expect(new Set(round.map((w) => w.word)).size).toBe(BEE_ROUND);
  });

  it('AC66 — Level 2 draws exactly the supplied set, not the Cambridge deck', () => {
    const mixed = {
      starters: ['stamp', 'cake', 'help', 'armchair', 'cat'],
      movers: ['shrimp', 'night', 'about', 'strawberry', 'restaurant', 'have', 'give', 'banana'],
    };
    // Coverage happens upstream, where the bank tags are known. Once a word is in
    // the Level 2 set it is the bee's real-word source, in bank order.
    const l2Words = ['about', 'banana', 'cat', 'have', 'help', 'shrimp', 'stamp'].map((word) => ({
      word,
      patterns: ['a'],
    }));

    const l2 = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: false, l2: true },
      { l2Words, rng: seeded(1) },
    );
    expect(l2.map((w) => w.word)).toEqual(l2Words.map((w) => w.word));
    for (const word of ['armchair', 'cake', 'night', 'strawberry', 'restaurant', 'give']) {
      expect(
        l2.map((w) => w.word),
        `${word} is not in the Level 2 set`,
      ).not.toContain(word);
    }
    for (const word of l2) {
      expect(word.patterns).toEqual(['bee']);
    }

    const all = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: false, l2: false },
      { avoid: new Set(), rng: seeded(1) },
    );
    expect(all.map((w) => w.word)).toEqual([
      'about',
      'armchair',
      'banana',
      'cake',
      'cat',
      'give',
      'have',
      'help',
      'night',
      'restaurant',
      'shrimp',
      'stamp',
      'strawberry',
    ]);
  });

  it('AC66 — the Level 2 set is the authority, so ghost-e words such as have stay in', () => {
    const mixed = {
      starters: ['have', 'give', 'see', 'food', 'loud', 'stamp'],
      movers: [],
    };
    const l2Words = [
      { word: 'food', patterns: ['oo'] },
      { word: 'give', patterns: ['ghost_e'] },
      { word: 'have', patterns: ['ghost_e'] },
      { word: 'loud', patterns: ['ou'] },
      { word: 'see', patterns: ['ee'] },
      { word: 'stamp', patterns: ['st-', '-mp'] },
    ];

    const l2 = beeDictionary(
      mixed,
      { starters: true, movers: false, nonsense: false, l2: true },
      { l2Words, rng: seeded(1) },
    );
    // Deliberate reversal: the bee used to filter the Cambridge deck by spelling,
    // so ghost e (`have`, `give`) could not be proved and was excluded. Level 2 is
    // now the bank's curated set, and that list is the authority: if it says a
    // word is Level 2, the bee draws it.
    expect(l2.map((w) => w.word)).toEqual(['food', 'give', 'have', 'loud', 'see', 'stamp']);
    for (const word of ['have', 'give']) {
      expect(
        l2.map((w) => w.word),
        `${word} stays in`,
      ).toContain(word);
    }
  });

  it('AC66 — the Level 2 set replaces the Cambridge deck word for word', () => {
    const mixed = {
      starters: ['armchair', 'strawberry', 'cat'],
      movers: ['stamp'],
    };
    const l2Words = [
      { word: 'cat', patterns: ['a'] },
      { word: 'have', patterns: ['ghost_e'] },
      { word: 'stamp', patterns: ['st-', '-mp'] },
    ];

    const deckWords = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: false, l2: true },
      { l2Words, rng: seeded(1) },
    ).map((w) => w.word);

    for (const word of ['cat', 'stamp', 'have']) {
      expect(deckWords, `${word} is drawn from the Level 2 set`).toContain(word);
    }
    for (const word of ['armchair', 'strawberry']) {
      expect(deckWords, `${word} is not a Level 2 source`).not.toContain(word);
    }
  });

  it('AC66 — Level 2 never appends nonsense words', () => {
    const mixed = {
      starters: ['stamp', 'cake', 'help'],
      movers: ['shrimp', 'night', 'about'],
    };
    const l2Words = ['about', 'help', 'shrimp', 'stamp'].map((word) => ({
      word,
      patterns: ['a'],
    }));

    const dict = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: true, l2: true },
      { l2Words, rng: seeded(1) },
    );
    // A Level 2 round is dictated bank words, not pseudo-words: the nonsense box
    // defaults to true and is disabled while Level 2 is on, so it must not append.
    expect(dict.map((w) => w.word)).toEqual(l2Words.map((w) => w.word));
    expect(dict.filter((w) => w.patterns.includes(NONSENSE_TAG))).toEqual([]);
    for (const word of dict) {
      expect(word.patterns).toEqual(['bee']);
    }
  });
});

describe('nonsense words', () => {
  it('AC29 — nonsense words are plausible decodable non-words, never a real word', () => {
    const avoid = new Set([...deck.starters, ...deck.movers]);
    const made = nonsenseWords(40, avoid, seeded(42));
    expect(made).toHaveLength(40);
    for (const w of made) {
      expect(w).toMatch(/^[a-z]{3,9}$/);
      expect(avoid.has(w)).toBe(false);
      // onset + rime: a consonant cluster, then a vowel, i.e. something a child can sound out
      expect(w).toMatch(/^[bcdfghjklmnpqrstvwxyz]*[aeiou][a-z]{0,4}$/);
    }
    expect(new Set(made).size).toBe(40);
  });

  it('AC30 — a nonsense word is tagged so the screen can say so', () => {
    const dict = beeDictionary(
      deck,
      { starters: true, movers: true, nonsense: true, l2: false },
      { avoid: new Set(), rng: seeded(3) },
    );
    const nonsense = dict.filter((w) => w.patterns.includes(NONSENSE_TAG));
    expect(nonsense.length).toBeGreaterThan(0);
    const real = dict.filter((w) => w.patterns.includes('bee'));
    expect(real.map((w) => w.word)).toEqual(['apple', 'cat', 'dog', 'elephant', 'sun']);
  });
});
