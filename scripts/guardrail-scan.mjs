// Guardrail scan: the things that must never reach a public repo.
// Runs in CI and locally. Deliberately dumb and readable — a clever scanner
// nobody understands is worse than a plain one everybody can audit.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOWED_EMAIL_DOMAINS = ['users.noreply.github.com', 'example.com'];

// Files we never scan: lockfiles are noise, this scanner contains the patterns.
const SKIP = [/^package-lock\.json$/, /^scripts\/guardrail-scan\.mjs$/];

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
];

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !SKIP.some((re) => re.test(f)));

let failures = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // binary or unreadable
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
console.log(`guardrail-scan: clean (${files.length} tracked files)`);
