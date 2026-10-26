// Word bank validator: the data rules from specs/v1.md §6, enforced.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_FILE = new URL('../data/wordbank.json', import.meta.url).pathname;
const FILE = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_FILE;
const WORD_RE = /^[a-z]+(?:['-][a-z]+)*$/;
const CLUSTER_ID_RE = /^(?:[a-z]{2,3}-|-[a-z]{2,3})$/;
const MIN_WORDS = 10;
const MIN_WORDS_EXCEPTIONS = { '-lp': 7, '-xt': 6 };

// AC70: the words this app must never show or speak. See data/denylist.json for why the
// fragment list applies only to generated words.
const DENY_FILE = new URL('../data/denylist.json', import.meta.url).pathname;
// argv[3] overrides the pool, so the gate can be pointed at a candidate file in a test.
const POOL_FILE = process.argv[3]
  ? resolve(process.argv[3])
  : new URL('../data/nonsense.json', import.meta.url).pathname;
const COMMON_FILE = new URL('../data/common-words.txt', import.meta.url).pathname;
if (!existsSync(DENY_FILE)) fail('data/denylist.json is missing: the word gate cannot run');
const denylist = JSON.parse(readFileSync(DENY_FILE, 'utf8'));
const denied = new Set(denylist.deny ?? []);
const notWords = new Set(denylist.notWords ?? []);
const strong = denylist.strongSubstrings ?? [];
// real words too rare for a frequency list (Scots, dialect, slang) that must not be nonsense
const knownWords = new Set(denylist.knownWords ?? []);

// A nonsense word that is a real English word teaches nothing. The system dictionary is not
// enough (no fab/glam/drat/git), so this list comes from word frequency data.
if (!existsSync(COMMON_FILE))
  fail('data/common-words.txt is missing: the nonsense gate cannot run');
const commonWords = new Set(
  readFileSync(COMMON_FILE, 'utf8')
    .split('\n')
    .map((word) => word.trim())
    .filter(Boolean),
);

const problems = [];
let bank;
try {
  bank = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (error) {
  console.error(`validate:bank — cannot read data/wordbank.json (${error.message})`);
  process.exit(1);
}

const fail = (message) => problems.push(message);

if (!Array.isArray(bank.patterns) || bank.patterns.length === 0) fail('no patterns array');
if (!Array.isArray(bank.words) || bank.words.length === 0) fail('no words array');

const patternIds = new Set();
for (const pattern of bank.patterns ?? []) {
  if (!/^[a-z_]+$/.test(pattern.id ?? '') && !CLUSTER_ID_RE.test(pattern.id ?? ''))
    fail(`pattern id ${JSON.stringify(pattern.id)} is not a-z/_`);
  if (!pattern.label) fail(`pattern ${pattern.id} has no label`);
  if (patternIds.has(pattern.id)) fail(`duplicate pattern id ${pattern.id}`);
  patternIds.add(pattern.id);
}

const usedPatterns = new Set();
const wordCounts = new Map();
const seenWords = new Set();
for (const entry of bank.words ?? []) {
  if (typeof entry.word !== 'string' || !WORD_RE.test(entry.word)) {
    fail(`word ${JSON.stringify(entry.word)} is not plain lowercase letters`);
    continue;
  }
  if (seenWords.has(entry.word)) fail(`duplicate word ${entry.word}`);
  seenWords.add(entry.word);

  if (!Array.isArray(entry.patterns) || entry.patterns.length === 0) {
    fail(`word ${entry.word} has no patterns`);
    continue;
  }
  for (const pattern of entry.patterns) {
    if (!patternIds.has(pattern)) fail(`word ${entry.word} uses unknown pattern ${pattern}`);
    usedPatterns.add(pattern);
    wordCounts.set(pattern, (wordCounts.get(pattern) ?? 0) + 1);
  }
}

for (const id of patternIds) {
  if (!usedPatterns.has(id)) fail(`pattern ${id} has no words (it would be a dead option)`);
  const count = wordCounts.get(id) ?? 0;
  const floor = MIN_WORDS_EXCEPTIONS[id] ?? MIN_WORDS;
  if (count < floor) fail(`pattern ${id} has ${count} words, floor is ${floor}`);
}

// AC70: no word source may contain profanity, a slur, or a non-word.
const deniedWord = (word) =>
  denied.has(word) ? 'the denylist (profanity/slur/sexual or drug vocabulary)' : null;
const isNotWord = (word) => (notWords.has(word) ? 'the non-word list (jargon/abbreviation)' : null);
const hasFragment = (word) => strong.find((frag) => word.includes(frag)) ?? null;

for (const entry of bank.words ?? []) {
  const why = deniedWord(entry.word) ?? isNotWord(entry.word);
  if (why) fail(`word ${entry.word} is on ${why}`);
}

if (existsSync(POOL_FILE)) {
  const pool = JSON.parse(readFileSync(POOL_FILE, 'utf8')).words ?? [];
  for (const word of pool) {
    const why = deniedWord(word) ?? isNotWord(word);
    if (why) fail(`nonsense word ${word} is on ${why}`);
    const frag = hasFragment(word);
    if (frag) fail(`nonsense word ${word} contains a denied fragment "${frag}"`);
    if (commonWords.has(word) || knownWords.has(word))
      fail(`nonsense word ${word} is a real English word`);
  }
}

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nvalidate:bank — ${problems.length} problem(s)`);
  process.exit(1);
}

console.log(
  `validate:bank — ${bank.words.length} words across ${bank.patterns.length} patterns, all valid`,
);
