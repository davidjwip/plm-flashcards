import { describe, expect, it } from 'vitest';
import {
  CELEBRATE_EVERY,
  buildDictionary,
  createSession,
  currentWord,
  isDone,
  mark,
  patternOptions,
  progress,
} from './engine';
import type { Bank } from './types';

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
    const session = createSession(words);
    expect(currentWord(session)).toEqual(words[0]);
    expect(progress(session)).toEqual({ position: 0, total: words.length });
  });

  it('AC5 — a right verdict counts it and moves on', () => {
    const session = mark(createSession(words), 'right');
    expect(session.right).toBe(1);
    expect(session.wrong).toBe(0);
    expect(currentWord(session)).toEqual(words[1]);
    expect(progress(session).position).toBe(1);
  });

  it('AC6 — a wrong verdict counts it and moves on', () => {
    const session = mark(createSession(words), 'wrong');
    expect(session.right).toBe(0);
    expect(session.wrong).toBe(1);
    expect(currentWord(session)).toEqual(words[1]);
  });

  it('AC7 — nothing advances without a verdict', () => {
    const session = createSession(words);
    expect(currentWord(session)).toEqual(words[0]);
    expect(currentWord(session)).toEqual(words[0]);
    expect(session.index).toBe(0);
  });

  it('AC8 — the session ends after the last word and reports the score', () => {
    let session = createSession(words);
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
    let session = createSession(long);
    const milestones: number[] = [];
    for (let i = 0; i < long.length; i++) {
      session = mark(session, 'right');
      if (session.celebrate) milestones.push(session.right);
    }
    expect(milestones).toEqual([CELEBRATE_EVERY, CELEBRATE_EVERY * 2]);
  });
});
