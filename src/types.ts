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
  /** True on the turn the grown-up's verdict lands on a milestone. */
  celebrate: boolean;
};
