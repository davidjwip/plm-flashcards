import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Drives the real scanner so each rule is proved end to end, not by importing a regex.
const SCANNER = resolve(process.cwd(), 'scripts/guardrail-scan.mjs');

interface Result {
  code: number;
  out: string;
}

function run(args: string[], cwd = process.cwd()): Result {
  try {
    const out = execFileSync(process.execPath, [SCANNER, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? -1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

function tempFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'plm-guardrail-'));
  const file = join(dir, name);
  writeFileSync(file, content);
  return file;
}

describe('guardrail scan — school and class identifiers', () => {
  it('AC1 a circular identifier fails the scan and names its rule', () => {
    const id = ['26', '27', 'K053'].join('-');
    const file = tempFile('leak.txt', `circular ${id}\n`);

    const result = run(['--file', file]);

    expect(result.code).toBe(1);
    expect(result.out).toContain('school circular identifier');
    expect(result.out).toContain(id);
  });

  it('AC2 a class code fails the scan and names its rule', () => {
    const code = 'K' + 2 + 'M';
    const file = tempFile('class.txt', `class ${code}\n`);

    const result = run(['--file', file]);

    expect(result.code).toBe(1);
    expect(result.out).toContain('class code');
    expect(result.out).toContain(code);
  });

  it("AC3 the repository's own tree passes", () => {
    const result = run([]);

    expect(result.code, result.out).toBe(0);
    expect(result.out).toMatch(/clean \(\d+ files scanned\)/);
  });

  it('AC7a an identifier separated by other punctuation is still a finding', () => {
    // The shape is the identifier, not its punctuation: a hyphen is how it is written, not the only
    // way it can appear in a document.
    for (const separator of [' ', '.', '/']) {
      const id = ['26', '27', 'K053'].join(separator);
      const file = tempFile('spaced.txt', `ref ${id}\n`);

      const result = run(['--file', file]);

      expect(result.code, separator).toBe(1);
      expect(result.out, separator).toContain('school circular identifier');
      expect(result.out, separator).toContain(id);
    }
  });

  it('AC7 a lowercase or embedded identifier is still a finding', () => {
    // A leak typed in lowercase, or glued to a longer token, is the same leak: the rules are shapes,
    // not spellings, and they must not depend on a word boundary or on capitalisation.
    const lower = ['26', '27', 'k053'].join('-');
    const embedded = 'AK' + 2 + 'M';
    const file = tempFile('sneaky.txt', `ref ${lower}\ncode ${embedded}\n`);

    const result = run(['--file', file]);

    expect(result.code).toBe(1);
    expect(result.out).toContain('school circular identifier');
    expect(result.out).toContain(lower);
    expect(result.out).toContain('class code');
    // Built, not typed: a literal here would be a class code in the repo, and the scanner would find
    // it — which is how this line was caught.
    expect(result.out).toContain('K' + 2 + 'M');
  });

  it('AC4 ordinary word-bank-shaped text passes', () => {
    const file = tempFile(
      'words.txt',
      ['salad', 'chicken', 'potato', 'fish', 'cheese', 'rice', 'milk'].join('\n'),
    );

    const result = run(['--file', file]);

    expect(result.code, result.out).toBe(0);
    expect(result.out).toContain('clean');
  });

  it('AC5 a denylist entry fails the scan and names it', () => {
    const entry = ['Zzq', 'guardrail', 'probe'].join('-');
    const dir = mkdtempSync(join(tmpdir(), 'plm-guardrail-denylist-'));
    const denylist = join(dir, 'denylist.txt');
    writeFileSync(denylist, `# probe\n${entry}\n`);
    const file = join(dir, 'words.txt');
    writeFileSync(file, `ordinary words\n${entry}\n`);

    // The denylist is read from beside the script by default; the flag is how a test points it at a
    // fixture, and it is also how a caller blocks a name without touching the repository's own copy.
    const result = run(['--file', file, '--denylist', denylist]);

    expect(result.code).toBe(1);
    expect(result.out).toContain('denylist');
    expect(result.out).toContain(entry);
  });

  it('AC6b a named denylist that does not exist exits 2 instead of loading nothing', () => {
    const file = tempFile('words.txt', 'ordinary words\n');

    const result = run(['--file', file, '--denylist', join(tmpdir(), 'no-such-denylist.txt')]);

    expect(result.code).toBe(2);
    expect(result.out).toContain('no denylist');
  });

  it('AC6 an unknown argument exits 2 with usage', () => {
    const result = run(['--bogus']);

    expect(result.code).toBe(2);
    expect(result.out).toContain('usage');
  });
});
