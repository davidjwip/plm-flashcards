export type Pattern = {
  id: string;
  label: string;
};

export type Word = {
  word: string;
  /** Taught patterns this word demonstrates. One word can demonstrate several. */
  patterns: string[];
};

export type Bank = {
  patterns: Pattern[];
  words: Word[];
};

export type Verdict = 'right' | 'wrong';

export type Session = {
  words: Word[];
  index: number;
  right: number;
  wrong: number;
  marks: Verdict[];
  /** Consecutive right answers; a wrong answer resets it. */
  streak: number;
  /** Best streak in this run. */
  bestStreak: number;
  /** True on the turn the grown-up's verdict lands on a milestone. */
  celebrate: boolean;
};
