import type { Bank, Pattern, Session, Verdict, Word } from './types';

export const CELEBRATE_EVERY = 10;

/** Every word that demonstrates at least one selected pattern, once, alphabetically. */
export function buildDictionary(bank: Bank, selected: string[]): Word[] {
  const wanted = new Set(selected);
  if (wanted.size === 0) return [];
  return bank.words
    .filter((word) => word.patterns.some((pattern) => wanted.has(pattern)))
    .slice()
    .sort((a, b) => a.word.localeCompare(b.word));
}

/** Patterns that actually have words — anything else would be a dead option. */
export function patternOptions(bank: Bank): Pattern[] {
  const populated = new Set(bank.words.flatMap((word) => word.patterns));
  return bank.patterns.filter((pattern) => populated.has(pattern.id));
}

export function createSession(words: Word[]): Session {
  return { words: [...words], index: 0, right: 0, wrong: 0, marks: [], celebrate: false };
}

/** The word in play, or null when the session is finished (or empty). */
export function currentWord(session: Session): Word | null {
  if (session.index >= session.words.length) return null;
  return session.words[session.index] ?? null;
}

/**
 * Record one verdict and move on. There is no timer anywhere: the word only
 * changes when the grown-up presses a button.
 */
export function mark(session: Session, verdict: Verdict): Session {
  if (session.index >= session.words.length) return session;

  const right = session.right + (verdict === 'right' ? 1 : 0);
  const wrong = session.wrong + (verdict === 'wrong' ? 1 : 0);
  return {
    ...session,
    index: session.index + 1,
    right,
    wrong,
    marks: [...session.marks, verdict],
    // Celebrate on the way into a milestone, once, not on every render.
    celebrate: verdict === 'right' && right > 0 && right % CELEBRATE_EVERY === 0,
  };
}

export function isDone(session: Session): boolean {
  return session.index >= session.words.length;
}

export function progress(session: Session): { position: number; total: number } {
  return { position: Math.min(session.index, session.words.length), total: session.words.length };
}
