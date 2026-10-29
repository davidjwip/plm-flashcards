// Guardrail scan: the things that must never reach a public repo.
// Runs in CI and locally. Deliberately dumb and readable — a clever scanner
// nobody understands is worse than a plain one everybody can audit.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_EMAIL_DOMAINS = ['users.noreply.github.com', 'example.com'];

// Files we never scan: lockfiles are noise, this scanner contains the patterns, the denylist holds
// the names it denies by design, and binary assets (audio, images, fonts) cannot contain a readable
// secret.
const SKIP = [
  /^package-lock\.json$/,
  /^scripts\/guardrail-scan\.mjs$/,
  /^scripts\/guardrail-denylist\.txt$/,
  /\.(?:mp3|wav|ogg|png|jpe?g|gif|webp|ico|woff2?|ttf|zip)$/i,
];

// Resolved beside this script, not against the caller's working directory: invoked from anywhere
// else, a cwd-relative path silently loads an empty denylist.
const DEFAULT_DENYLIST = join(dirname(fileURLToPath(import.meta.url)), 'guardrail-denylist.txt');

function usage() {
  console.error('usage: node scripts/guardrail-scan.mjs [--file <path>]... [--denylist <path>]');
  process.exit(2);
}

const args = process.argv.slice(2);
const explicitFiles = [];
let denylistPath = DEFAULT_DENYLIST;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file') {
    const path = args[++i];
    if (!path) usage();
    explicitFiles.push(path);
  } else if (args[i] === '--denylist') {
    const path = args[++i];
    if (!path) usage();
    // An explicitly named denylist that does not exist is a mistake, not an empty list: silently
    // loading nothing would make a caller believe a name is blocked when it is not.
    if (!existsSync(path)) {
      console.error(`guardrail-scan: no denylist at ${path}`);
      process.exit(2);
    }
    denylistPath = path;
  } else {
    usage();
  }
}

/** Plain substrings, one per line; `#` starts a comment and blank lines mean nothing. */
function readDenylist(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A NUL byte in the first chunk is as good a binary test as any. */
function looksBinary(buffer) {
  return buffer.subarray(0, 512).includes(0);
}

const RULES = [
  {
    name: 'email address',
    re: /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    ok: (m) => ALLOWED_EMAIL_DOMAINS.some((d) => m.toLowerCase().endsWith('@' + d)),
  },
  {
    name: 'private IP address',
    re: /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g,
    ok: () => false,
  },
  {
    name: 'token-shaped string',
    re: /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
    ok: () => false,
  },
  {
    name: 'long digit run (phone / account number)',
    re: /\b\d{8,}\b/g,
    // Audio/loudness constants and timestamps are legitimate; tokens are not.
    ok: (m) => m.startsWith('20') || m === '22050' || m === '16000',
  },
  // No word-boundary anchors and no case sensitivity: a leak typed in lowercase, or glued to a
  // longer token (`AK2M`, `X26-27-K053`), is the same leak. These are shape rules, so they would
  // rather over-report than let one through.
  {
    // Separators vary (`-`, space, dot, slash): the identifier is the shape, not the punctuation.
    name: 'school circular identifier',
    re: /\d{2}[\W_]{0,3}\d{2}[\W_]{0,3}K\d{3}/gi,
    ok: () => false,
  },
  {
    // Bounded on both sides, and deliberately so: without boundaries this rule fires on ordinary
    // words (`back2school` contains k2s), and a scanner that fails on innocent prose is a scanner
    // people switch off. An identifier glued into a longer token is the circular-id rule's job,
    // which keeps no boundaries at all.
    name: 'class code',
    re: /(?<![A-Za-z])[Kk][1-3][A-Za-z](?![A-Za-z])/g,
    ok: () => false,
  },
];

// Specific names and identifiers get a plain-substring rule each. Shape rules above are preferred:
// an entry here writes the denied name into this public repository.
for (const entry of readDenylist(denylistPath)) {
  RULES.push({
    name: `denylist entry (${entry})`,
    re: new RegExp(escapeRegExp(entry), 'g'),
    ok: () => false,
  });
}

const files = explicitFiles.length
  ? explicitFiles
  : execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .filter((f) => !SKIP.some((re) => re.test(f)));

let failures = 0;
for (const file of files) {
  let text;
  try {
    const buffer = readFileSync(file);
    if (looksBinary(buffer)) continue;
    text = buffer.toString('utf8');
  } catch {
    continue; // unreadable
  }
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      if (rule.ok(m[0])) continue;
      const line = text.slice(0, m.index).split('\n').length;
      console.error(`${file}:${line}  ${rule.name}: ${m[0]}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\nguardrail-scan: ${failures} finding(s). Public repo — fix or remove.`);
  process.exit(1);
}
console.log(`guardrail-scan: clean (${files.length} files scanned)`);
