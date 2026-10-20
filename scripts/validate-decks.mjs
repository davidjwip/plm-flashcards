// Deck validator: the data rules from specs/patterns.md, enforced.
// A deck that breaks them fails the build — same authority as a failing test.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DECKS = new URL('../decks/', import.meta.url).pathname;
const MIN_WORDS = 8;
const MAX_WORDS = 12;
const WORD_RE = /^[a-z]+(?:['-][a-z]+)*$/;

const problems = [];
const seen = new Set();

let files = [];
try {
  files = readdirSync(DECKS)
    .filter((f) => f.endsWith('.json'))
    .sort();
} catch {
  console.log('validate:decks — no decks directory (nothing checked)');
  process.exit(0);
}

if (files.length === 0) {
  console.log('validate:decks — decks/ exists but is empty (nothing checked)');
  process.exit(0);
}

for (const file of files) {
  const fail = (message) => problems.push(`${file}: ${message}`);
  let deck;
  try {
    deck = JSON.parse(readFileSync(join(DECKS, file), 'utf8'));
  } catch (error) {
    fail(`not valid JSON (${error.message})`);
    continue;
  }

  for (const field of ['id', 'title']) {
    if (typeof deck[field] !== 'string' || !deck[field].trim()) fail(`missing ${field}`);
  }
  if (seen.has(deck.id)) fail(`duplicate deck id ${deck.id}`);
  seen.add(deck.id);

  if (![2, 3].includes(deck.level)) fail(`level must be 2 or 3, got ${deck.level}`);
  if (!Number.isInteger(deck.unit) || deck.unit < 1) fail(`unit must be a positive integer`);
  if (!Array.isArray(deck.patterns) || deck.patterns.length === 0) fail('no patterns listed');
  if (!Array.isArray(deck.words)) {
    fail('no words array');
    continue;
  }

  if (deck.words.length < MIN_WORDS || deck.words.length > MAX_WORDS) {
    fail(`${deck.words.length} words — must be ${MIN_WORDS}–${MAX_WORDS}`);
  }

  const words = new Set();
  for (const entry of deck.words) {
    const label = entry?.word ?? JSON.stringify(entry);
    if (typeof entry?.word !== 'string' || !WORD_RE.test(entry.word)) {
      fail(`word ${label} is not plain lowercase letters`);
      continue;
    }
    if (words.has(entry.word)) fail(`duplicate word ${entry.word}`);
    words.add(entry.word);
    if (!Array.isArray(entry.graphemes) || entry.graphemes.length === 0) {
      fail(`word ${entry.word} has no graphemes`);
      continue;
    }
    const texts = [];
    for (const grapheme of entry.graphemes) {
      if (typeof grapheme?.text !== 'string' || !grapheme.text) {
        fail(`word ${entry.word} has a grapheme without text`);
        continue;
      }
      texts.push(grapheme.text);
      if (grapheme.pattern && !deck.patterns.includes(grapheme.pattern)) {
        fail(`word ${entry.word} uses pattern ${grapheme.pattern}, not listed in the deck`);
      }
    }
    if (texts.join('') !== entry.word) {
      fail(`graphemes ${JSON.stringify(texts)} do not spell ${entry.word}`);
    }
  }
}

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nvalidate:decks — ${problems.length} problem(s) in ${files.length} deck(s)`);
  process.exit(1);
}

console.log(`validate:decks — ${files.length} deck(s) valid`);
