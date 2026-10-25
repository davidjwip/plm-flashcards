/** Level 2 pattern inventory: what the class works on, and what spelling can prove. */

export const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];

export const LONG_VOWELS = [
  'a_e',
  'ai',
  'ay',
  'ee',
  'ea',
  'i_e',
  'ie',
  'igh',
  'o_e',
  'oa',
  'ue',
  'ui',
  'u_e',
  'ew',
  'ou',
  'ow',
  'oi',
  'oy',
  'au',
  'aw',
  'al',
  'oo',
];

export const R_CONTROLLED = ['ar', 'or', 'ear', 'eer', 'air', 'are', 'ur', 'ir', 'er', 'schwa'];

export const DIGRAPHS = ['ck', 'k', 'sh', 'ch', 'th', 'ng', 'tch'];

/** The 27 starting clusters, position carried by the trailing hyphen. */
export const START_CLUSTERS = [
  'bl-',
  'br-',
  'cl-',
  'cr-',
  'dr-',
  'fl-',
  'fr-',
  'gl-',
  'gr-',
  'pl-',
  'pr-',
  'tr-',
  'sc-',
  'sk-',
  'sl-',
  'sm-',
  'sn-',
  'sp-',
  'st-',
  'sw-',
  'scr-',
  'spl-',
  'spr-',
  'str-',
  'shr-',
  'thr-',
  'squ-',
];

/** The 19 ending clusters, position carried by the leading hyphen. */
export const END_CLUSTERS = [
  '-nd',
  '-nt',
  '-nk',
  '-mp',
  '-nch',
  '-st',
  '-sk',
  '-sp',
  '-lt',
  '-ld',
  '-lp',
  '-lf',
  '-lk',
  '-ft',
  '-pt',
  '-ct',
  '-xt',
  '-ll',
  '-ss',
];

export const SILENT_E = ['ghost_e'];

export type Group = 'short' | 'long' | 'r-controlled' | 'digraph' | 'start' | 'end' | 'silent';

export const GROUP_ORDER: Group[] = [
  'short',
  'long',
  'r-controlled',
  'digraph',
  'start',
  'end',
  'silent',
];

export const GROUP_LABEL: Record<Group, string> = {
  short: 'Short vowels',
  long: 'Long vowels',
  'r-controlled': 'R-controlled',
  digraph: 'Digraphs',
  start: 'Starting clusters',
  end: 'Ending clusters',
  silent: 'Silent e',
};

/**
 * What the L2 chip selects: short vowels, both cluster families, ar/or, the
 * digraphs the class can read, the long vowels it covers, and ghost e. `tw` is
 * deliberately not taught, so it is absent.
 */
export const L2_PATTERN_IDS = [
  ...SHORT_VOWELS,
  ...START_CLUSTERS,
  ...END_CLUSTERS,
  'ar',
  'or',
  'ch',
  'sh',
  'th',
  'ck',
  'ng',
  'ee',
  'oo',
  'ou',
  'ghost_e',
];

/**
 * The subset of L2 that spelling can prove. Short vowels are excluded because a
 * short-a rule would claim `cake`; everything here is positional or a fixed
 * letter pattern.
 */
export const SPELLING_L2 = [
  ...START_CLUSTERS,
  ...END_CLUSTERS,
  'ar',
  'or',
  'ch',
  'sh',
  'th',
  'qu',
  'ck',
  'ng',
  'ee',
  'oo',
  'ou',
];

const SPELLING_SET = new Set(SPELLING_L2);

/** Every L2 pattern the word's letters demonstrate, in spelling-list order. */
export function tagsForSpelling(word: string): string[] {
  const lower = word.toLowerCase();
  return SPELLING_L2.filter((id) => {
    if (!SPELLING_SET.has(id)) return false;
    if (id.endsWith('-')) {
      const cluster = id.slice(0, -1);
      return lower.startsWith(cluster) && lower.length > cluster.length;
    }
    if (id.startsWith('-')) {
      const cluster = id.slice(1);
      return lower.endsWith(cluster) && lower.length > cluster.length;
    }
    return lower.includes(id);
  });
}

/** Multi-letter graphemes the app knows, longest first. Single letters are always taught. */
const GRAPHEMES = [
  'igh',
  'ear',
  'eer',
  'air',
  'are',
  'tch',
  'nch',
  'qu',
  'oo',
  'ou',
  'ow',
  'oi',
  'oy',
  'au',
  'aw',
  'al',
  'ee',
  'ea',
  'ai',
  'ay',
  'ie',
  'oa',
  'ue',
  'ui',
  'ew',
  'ur',
  'ir',
  'er',
  'ar',
  'or',
  'ck',
  'sh',
  'ch',
  'th',
  'ng',
];

/** Those of the above that Level 2 has taught. */
const L2_GRAPHEMES = new Set([
  'qu',
  'ee',
  'oo',
  'ou',
  'ar',
  'or',
  'ck',
  'sh',
  'ch',
  'th',
  'ng',
  'nch',
]);

const LONGEST_FIRST = [...GRAPHEMES].sort((a, b) => b.length - a.length);

/** Walk left to right, taking the longest known grapheme at each position. */
export function segment(word: string): string[] {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  const parts: string[] = [];
  let at = 0;
  while (at < lower.length) {
    const grapheme = LONGEST_FIRST.find((candidate) => lower.startsWith(candidate, at));
    if (grapheme) {
      parts.push(grapheme);
      at += grapheme.length;
    } else {
      parts.push(lower[at]!);
      at += 1;
    }
  }
  return parts;
}

/** A silent final `e` that changes the vowel before it, e.g. `cake` -> `a_e`. */
function splitDigraph(word: string): string | null {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!lower.endsWith('e') || lower.endsWith('le')) return null;
  const vowel = lower[lower.length - 3];
  const consonant = lower[lower.length - 2];
  if (!vowel || !consonant) return null;
  if (!/[aeiou]/.test(vowel) || /[aeiou]/.test(consonant)) return null;
  return `${vowel}_e`;
}

/** Every multi-letter grapheme Level 2 has not taught. Empty means fully covered. */
export function untaught(word: string): string[] {
  const missing = segment(word).filter(
    (grapheme) => grapheme.length > 1 && !L2_GRAPHEMES.has(grapheme),
  );
  const split = splitDigraph(word);
  if (split) missing.push(split);
  return missing;
}

/**
 * Syllables from spelling: vowel groups, minus a silent final `e`, except a
 * syllabic `-le` after a consonant, which keeps its vowel (`table` 2, `smile` 1).
 * Never returns less than one.
 */
export function syllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  const groups = lower.match(/[aeiouy]+/g) ?? [];
  if (groups.length === 0) return 1;

  let count = groups.length;
  if (lower.endsWith('e')) {
    const before = lower[lower.length - 2];
    const beforeThat = lower[lower.length - 3];
    const syllabicLe = before === 'l' && beforeThat !== undefined && !/[aeiouy]/.test(beforeThat);
    if (!syllabicLe) count -= 1;
  }
  return Math.max(1, count);
}

export function isL2Word(word: string): boolean {
  return untaught(word).length === 0;
}

/** Which family heading a pattern row belongs under. */
export function groupOf(id: string): Group {
  if (id.endsWith('-')) return 'start';
  if (id.startsWith('-')) return 'end';
  if (SHORT_VOWELS.includes(id)) return 'short';
  if (LONG_VOWELS.includes(id)) return 'long';
  if (R_CONTROLLED.includes(id)) return 'r-controlled';
  if (SILENT_E.includes(id)) return 'silent';
  // The remaining bank ids are digraphs; unknown test fixtures stay in a group
  // rather than throwing away their row.
  return 'digraph';
}
