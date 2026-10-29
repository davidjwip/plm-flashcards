import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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

  it('AC4 ordinary word-bank-shaped text passes', () => {
    const file = tempFile(
      'words.txt',
      ['salad', 'chicken', 'potato', 'fish', 'cheese', 'rice', 'milk'].join('\n'),
    );

    const result = run(['--file', file]);

    expect(result.code, result.out).toBe(0);
    expect(result.out).toContain('clean');
  });

  it('AC3b a denylist entry fails the scan and names it', () => {
    const entry = ['Zzq', 'guardrail', 'probe'].join('-');
    const dir = mkdtempSync(join(tmpdir(), 'plm-guardrail-denylist-'));
    mkdirSync(join(dir, 'scripts'));
    writeFileSync(join(dir, 'scripts', 'guardrail-denylist.txt'), `# probe\n${entry}\n`);
    const file = join(dir, 'words.txt');
    writeFileSync(file, `ordinary words\n${entry}\n`);

    const result = run(['--file', file], dir);

    expect(result.code).toBe(1);
    expect(result.out).toContain('denylist');
    expect(result.out).toContain(entry);
  });

  it('rejects an unknown argument with exit 2 and usage', () => {
    const result = run(['--bogus']);

    expect(result.code).toBe(2);
    expect(result.out).toContain('usage');
  });
});
