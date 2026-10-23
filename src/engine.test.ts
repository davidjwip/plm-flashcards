import { describe, expect, it } from 'vitest';
import {
  CELEBRATE_EVERY,
  PRAISE,
  buildDictionary,
  createSession,
  shuffle,
  currentWord,
  cycleProgress,
  isDone,
  mark,
  patternOptions,
  praiseFor,
  progress,
} from './engine';
import type { Bank } from './types';

/** A deterministic rng that leaves the Fisher–Yates swap targets in place. */
const keepOrder = () => 1;

const bank: Bank = {
  patterns: [
    { id: 'a', label: 'short a' },
    { id: 'ai', label: 'ai' },
    { id: 'ghost', label: 'no words yet' },
  ],
  words: [
    { word: 'cat', patterns: ['a'] },
    { word: 'rain', patterns: ['ai'] },
    { word: 'train', patterns: ['ai', 'a'] },
    { word: 'map', patterns: ['a'] },
  ],
};

describe('dictionary', () => {
  it('AC1 — only patterns that have words are offered', () => {
    expect(patternOptions(bank).map((pattern) => pattern.id)).toEqual(['a', 'ai']);
  });

  it('AC2 — selecting patterns builds the union of their words, once each', () => {
    expect(buildDictionary(bank, ['a']).map((word) => word.word)).toEqual(['cat', 'map', 'train']);
    expect(buildDictionary(bank, ['ai']).map((word) => word.word)).toEqual(['rain', 'train']);
    expect(buildDictionary(bank, ['a', 'ai']).map((word) => word.word)).toEqual([
      'cat',
      'map',
      'rain',
      'train',
    ]);
  });

  it('AC3 — no selection means no dictionary', () => {
    expect(buildDictionary(bank, [])).toEqual([]);
  });
});

describe('session', () => {
  const words = buildDictionary(bank, ['a', 'ai']);

  it('AC4 — one word is in play at a time', () => {
    const session = createSession(words, keepOrder);
    expect(currentWord(session)).toEqual(words[0]);
    expect(progress(session)).toEqual({ position: 0, total: words.length });
  });

  it('AC5 — a right verdict counts it and moves on', () => {
    const session = mark(createSession(words, keepOrder), 'right');
    expect(session.right).toBe(1);
    expect(session.wrong).toBe(0);
    expect(currentWord(session)).toEqual(words[1]);
    expect(progress(session).position).toBe(1);
  });

  it('AC6 — a wrong verdict counts it and moves on', () => {
    const session = mark(createSession(words, keepOrder), 'wrong');
    expect(session.right).toBe(0);
    expect(session.wrong).toBe(1);
    expect(currentWord(session)).toEqual(words[1]);
  });

  it('AC7 — nothing advances without a verdict', () => {
    const session = createSession(words, keepOrder);
    expect(currentWord(session)).toEqual(words[0]);
    expect(currentWord(session)).toEqual(words[0]);
    expect(session.index).toBe(0);
  });

  it('AC8 — the session ends after the last word and reports the score', () => {
    let session = createSession(words, keepOrder);
    for (let i = 0; i < words.length; i++) session = mark(session, i === 0 ? 'wrong' : 'right');
    expect(isDone(session)).toBe(true);
    expect(currentWord(session)).toBeNull();
    expect(session.right).toBe(words.length - 1);
    expect(session.wrong).toBe(1);
    expect(mark(session, 'right')).toEqual(session);
  });

  it('AC9 — every tenth right answer is a celebration, and only then', () => {
    const long = Array.from({ length: CELEBRATE_EVERY * 2 }, (_, i) => ({
      word: `w${i}`,
      patterns: ['a'],
    }));
    let session = createSession(long, keepOrder);
    const milestones: number[] = [];
    for (let i = 0; i < long.length; i++) {
      session = mark(session, 'right');
      if (session.celebrate) milestones.push(session.right);
    }
    expect(milestones).toEqual([CELEBRATE_EVERY, CELEBRATE_EVERY * 2]);
  });
});

describe('AC59 — every run draws a fresh word order', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ word: `w${i}`, patterns: ['a'] }));
  const firstWord = (rand: () => number): string | undefined =>
    currentWord(createSession(ten, rand))?.word;

  it('AC59 — a mid-range rng produces the known Fisher-Yates permutation', () => {
    // i=2: j=floor(.5*3)=1 -> [a,c,b]; i=1: j=floor(.5*2)=1 -> unchanged.
    // The +1 in the index maths is what makes this [a,c,b] and not [a,b,c].
    expect(shuffle(['a', 'b', 'c'], () => 0.5)).toEqual(['a', 'c', 'b']);
  });

  it('AC59 — a shuffled session is a permutation, not a sorted copy', () => {
    const session = createSession(ten, () => 0);
    const drawn = session.words.map((word) => word.word);
    expect(drawn).toHaveLength(ten.length);
    expect([...drawn].sort()).toEqual(ten.map((word) => word.word).sort());
    expect(new Set(drawn).size).toBe(ten.length);
    expect(drawn).not.toEqual(ten.map((word) => word.word));
    // The input dictionary belongs to the bank: a run must never reorder it in place.
    expect(ten.map((word) => word.word)).toEqual(Array.from({ length: 10 }, (_, i) => `w${i}`));
  });

  it('AC59 — two runs with different rands draw different orders', () => {
    const first = createSession(ten, () => 0).words.map((word) => word.word);
    const second = createSession(ten, () => 1).words.map((word) => word.word);
    expect(first).not.toEqual(second);
  });

  it('AC59 — a ten-word run does not present the same first word twice', () => {
    expect(firstWord(() => 0)).not.toBe(firstWord(() => 1));
  });
});

describe('progression and encouragement', () => {
  // Long enough to reach a milestone twice: the fixture bank has only four words,
  // and mark() correctly refuses to advance past the end of a session.
  const words = Array.from({ length: 25 }, (_, i) => ({ word: `w${i}`, patterns: ['a'] }));

  it('AC13 — the party track fills one step per right answer and resets at ten', () => {
    let session = createSession(words);
    expect(cycleProgress(session)).toEqual({ filled: 0, target: CELEBRATE_EVERY });

    for (let i = 1; i <= 9; i++) {
      session = mark(session, 'right');
      expect(cycleProgress(session).filled).toBe(i);
    }
    session = mark(session, 'right');
    expect(session.right).toBe(10);
    expect(cycleProgress(session).filled).toBe(0); // reset: the party happened
    session = mark(session, 'right');
    expect(cycleProgress(session).filled).toBe(1);
  });

  it('AC13b — a wrong answer does not fill the track', () => {
    let session = createSession(words);
    session = mark(session, 'right');
    session = mark(session, 'wrong');
    expect(cycleProgress(session).filled).toBe(1);
  });

  it('AC16 — the celebration fires at ten and re-arms for twenty', () => {
    let session = createSession(
      Array.from({ length: 25 }, (_, i) => ({ word: `w${i}`, patterns: ['a'] })),
    );
    const fired: number[] = [];
    for (let i = 0; i < 20; i++) {
      session = mark(session, 'right');
      if (session.celebrate) fired.push(session.right);
    }
    expect(fired).toEqual([10, 20]);
  });

  it('AC16b — a wrong answer never celebrates, even at the tenth attempt', () => {
    let session = createSession(
      Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, patterns: ['a'] })),
    );
    for (let i = 0; i < 9; i++) session = mark(session, 'right');
    session = mark(session, 'wrong');
    expect(session.celebrate).toBe(false);
  });

  it('AC14 — encouragement rotates per right answer and is silent at zero', () => {
    expect(praiseFor(0)).toBe('');
    expect(praiseFor(1)).toBe(PRAISE[0]);
    expect(praiseFor(2)).toBe(PRAISE[1]);
    expect(praiseFor(PRAISE.length + 1)).toBe(PRAISE[0]);
  });

  it('AC15 — a streak counts consecutive right answers and a wrong one resets it', () => {
    let session = createSession(words);
    session = mark(session, 'right');
    session = mark(session, 'right');
    expect(session.streak).toBe(2);
    expect(session.bestStreak).toBe(2);

    session = mark(session, 'wrong');
    expect(session.streak).toBe(0);
    expect(session.bestStreak).toBe(2);

    session = mark(session, 'right');
    expect(session.streak).toBe(1);
    expect(session.bestStreak).toBe(2);

    session = mark(session, 'right');
    session = mark(session, 'right');
    expect(session.bestStreak).toBe(3);
  });
});
