import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import bankJson from '../data/wordbank.json';
import type { Bank } from './types';

const bank = bankJson as Bank;
const tags = new Map(bank.words.map((entry) => [entry.word, entry.patterns]));

// The seven food words added for November practice (specs/november-food-words.md). Tags are the
// patterns the word demonstrates, in the order they are met reading it — B2. Bank data only: no
// school, class or term detail belongs in this public repository.
const FOOD_WORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['salad', ['a', 'schwa']],
    ['chicken', ['ch', 'i', 'ck']],
    ['potato', ['schwa']],
    ['fish', ['i', 'sh']],
    ['cheese', ['ch', 'ee']],
    ['rice', ['i_e']],
    ['milk', ['i', '-lk']],
];

describe('november food words', () => {
    it('AC1 every word is in the bank', () => {
        for (const [word] of FOOD_WORDS) {
            expect(tags.has(word), `${word} is missing from data/wordbank.json`).toBe(true);
        }
    });

    it('AC2 every word carries the patterns it shows', () => {
        for (const [word, patterns] of FOOD_WORDS) {
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
