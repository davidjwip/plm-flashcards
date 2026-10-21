import type { Word } from './types';

/**
 * Spelling-bee mode: a dictation deck instead of sound patterns.
 *
 * The bee gives no word list, so the deck is the merged Cambridge Young Learners
 * A–Z vocabulary (Pre A1 Starters + A1 Movers). Pseudo words are generated here
 * because the contest uses them to test decoding rather than recognition: a child
 * who has memorised sight words falls over, a child who blends reads them fine.
 */

export type BeeDeck = {
  starters: string[];
  movers: string[];
};

export type BeeChoice = {
  starters: boolean;
  movers: boolean;
  nonsense: boolean;
};

export const BEE_ROUND = 10;
export const BEE_TAG = 'bee';
export const NONSENSE_TAG = 'nonsense';

/** Consonant onsets a 4-7 year old has met: single letters and common clusters. */
const ONSETS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z',
  'sh', 'ch', 'th', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr',
  'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw',
];

/** Vowel + optional coda, so onset+rime always contains a vowel to sound out. */
const RIMES = [
  'ab', 'ad', 'ag', 'am', 'an', 'ap', 'at', 'ax',
  'eb', 'ed', 'eg', 'em', 'en', 'ep', 'et',
  'ib', 'id', 'ig', 'im', 'in', 'ip', 'it', 'ix',
  'ob', 'od', 'og', 'om', 'op', 'ot', 'ox',
  'ub', 'ud', 'ug', 'um', 'un', 'up', 'ut',
  'ack', 'eck', 'ick', 'ock', 'uck',
  'ash', 'esh', 'ish', 'osh', 'ush',
  'ang', 'ing', 'ong', 'ung',
  'amp', 'imp', 'ump', 'ast', 'est', 'ist', 'ost', 'ust',
];

const pick = <T,>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)] as T;

/** Real words from the chosen levels, deduplicated and alphabetical. */
export function beeWords(deck: BeeDeck, choice: BeeChoice): string[] {
  const pool = new Set<string>();
  if (choice.starters) for (const word of deck.starters) pool.add(word);
  if (choice.movers) for (const word of deck.movers) pool.add(word);
  return [...pool].sort();
}

/**
 * Plausible non-words: an onset a child has met plus a rime with a real vowel.
 * Never returns a word in `avoid` (the bank and the bee deck).
 */
export function nonsenseWords(count: number, avoid: Set<string>, rng: () => number = Math.random): string[] {
  const made = new Set<string>();
  let guard = 0;
  while (made.size < count && guard < count * 200) {
    guard += 1;
    const candidate = `${pick(ONSETS, rng)}${pick(RIMES, rng)}`;
    if (avoid.has(candidate) || made.has(candidate)) continue;
    made.add(candidate);
  }
  return [...made];
}

/** The bee dictionary: real words plus, optionally, nonsense words. */
export function beeDictionary(
  deck: BeeDeck,
  choice: BeeChoice,
  avoid: Set<string> = new Set(),
  rng: () => number = Math.random,
): Word[] {
  const real: Word[] = beeWords(deck, choice).map((word) => ({ word, patterns: [BEE_TAG] }));
  if (!choice.nonsense) return real;

  const known = new Set([...avoid, ...real.map((w) => w.word)]);
  const nonsense: Word[] = nonsenseWords(BEE_ROUND, known, rng).map(
    (word) => ({ word, patterns: [NONSENSE_TAG] }),
  );
  return [...real, ...nonsense];
}

/** Shuffle and take a round's worth. The bee is a round of ten, not the whole list. */
export function beeRound(words: Word[], rng: () => number = Math.random): Word[] {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as Word, shuffled[i] as Word];
  }
  return shuffled.slice(0, Math.min(BEE_ROUND, shuffled.length));
}
