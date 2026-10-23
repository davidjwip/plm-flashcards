import { describe, expect, it } from 'vitest';
import { firstFit, fitSizes } from './wordFit';

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
});
