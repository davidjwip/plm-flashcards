// Guardrail scan: the things that must never reach a public repo.
// Runs in CI and locally. Deliberately dumb and readable — a clever scanner
// nobody understands is worse than a plain one everybody can audit.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const ALLOWED_EMAIL_DOMAINS = ['users.noreply.github.com', 'example.com'];

// Files we never scan: lockfiles are noise, this scanner contains the patterns,
// the denylist contains the names it denies by design, and binary assets
// (audio, images, fonts) cannot contain a readable secret.
const SKIP = [
  /^package-lock\.json$/,
  /^scripts\/guardrail-scan\.mjs$/,
  /^scripts\/guardrail-denylist\.txt$/,
  /\.(?:mp3|wav|ogg|png|jpe?g|gif|webp|ico|woff2?|ttf|zip)$/i,
];

const DENYLIST = 'scripts/guardrail-denylist.txt';

/** Plain substrings, one per line; `#` starts a comment and blank lines mean nothing. */
function readDenylist() {
  if (!existsSync(DENYLIST)) return [];
  return readFileSync(DENYLIST, 'utf8')
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
  {
    name: 'school circular identifier',
    re: /\b\d{2}-\d{2}-K\d{3}\b/g,
    ok: () => false,
  },
  {
    name: 'class code',
    re: /\bK[1-3][A-Z]\b/g,
    ok: () => false,
  },
];

// Specific names and identifiers get a plain-substring rule each. Shape rules above are
// preferred: an entry here writes the denied name into this public repository.
for (const entry of readDenylist()) {
  RULES.push({
    name: `denylist entry (${entry})`,
    re: new RegExp(escapeRegExp(entry), 'g'),
    ok: () => false,
  });
}

function usage() {
  console.error('usage: node scripts/guardrail-scan.mjs [--file <path>]...');
  process.exit(2);
}

const args = process.argv.slice(2);
const explicitFiles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--file') usage();
  const path = args[++i];
  if (!path) usage();
  explicitFiles.push(path);
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
