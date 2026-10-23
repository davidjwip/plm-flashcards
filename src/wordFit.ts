/**
 * Font-size candidates for keeping a word on one line. Pure arithmetic: the app
 * measures the real text, but the ramp itself is cheap to unit-test.
 */

/** Descending candidate sizes from `maxPx` down to `maxPx * minScale`. */
export function fitSizes(maxPx: number, minScale = 0.4, step = 0.92): number[] {
  if (!Number.isFinite(maxPx) || maxPx <= 0) return [];

  const floor = maxPx * minScale;
  const factor = Number.isFinite(step) && step > 0 && step < 1 ? step : 0.92;
  const sizes = [maxPx];
  let current = maxPx;

  while (current * factor > floor) {
    current *= factor;
    sizes.push(current);
  }
  if (sizes.at(-1) !== floor) sizes.push(floor);

  return sizes;
}

/** True when the glyph ink fits inside the frame's inner box. */
export function inkFits(ink: number, inner: number, tolerance = 1): boolean {
  return ink <= inner + tolerance;
}

/** The largest candidate that fits, or the smallest if none do. */
export function firstFit(sizes: number[], fits: (px: number) => boolean): number {
  for (const size of sizes) {
    if (fits(size)) return size;
  }
  return sizes.at(-1) ?? 0;
}
