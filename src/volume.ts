/**
 * Playback volume. The browser voice was too quiet on a big speaker, so the app
 * plays its own normalised files and lets the adult trim them.
 */
export const VOLUME_STEPS = [0.3, 0.5, 0.7, 0.85, 1] as const;

export const DEFAULT_VOLUME = 3;

export function clampVolume(index: number): number {
  if (!Number.isFinite(index)) return DEFAULT_VOLUME;
  return Math.min(VOLUME_STEPS.length - 1, Math.max(0, Math.round(index)));
}

export function stepVolume(index: number, direction: 'up' | 'down'): number {
  const current = clampVolume(index);
  return clampVolume(current + (direction === 'up' ? 1 : -1));
}

/** 0..1, what an <audio> element and a SpeechSynthesisUtterance both take. */
export function volumeValue(index: number): number {
  return VOLUME_STEPS[clampVolume(index)] ?? VOLUME_STEPS[DEFAULT_VOLUME]!;
}

export function canLouder(index: number): boolean {
  return clampVolume(index) < VOLUME_STEPS.length - 1;
}

export function canQuieter(index: number): boolean {
  return clampVolume(index) > 0;
}
