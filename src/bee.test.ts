import { describe, expect, it } from 'vitest';
import {
  BEE_ROUND,
  NONSENSE_TAG,
  beeDictionary,
  beeRound,
  beeWords,
  nonsenseWords,
} from './bee';

const deck = {
  starters: ['cat', 'apple', 'sun'],
  movers: ['dog', 'elephant', 'sun'],
};

/** Deterministic RNG so the nonsense word assertions are stable. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('spelling bee deck', () => {
  it('AC26 — a bee round only uses words from the chosen levels', () => {
    expect(beeWords(deck, { starters: false, movers: true, nonsense: false })).toEqual([
      'dog',
      'elephant',
      'sun',
    ]);
    expect(beeWords(deck, { starters: true, movers: false, nonsense: false })).toEqual([
      'apple',
      'cat',
      'sun',
    ]);
    expect(beeWords(deck, { starters: true, movers: true, nonsense: false })).toEqual([
      'apple',
      'cat',
      'dog',
      'elephant',
      'sun',
    ]);
  });

  it('AC27 — with no level chosen there are no words at all', () => {
    const none = { starters: false, movers: false, nonsense: false };
    expect(beeWords(deck, none)).toEqual([]);
    expect(beeDictionary(deck, none, new Set(), seeded(1))).toEqual([]);
  });

  it('AC28 — a round is ten words, never repeating one', () => {
    const many = Array.from({ length: 25 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    const round = beeRound(many.map((word) => ({ word, patterns: ['bee'] })), seeded(7));
    expect(round).toHaveLength(BEE_ROUND);
    expect(new Set(round.map((w) => w.word)).size).toBe(BEE_ROUND);
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
    const dict = beeDictionary(deck, { starters: true, movers: true, nonsense: true }, new Set(), seeded(3));
    const nonsense = dict.filter((w) => w.patterns.includes(NONSENSE_TAG));
    expect(nonsense.length).toBeGreaterThan(0);
    const real = dict.filter((w) => w.patterns.includes('bee'));
    expect(real.map((w) => w.word)).toEqual(['apple', 'cat', 'dog', 'elephant', 'sun']);
  });
});
