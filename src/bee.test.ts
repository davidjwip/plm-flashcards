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
    expect(beeDictionary(deck, none, new Set(), seeded(1))).toEqual([]);
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

  it('AC66 — Level 2 keeps only words the spelling proves are L2', () => {
    const mixed = {
      starters: ['stamp', 'cake', 'help'],
      movers: ['shrimp', 'night', 'about'],
    };

    const l2 = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: false, l2: true },
      new Set(),
      seeded(1),
    );
    expect(l2.map((w) => w.word)).toEqual(['help', 'shrimp', 'stamp']);

    const all = beeDictionary(
      mixed,
      { starters: true, movers: true, nonsense: false, l2: false },
      new Set(),
      seeded(1),
    );
    expect(all.map((w) => w.word)).toEqual(['about', 'cake', 'help', 'night', 'shrimp', 'stamp']);
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
      new Set(),
      seeded(3),
    );
    const nonsense = dict.filter((w) => w.patterns.includes(NONSENSE_TAG));
    expect(nonsense.length).toBeGreaterThan(0);
    const real = dict.filter((w) => w.patterns.includes('bee'));
    expect(real.map((w) => w.word)).toEqual(['apple', 'cat', 'dog', 'elephant', 'sun']);
  });
});
