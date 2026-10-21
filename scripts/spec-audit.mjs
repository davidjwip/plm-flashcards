#!/usr/bin/env node
// scripts/spec-audit.mjs
// Deterministic spec↔test audit. No model, no network, no dependency.
// Turns the prose in .opencode/commands/audit.md into something that can fail a build.
//
//   uncovered   — a criterion in specs/ with no row in the test map
//   orphaned    — a test naming an AC id the spec does not define
//   mislabelled — a map row pointing at a test file that does not name its criterion,
//                 a missing file, or "green" for something that is not there
//   stale-refs  — `npm run X` in AGENTS.md / .opencode/** where X is not a script
//   diff-scope  — implementation changed with no test change (warn; fail under --strict)
//
// House conventions this encodes:
//   * suffixed ids (AC13b, AC19c) are sub-cases of their base criterion — never orphaned
//   * a map row may point at a non-test file (e.g. `vitest.config.ts` thresholds) or at
//     `(step N)` for work not yet built; the latter is reported as pending, not failed
//   * specs/TEMPLATE.md is an example, not the spec
//
// Usage:
//   node scripts/spec-audit.mjs [--base=origin/main] [--strict] [--json]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=origin/main').split('=')[1];
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');

const findings = [];
const note = (sev, check, message, where = '') => findings.push({ sev, check, message, where });
const baseOf = (id) => id.replace(/[a-z]$/, '');
const isTestPath = (p) => /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(p);

function git(...cmd) {
  try {
    return execFileSync('git', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (['node_modules', '.git', 'dist', 'verify', 'coverage'].includes(name)) continue;
      walk(p, filter, out);
    } else if (filter(p)) out.push(p);
  }
  return out;
}

// "AC13" -> [AC13]; "AC13/14" -> [AC13, AC14]; "AC5/AC6/8" -> [AC5, AC6, AC8]; "AC16 rearm" -> [AC16]
function acIds(cell) {
  const ids = new Set();
  let prefixed = false;
  for (const part of cell.split('/')) {
    const withPrefix = part.match(/AC\s*(\d+)([a-z]?)/i);
    if (withPrefix) {
      prefixed = true;
      ids.add(`AC${withPrefix[1]}${withPrefix[2] ?? ''}`);
      continue;
    }
    const bare = prefixed ? part.match(/(\d+)([a-z]?)/) : null;
    if (bare) ids.add(`AC${bare[1]}${bare[2] ?? ''}`);
  }
  return [...ids];
}

// ---------- specs ----------
const specFiles = walk('specs', (p) => p.endsWith('.md') && !/TEMPLATE\.md$/i.test(p));
const defined = new Map(); // id (or base) -> {file, line}
const mapRows = []; // {ids, target, description, status, file, line}

for (const file of specFiles) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (!line.trim().startsWith('|')) return;
      const cols = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cols.length < 3) return;
      const ids = acIds(cols[0]);
      if (!ids.length) return;

      const targetCell = cols[1] ?? '';
      // A map row names a target: a backticked path, `(step N)`, or a bare path like
      // `vitest.config.ts thresholds`.
      const looksLikeMapRow = /^(`[^`]+`|\(step \d+\))$/.test(targetCell) || /[\w./-]+\.\w+/.test(targetCell);
      if (looksLikeMapRow) {
        mapRows.push({
          ids,
          target: (targetCell.replace(/`/g, '').match(/[\w./-]+\.\w+/)?.[0] ?? targetCell.replace(/`/g, '')),
          description: cols[2] ?? '',
          status: (cols[cols.length - 1] ?? '').toLowerCase(),
          file,
          line: i + 1,
        });
      } else {
        for (const id of ids) if (!defined.has(id)) defined.set(id, { file, line: i + 1 });
      }
    });
}

if (defined.size === 0) {
  console.error('spec-audit: no acceptance criteria found in specs/ — nothing to check.');
  process.exit(1);
}

// ---------- tests ----------
const testFiles = walk('.', isTestPath);
const tests = [];
for (const file of testFiles) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = line.match(/(?:it|test)(?:\.\w+)?\(\s*(['"`])(.+?)\1/);
      if (m) tests.push({ file: file.replace(/^\.\//, ''), line: i + 1, name: m[2], ids: acIds(m[2]) });
    });
}
const idsInFile = (file) =>
  [...new Set(tests.filter((t) => t.file === file).flatMap((t) => t.ids.map(baseOf)))].sort();
const namesId = (file, id) =>
  tests.some((t) => t.file === file && t.ids.some((t2) => baseOf(t2) === baseOf(id)));

// ---------- 1. uncovered ----------
const mappedBases = new Set(mapRows.flatMap((r) => r.ids.map(baseOf)));
for (const [id, at] of defined) {
  if (!mappedBases.has(baseOf(id))) {
    note('FAIL', 'uncovered', `${id} is defined but has no row in the test map`, `${at.file}:${at.line}`);
  }
}

// ---------- 2. orphaned ----------
for (const t of tests) {
  for (const id of t.ids) {
    if (!defined.has(id) && !defined.has(baseOf(id))) {
      note('FAIL', 'orphaned', `test names ${id}, which the spec does not define: "${t.name}"`, `${t.file}:${t.line}`);
    }
  }
}
for (const row of mapRows) {
  for (const id of row.ids) {
    if (!defined.has(id) && !defined.has(baseOf(id))) {
      note('FAIL', 'orphaned', `test map has a row for ${id}, which the spec does not define`, `${row.file}:${row.line}`);
    }
  }
}

// ---------- 3. mislabelled ----------
for (const row of mapRows) {
  const label = row.ids.join('/');
  if (/^\(step \d+\)$/.test(row.target)) {
    note('WARN', 'mislabelled', `${label} is mapped to "${row.target}" — work not built yet (${row.status})`, `${row.file}:${row.line}`);
    continue;
  }
  if (!existsSync(row.target)) {
    note('FAIL', 'mislabelled', `${label} maps to ${row.target}, which does not exist`, `${row.file}:${row.line}`);
    continue;
  }
  if (!isTestPath(row.target)) continue; // a config or doc file may legitimately carry a criterion

  for (const id of row.ids) {
    if (!namesId(row.target, id)) {
      const actual = idsInFile(row.target);
      note(
        'FAIL',
        'mislabelled',
        `${label} maps to ${row.target}, but no test there names ${baseOf(id)}${actual.length ? ` (that file names: ${actual.join(', ')})` : ' (that file names no criteria at all)'}`,
        `${row.file}:${row.line}`,
      );
    }
  }
  if (row.status && row.status !== 'green') {
    note('WARN', 'mislabelled', `${label} is marked "${row.status}"`, `${row.file}:${row.line}`);
  }
}

// ---------- 4. stale `npm run X` references ----------
let scripts = {};
try {
  scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {};
} catch {
  /* no package.json */
}
for (const file of ['AGENTS.md', 'REVIEW.md', ...walk('.opencode', (p) => p.endsWith('.md'))]) {
  if (!existsSync(file)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // Two characters minimum: `npm run X` in prose is a placeholder, not a reference.
      for (const m of line.matchAll(/npm run ([a-zA-Z0-9:_-]{2,})/g)) {
        if (!(m[1] in scripts)) {
          note('FAIL', 'stale-refs', `\`npm run ${m[1]}\` is referenced but is not a script in package.json`, `${file}:${i + 1}`);
        }
      }
    });
}

// ---------- 5. diff scope ----------
const changed = git('diff', '--name-only', `${BASE}...HEAD`).split('\n').filter(Boolean);
const changedSrc = changed.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const changedTests = changed.filter(isTestPath);
if (changedSrc.length && !changedTests.length) {
  note(
    STRICT ? 'FAIL' : 'WARN',
    'diff-scope',
    `${changedSrc.length} implementation file(s) changed with no test change (${changedSrc.slice(0, 3).join(', ')}${changedSrc.length > 3 ? ', …' : ''})`,
  );
}

// ---------- report ----------
const fails = findings.filter((f) => f.sev === 'FAIL');
const warns = findings.filter((f) => f.sev === 'WARN');

if (JSON_OUT) {
  console.log(JSON.stringify({ base: BASE, criteria: defined.size, mapRows: mapRows.length, tests: tests.length, fails, warns }, null, 2));
} else {
  console.log(`\nspec-audit — ${defined.size} criteria · ${mapRows.length} map rows · ${tests.length} tests · base ${BASE}\n`);
  for (const check of ['uncovered', 'orphaned', 'mislabelled', 'stale-refs', 'diff-scope']) {
    const rows = findings.filter((f) => f.check === check);
    if (!rows.length) {
      console.log(`  ok    ${check}`);
      continue;
    }
    console.log(`  ${rows.some((r) => r.sev === 'FAIL') ? 'FAIL' : 'warn'}  ${check}`);
    for (const r of rows) console.log(`          ${r.sev === 'FAIL' ? '✗' : '!'} ${r.message}${r.where ? `  (${r.where})` : ''}`);
  }
  console.log(`\n  ${fails.length === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${fails.length})`}${warns.length ? ` · ${warns.length} warning(s)` : ''}\n`);
}

process.exit(fails.length === 0 ? 0 : 1);
