import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bank from '../data/wordbank.json';
import pool from '../data/nonsense.json';
import denylist from '../data/denylist.json';
import bee from '../data/bee.json';
import manifest from './audio-manifest.json';

/**
 * AC70 — the safety gate over every word source.
 *
 * Background: a review found profanity and slurs in both the bank and the nonsense pool, each
 * with a committed audio file. The cause was treating the system dictionary as an authority on
 * what belongs in a K2 word bank. These tests exist so that class of mistake fails the build.
 */

const denied = new Set(denylist.deny);
const notWords = new Set(denylist.notWords);
const strong = denylist.strongSubstrings as string[];

describe('AC70 — no word source may contain a word this app must not say', () => {
  it('AC70 — no bank word is on the denylist', () => {
    const bad = bank.words
      .map((entry) => entry.word)
      .filter((word) => denied.has(word) || notWords.has(word));
    expect(bad, `bank words on the denylist: ${bad.join(', ')}`).toEqual([]);
  });

  it('AC70 — no nonsense word is on the denylist or contains a denied fragment', () => {
    const bad = pool.words.filter(
      (word) =>
        denied.has(word) ||
        notWords.has(word) ||
        strong.some((fragment) => word.includes(fragment)),
    );
    expect(bad, `nonsense words that must not ship: ${bad.join(', ')}`).toEqual([]);
  });

  it('AC70 — the fragments are long enough to be safe, and only generated words face them', () => {
    // A four-letter floor is what keeps `night` (nig), `grass` (ass) and `pass` from being
    // rejected: those fragments are deliberately absent. `grape` happens to contain `rape`,
    // which is why fragments are never applied to real words — only to generated nonsense.
    for (const fragment of strong) {
      expect(fragment.length, `fragment "${fragment}" is too short to screen safely`).toBeGreaterThanOrEqual(4);
    }
    expect(strong).not.toContain('nig');
    expect(strong).not.toContain('ass');
    expect('grape'.includes('rape')).toBe(true);

    const bankWords = new Set(bank.words.map((entry) => entry.word));
    const wouldTrip = [...bankWords].filter((word) => strong.some((f) => word.includes(f)));
    // If any real word does contain a fragment, it must still pass: the bank is screened on
    // exact matches only. The validator test below proves that path.
    for (const word of wouldTrip) {
      expect(denied.has(word) || notWords.has(word), `${word} must rely on exact matching`).toBe(false);
    }
  });

  it('AC70 — the validator refuses a bank containing a denied word', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plm-denylist-'));
    const fixture = join(dir, 'bank.json');
    writeFileSync(
      fixture,
      JSON.stringify({
        ...bank,
        words: [...bank.words, { word: 'fuck', patterns: ['ck'] }],
      }),
    );

    let status = 0;
    let stderr = '';
    try {
      execFileSync(process.execPath, ['scripts/validate-bank.mjs', fixture], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error) {
      const failure = error as { status?: number; stderr?: string };
      status = failure.status ?? 1;
      stderr = failure.stderr ?? '';
    }

    expect(status, 'the validator must exit non-zero for a denied word').toBe(1);
    expect(stderr).toContain('fuck');
    expect(stderr).toContain('denylist');
  });
});

describe('AC66 — every word the app can serve has a committed mp3', () => {
  it('AC66 — bank, nonsense pool and bee deck are all voiced', () => {
    const voiced = new Set(manifest.words);
    const sources: Array<[string, string[]]> = [
      ['bank', bank.words.map((entry) => entry.word)],
      ['nonsense pool', pool.words],
      ['bee deck', [...bee.starters, ...bee.movers]],
    ];

    const missing = sources.flatMap(([label, words]) =>
      words.filter((word) => !voiced.has(word)).map((word) => `${label}: ${word}`),
    );
    expect(missing, `words that would fall back to the device voice: ${missing.join(', ')}`).toEqual(
      [],
    );

    const noFile = [...voiced].filter((word) => !existsSync(`public/audio/${word}.mp3`));
    expect(noFile, `manifest entries without a file: ${noFile.join(', ')}`).toEqual([]);
  });
});
