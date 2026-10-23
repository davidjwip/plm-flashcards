import { describe, expect, it } from 'vitest';
import { firstFit, fitSizes, inkFits } from './wordFit';

describe('word auto-fit', () => {
  it('AC56 — the shrink ramp steps down to the floor', () => {
    expect(fitSizes(100, 0.5, 0.5)).toEqual([100, 50]);

    const sizes = fitSizes(320, 0.1, 0.92);
    expect(sizes[0]).toBe(320);
    expect(sizes.at(-1)).toBeCloseTo(32);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeLessThan(sizes[i - 1]!);
    }

    expect(firstFit([100, 50, 32], (px) => px <= 60)).toBe(50);
    expect(firstFit([100, 50, 32], () => false)).toBe(32);
    expect(firstFit([100], () => true)).toBe(100);
  });

  it('AC56 — the ramp refuses nonsense and still ends at the floor', () => {
    expect(fitSizes(0)).toEqual([]);
    expect(fitSizes(-5)).toEqual([]);
    expect(fitSizes(Number.NaN)).toEqual([]);
    expect(fitSizes(Number.POSITIVE_INFINITY)).toEqual([]);

    // A step outside (0,1) falls back to 0.92 rather than looping forever.
    for (const step of [0, 1, Number.NaN]) {
      const sizes = fitSizes(100, 0.5, step);
      expect(sizes[0]).toBe(100);
      expect(sizes.at(-1)).toBeCloseTo(50);
    }

    // The floor is always present, even when the ramp lands exactly on it.
    expect(fitSizes(100, 0.5, 0.5)).toEqual([100, 50]);
  });

  it('AC56 — firstFit copes with an empty ramp', () => {
    expect(firstFit([], () => true)).toBe(0);
  });

  it('AC56 — inkFits compares the ink against the inner box', () => {
    expect(inkFits(140, 150)).toBe(true);
    // The default tolerance is one pixel of rounding slack.
    expect(inkFits(151, 150)).toBe(true);
    expect(inkFits(152, 150)).toBe(false);
    expect(inkFits(152, 150, 2.5)).toBe(true);
  });
});
