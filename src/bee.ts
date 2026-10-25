import { shuffle } from './engine';
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
  /** Draw the deck from the Level 2 bank set instead of the Cambridge deck. */
  l2: boolean;
};

export const BEE_ROUND = 10;
export const BEE_TAG = 'bee';
export const NONSENSE_TAG = 'nonsense';

/** Consonant onsets a 4-7 year old has met: single letters and common clusters. */
const ONSETS = [
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'v',
  'w',
  'y',
  'z',
  'sh',
  'ch',
  'th',
  'bl',
  'br',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'pl',
  'pr',
  'sc',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'tr',
  'tw',
];

/** Vowel + optional coda, so onset+rime always contains a vowel to sound out. */
const RIMES = [
  'ab',
  'ad',
  'ag',
  'am',
  'an',
  'ap',
  'at',
  'ax',
  'eb',
  'ed',
  'eg',
  'em',
  'en',
  'ep',
  'et',
  'ib',
  'id',
  'ig',
  'im',
  'in',
  'ip',
  'it',
  'ix',
  'ob',
  'od',
  'og',
  'om',
  'op',
  'ot',
  'ox',
  'ub',
  'ud',
  'ug',
  'um',
  'un',
  'up',
  'ut',
  'ack',
  'eck',
  'ick',
  'ock',
  'uck',
  'ash',
  'esh',
  'ish',
  'osh',
  'ush',
  'ang',
  'ing',
  'ong',
  'ung',
  'amp',
  'imp',
  'ump',
  'ast',
  'est',
  'ist',
  'ost',
  'ust',
];

const pick = <T>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)] as T;

/** Real words from the chosen levels, deduplicated and alphabetical. */
export function beeWords(deck: BeeDeck, choice: BeeChoice): string[] {
  const pool = new Set<string>();
  if (choice.starters) for (const word of deck.starters) pool.add(word);
  if (choice.movers) for (const word of deck.movers) pool.add(word);
  return [...pool].sort();
}

/**
 * Plausible non-words: an onset a child has met plus a rime with a real vowel.
 * Never returns a word in `avoid` (the bank and the bee deck), and only words
 * `keep` accepts, so the guard loop keeps trying until it has `count`.
 */
export function nonsenseWords(
  count: number,
  avoid: Set<string>,
  rng: () => number = Math.random,
  keep: (word: string) => boolean = () => true,
): string[] {
  const made = new Set<string>();
  let guard = 0;
  while (made.size < count && guard < count * 200) {
    guard += 1;
    const candidate = `${pick(ONSETS, rng)}${pick(RIMES, rng)}`;
    if (avoid.has(candidate) || made.has(candidate) || !keep(candidate)) continue;
    made.add(candidate);
  }
  return [...made];
}

export type BeeDictionaryOptions = {
  /** The Level 2 word list; when choice.l2 is true this IS the deck. */
  l2Words?: Word[];
  /** Words that must not appear in a nonsense round (the bank and the real deck). */
  avoid?: Set<string>;
  rng?: () => number;
};

/** The bee dictionary: real words plus, optionally, nonsense words. */
export function beeDictionary(
  deck: BeeDeck,
  choice: BeeChoice,
  options: BeeDictionaryOptions = {},
): Word[] {
  const { l2Words = [], avoid = new Set<string>(), rng = Math.random } = options;
  // Level 2 is a source, not a filter: the curated bank set is the real-word half.
  const realWords = choice.l2 ? l2Words.map(({ word }) => word) : beeWords(deck, choice);
  const real: Word[] = realWords.map((word) => ({ word, patterns: [BEE_TAG] }));
  // A Level 2 round is dictated bank words, never pseudo-words, even though the
  // nonsense box defaults to true and is disabled while Level 2 is on.
  if (choice.l2 || !choice.nonsense) return real;

  const known = new Set([...avoid, ...real.map((w) => w.word)]);
  const nonsense: Word[] = nonsenseWords(BEE_ROUND, known, rng).map((word) => ({
    word,
    patterns: [NONSENSE_TAG],
  }));
  return [...real, ...nonsense];
}

/** Shuffle and take a round's worth. The bee is a round of ten, not the whole list. */
export function beeRound(words: Word[], rng: () => number = Math.random): Word[] {
  // Same shuffle as the sound-pattern runs: one Fisher-Yates, not two.
  return shuffle(words, rng).slice(0, Math.min(BEE_ROUND, words.length));
}
