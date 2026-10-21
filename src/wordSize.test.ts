import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORD_SIZE,
  WORD_SIZE_STEPS,
  canGrow,
  canShrink,
  clampWordSize,
  stepWordSize,
  wordSizeRem,
  wordSizeStyle,
} from './wordSize';

describe('word size', () => {
  it('starts in the middle of the range', () => {
    expect(DEFAULT_WORD_SIZE).toBe(2);
    expect(wordSizeRem(DEFAULT_WORD_SIZE)).toBe('5.5rem');
  });

  it('steps up and down one notch at a time', () => {
    expect(stepWordSize(2, 'up')).toBe(3);
    expect(stepWordSize(2, 'down')).toBe(1);
    expect(wordSizeRem(stepWordSize(2, 'up'))).toBe('7rem');
  });

  it('AC19 — steps from the middle the first time, when nothing has been chosen', () => {
    expect(stepWordSize(null, 'up')).toBe(3);
    expect(stepWordSize(null, 'down')).toBe(1);
  });

  it('leaves the word to the stylesheet until a size is chosen', () => {
    expect(wordSizeStyle(null)).toBeNull();
    expect(wordSizeStyle(2)).toBe('font-size: 5.5rem');
  });

  it('goes big enough for an adult reading across the room', () => {
    const top = WORD_SIZE_STEPS.length - 1;
    expect(wordSizeRem(top)).toBe('20rem');
    expect(stepWordSize(top - 2, 'up')).toBe(top - 1);
  });

  it('clamps at both ends instead of running off', () => {
    expect(stepWordSize(0, 'down')).toBe(0);
    expect(stepWordSize(WORD_SIZE_STEPS.length - 1, 'up')).toBe(WORD_SIZE_STEPS.length - 1);
    expect(clampWordSize(-4)).toBe(0);
    expect(clampWordSize(99)).toBe(WORD_SIZE_STEPS.length - 1);
    expect(clampWordSize(Number.NaN)).toBe(DEFAULT_WORD_SIZE);
    expect(clampWordSize(2.6)).toBe(3);
  });

  it('knows when the buttons should be disabled', () => {
    expect(canShrink(0)).toBe(false);
    expect(canGrow(WORD_SIZE_STEPS.length - 1)).toBe(false);
    expect(canShrink(2)).toBe(true);
    expect(canGrow(2)).toBe(true);
    // Nothing chosen yet: both directions are available.
    expect(canShrink(null)).toBe(true);
    expect(canGrow(null)).toBe(true);
  });
});
