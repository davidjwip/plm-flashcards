import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import bankJson from '../data/wordbank.json';
import type { Bank } from './types';

const bank = bankJson as Bank;
const tags = new Map(bank.words.map((entry) => [entry.word, entry.patterns]));

// November 2026, circular 26-27-K053 (theme: food). Tags are the patterns the word
// demonstrates, in the order they are met reading it — see specs/november-food-words.md B2.
const NOVEMBER: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['salad', ['a', 'schwa']],
    ['chicken', ['ch', 'i', 'ck']],
    ['potato', ['schwa']],
    ['fish', ['i', 'sh']],
    ['cheese', ['ch', 'ee']],
    ['rice', ['i_e']],
    ['milk', ['i', '-lk']],
];

describe('november food words', () => {
    it('AC1 every November word is in the bank', () => {
        for (const [word] of NOVEMBER) {
            expect(tags.has(word), `${word} is missing from data/wordbank.json`).toBe(true);
        }
    });

    it('AC2 every November word carries the patterns it shows', () => {
        for (const [word, patterns] of NOVEMBER) {
            expect(tags.get(word), `${word} is tagged ${JSON.stringify(tags.get(word))}`).toEqual([
                ...patterns,
            ]);
        }
    });

    it('AC3 the retagged bank passes its own validator', () => {
        const out = execFileSync('node', [join(process.cwd(), 'scripts', 'validate-bank.mjs')], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        expect(out).toContain('all valid');
    });
});
