import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import bankJson from '../data/wordbank.json';
import manifest from './audio-manifest.json';
import type { Bank } from './types';

const bank = bankJson as Bank;

const VALIDATOR = join(process.cwd(), 'scripts', 'validate-bank.mjs');
const REAL_BANK = join(process.cwd(), 'data', 'wordbank.json');

const START_CLUSTERS = [
  'bl-',
  'br-',
  'cl-',
  'cr-',
  'dr-',
  'fl-',
  'fr-',
  'gl-',
  'gr-',
  'pl-',
  'pr-',
  'sc-',
  'scr-',
  'shr-',
  'sk-',
  'sl-',
  'sm-',
  'sn-',
  'sp-',
  'spl-',
  'spr-',
  'squ-',
  'st-',
  'str-',
  'sw-',
  'thr-',
  'tr-',
];

const END_CLUSTERS = [
  '-nd',
  '-nt',
  '-nk',
  '-mp',
  '-nch',
  '-st',
  '-sk',
  '-sp',
  '-lt',
  '-ld',
  '-lp',
  '-lf',
  '-lk',
  '-ft',
  '-pt',
  '-ct',
  '-xt',
  '-ll',
  '-ss',
];

const CLUSTER_IDS = [...START_CLUSTERS, ...END_CLUSTERS];

const isStartCluster = (id: string) => /^[a-z]{2,3}-$/.test(id);
const isEndCluster = (id: string) => /^-[a-z]{2,3}$/.test(id);

function runValidator(file: string): string {
  return execFileSync(process.execPath, [VALIDATOR, file], { encoding: 'utf8' });
}

function collectFailure(file: string): { status?: number; stderr?: string } {
  try {
    runValidator(file);
  } catch (error) {
    return error as { status?: number; stderr?: string };
  }
  throw new Error(`validator accepted ${file}`);
}

describe('level 2 clusters — bank data contract', () => {
  it('AC60 — every cluster pattern reaches its word floor', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cluster-floor-'));
    const fixture = join(dir, 'wordbank.json');
    writeFileSync(
      fixture,
      JSON.stringify({
        patterns: [{ id: 'sm-', label: 'sm (start)' }],
        words: [
          { word: 'smash', patterns: ['sm-'] },
          { word: 'smog', patterns: ['sm-'] },
          { word: 'smug', patterns: ['sm-'] },
        ],
      }),
    );

    try {
      const failure = collectFailure(fixture);
      expect(failure.status).not.toBe(0);
      expect(failure.stderr).toContain('pattern sm- has 3 words, floor is 10');
      expect(() => runValidator(REAL_BANK)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('AC61 — cluster tags match spelling and position', () => {
    const bankClusterIds = bank.patterns
      .map((pattern) => pattern.id)
      .filter((id) => isStartCluster(id) || isEndCluster(id));

    expect(bankClusterIds).toHaveLength(CLUSTER_IDS.length);
    expect(new Set(bankClusterIds)).toEqual(new Set(CLUSTER_IDS));

    const labels = new Map(bank.patterns.map((pattern) => [pattern.id, pattern.label]));
    for (const id of CLUSTER_IDS) {
      const expected = id.endsWith('-') ? `${id.slice(0, -1)} (start)` : `${id} (end)`;
      expect(labels.get(id), `${id} must exist with its position in the label`).toBe(expected);
    }

    expect(bank.patterns.some((pattern) => pattern.id === '-ck')).toBe(false);
    expect(bank.patterns.some((pattern) => pattern.id === '-ng')).toBe(false);

    for (const entry of bank.words) {
      for (const tag of entry.patterns) {
        if (isStartCluster(tag)) {
          const cluster = tag.slice(0, -1);
          expect(entry.word.startsWith(cluster), `${entry.word} must start with ${cluster}`).toBe(
            true,
          );
          expect(entry.word.length, `${entry.word} must be longer than ${cluster}`).toBeGreaterThan(
            cluster.length,
          );
        } else if (isEndCluster(tag)) {
          const cluster = tag.slice(1);
          expect(entry.word.endsWith(cluster), `${entry.word} must end with ${cluster}`).toBe(true);
          expect(entry.word.length, `${entry.word} must be longer than ${cluster}`).toBeGreaterThan(
            cluster.length,
          );
        }
      }
    }
  });

  it('AC62 — every bank word has committed Sonia audio', () => {
    expect(manifest.voice).toBe('en-GB-SoniaNeural');

    const voiced = new Set(manifest.words);
    for (const entry of bank.words) {
      expect(voiced.has(entry.word), `${entry.word} is missing from audio-manifest.json`).toBe(
        true,
      );
    }

    for (const word of manifest.words) {
      expect(existsSync(join('public', 'audio', `${word}.mp3`)), `${word} has no mp3`).toBe(true);
    }
  });
});
