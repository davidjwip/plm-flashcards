/**
 * The adult can resize the word: a small child across a table, a bigger one on a
 * lap, a tired evening. Five steps, persisted per device.
 */
export const WORD_SIZE_STEPS = [3, 4, 5.5, 7, 9] as const;

export const DEFAULT_WORD_SIZE = 2;

export function clampWordSize(index: number): number {
  if (!Number.isFinite(index)) return DEFAULT_WORD_SIZE;
  return Math.min(WORD_SIZE_STEPS.length - 1, Math.max(0, Math.round(index)));
}

/** `null` means "never chosen": the responsive clamp stays in charge. */
export function stepWordSize(index: number | null, direction: 'up' | 'down'): number {
  const current = clampWordSize(index ?? DEFAULT_WORD_SIZE);
  return clampWordSize(current + (direction === 'up' ? 1 : -1));
}

/** The CSS font-size for a step, e.g. `5.5rem`. */
export function wordSizeRem(index: number): string {
  return `${WORD_SIZE_STEPS[clampWordSize(index)]}rem`;
}

/**
 * Inline style for the word, or null when no size has been chosen — in which
 * case the stylesheet's clamp() does the work and the word stays responsive.
 */
export function wordSizeStyle(index: number | null): string | null {
  return index === null ? null : `font-size: ${wordSizeRem(index)}`;
}

export function canGrow(index: number | null): boolean {
  return index === null || clampWordSize(index) < WORD_SIZE_STEPS.length - 1;
}

export function canShrink(index: number | null): boolean {
  return index === null || clampWordSize(index) > 0;
}
