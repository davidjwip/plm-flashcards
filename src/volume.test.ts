import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VOLUME,
  VOLUME_STEPS,
  canLouder,
  canQuieter,
  clampVolume,
  stepVolume,
  volumeValue,
} from './volume';

describe('volume', () => {
  it('defaults to a loud-but-not-maximum setting', () => {
    expect(volumeValue(DEFAULT_VOLUME)).toBe(0.85);
  });

  it('steps one notch at a time and clamps at both ends', () => {
    expect(stepVolume(DEFAULT_VOLUME, 'up')).toBe(DEFAULT_VOLUME + 1);
    expect(stepVolume(DEFAULT_VOLUME, 'down')).toBe(DEFAULT_VOLUME - 1);
    expect(stepVolume(0, 'down')).toBe(0);
    expect(stepVolume(VOLUME_STEPS.length - 1, 'up')).toBe(VOLUME_STEPS.length - 1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_VOLUME);
    expect(clampVolume(99)).toBe(VOLUME_STEPS.length - 1);
  });

  it('reports 0..1 for the audio element', () => {
    for (const [index, expected] of VOLUME_STEPS.entries()) {
      expect(volumeValue(index)).toBe(expected);
    }
    expect(volumeValue(99)).toBe(1);
  });

  it('knows when the buttons should be disabled', () => {
    expect(canQuieter(0)).toBe(false);
    expect(canLouder(VOLUME_STEPS.length - 1)).toBe(false);
    expect(canQuieter(2)).toBe(true);
    expect(canLouder(2)).toBe(true);
  });
});
