/// <reference types="vite/client" />

export type Grapheme = {
  /** What the child taps. One tile per letter, except digraphs (sh, ai, igh, ck). */
  text: string;
  /** The taught pattern this letter belongs to, when it is not a plain consonant. */
  pattern?: string;
};

export type Word = {
  word: string;
  graphemes: Grapheme[];
};

export type Deck = {
  id: string;
  level: number;
  unit: number;
  title: string;
  patterns: string[];
  words: Word[];
};

export type ListedDeck = Deck & { suggested: boolean };

const modules = import.meta.glob<{ default: Deck }>('../decks/*.json', { eager: true });

// No normalising, no repairing: a deck whose graphemes do not spell the word is a
// data bug, and the test in decks.test.ts must see it. Fixing it silently here
// would hide exactly the thing the validator exists to catch.
export const allDecks: Deck[] = Object.values(modules).map((module) => module.default);

export function listDecks(decks: Deck[]): ListedDeck[] {
  return [...decks]
    .sort((a, b) => a.level - b.level || a.unit - b.unit || a.id.localeCompare(b.id))
    .map((deck, index) => ({ ...deck, suggested: index === 0 }));
}

export function buildRound(decks: Deck[], deckId: string, size = 10): Word[] {
  const deck = decks.find((candidate) => candidate.id === deckId);
  if (!deck) return [];

  const words = [...deck.words];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  return words.slice(0, size);
}
