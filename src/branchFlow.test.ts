import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Proves each branch-flow refusal, not merely that "something" refused: every path of
// scripts/check-branch-flow.sh exits 1 through the same helper, so the message is the
// only thing that says which rule fired.
const SCRIPT = resolve(process.cwd(), 'scripts/check-branch-flow.sh');
const THIS_REPO = 'davidjwip/plm-flashcards';

interface Result {
    code: number;
    out: string;
}

function runFlow(env: Record<string, string>): Result {
    const full = { ...process.env, GITHUB_ACTIONS: 'false', ...env };
    try {
        const out = execFileSync('bash', [SCRIPT], { env: full, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { code: 0, out };
    } catch (error) {
        const failure = error as { status?: number; stdout?: string; stderr?: string };
        return { code: failure.status ?? -1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
    }
}

describe('branch flow', () => {
    it('AC1 allows any pull request into UAT', () => {
        const result = runFlow({ BASE: 'UAT', HEAD: 'feat/anything', HEAD_REPO: THIS_REPO, THIS_REPO });
        expect(result.code).toBe(0);
        expect(result.out).toContain('only main has a source rule');
    });

    it('AC2 allows UAT to main from this repository', () => {
        const result = runFlow({ BASE: 'main', HEAD: 'UAT', HEAD_REPO: THIS_REPO, THIS_REPO });
        expect(result.code).toBe(0);
        expect(result.out).toContain('flow OK: UAT -> main');
    });

    it('AC3 refuses a feature branch heading for main and names UAT as the route', () => {
        const result = runFlow({ BASE: 'main', HEAD: 'feat/anything', HEAD_REPO: THIS_REPO, THIS_REPO });
        expect(result.code).toBe(1);
        expect(result.out).toContain('main only takes merges from UAT');
        expect(result.out).toContain('feat/anything -> main');
    });

    it('AC4 refuses a fork and says the source is a fork', () => {
        const result = runFlow({ BASE: 'main', HEAD: 'UAT', HEAD_REPO: 'someone/plm-flashcards', THIS_REPO });
        expect(result.code).toBe(1);
        expect(result.out).toContain('not a fork');
        expect(result.out).toContain('someone/plm-flashcards');
    });

    it('AC5 refuses when provenance cannot be proved', () => {
        const result = runFlow({ BASE: 'main', HEAD: 'UAT', HEAD_REPO: '', THIS_REPO });
        expect(result.code).toBe(1);
        expect(result.out).toContain('cannot prove where');
    });

    it('AC6 exits 2 when BASE or HEAD is missing', () => {
        const missingBase = runFlow({ BASE: '', HEAD: 'UAT', HEAD_REPO: THIS_REPO, THIS_REPO });
        expect(missingBase.code).toBe(2);
        expect(missingBase.out).toContain('BASE and HEAD are required');

        const missingHead = runFlow({ BASE: 'main', HEAD: '', HEAD_REPO: THIS_REPO, THIS_REPO });
        expect(missingHead.code).toBe(2);
        expect(missingHead.out).toContain('BASE and HEAD are required');
    });
});
