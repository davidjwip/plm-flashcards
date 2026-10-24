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

export type Group = 'short' | 'long' | 'r-controlled' | 'digraph' | 'start' | 'end';

export const GROUP_ORDER: Group[] = ['short', 'long', 'r-controlled', 'digraph', 'start', 'end'];

export const GROUP_LABEL: Record<Group, string> = {
  short: 'Short vowels',
  long: 'Long vowels',
  'r-controlled': 'R-controlled',
  digraph: 'Digraphs',
  start: 'Starting clusters',
  end: 'Ending clusters',
};

/**
 * What the L2 chip selects: short vowels, both cluster families, ar/or, and the
 * digraphs the class can read. `tw` is deliberately not taught, so it is absent.
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
  'ck',
  'ng',
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

export function isL2Word(word: string): boolean {
  return tagsForSpelling(word).length > 0;
}

/** Which family heading a pattern row belongs under. */
export function groupOf(id: string): Group {
  if (id.endsWith('-')) return 'start';
  if (id.startsWith('-')) return 'end';
  if (SHORT_VOWELS.includes(id)) return 'short';
  if (LONG_VOWELS.includes(id)) return 'long';
  if (R_CONTROLLED.includes(id)) return 'r-controlled';
  // The remaining bank ids are digraphs; unknown test fixtures stay in a group
  // rather than throwing away their row.
  return 'digraph';
}
