import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * AC35–AC44 describe a look and a landing flow, not engine arithmetic. The
 * conventions for this repo forbid jsdom layout assertions, so the contract is
 * read from the view strings, the wiring source and the stylesheet text.
 */
const views = readFileSync('src/views.ts', 'utf8');
const app = readFileSync('src/app.ts', 'utf8');
const main = readFileSync('src/main.ts', 'utf8');
const styles = readFileSync('src/styles.css', 'utf8');
const index = readFileSync('index.html', 'utf8');

describe('v2 UI — one-screen maths-game landing', () => {
  it('AC35 — a fresh load opens a short-vowel run', () => {
    expect(app).toMatch(
      /DEFAULT_PATTERNS\s*=\s*\[\s*'a'\s*,\s*'e'\s*,\s*'i'\s*,\s*'o'\s*,\s*'u'\s*\]/,
    );
    expect(app).toMatch(/loadSelection\(store\)[\s\S]{0,300}DEFAULT_PATTERNS/);
    expect(app).toMatch(/(?:startPatternRun|startBeeRun)\(\);\s*render\(\);/);
    expect(app).not.toContain('renderSettings');
    expect(views).toContain('data-testid="word"');
  });

  it('AC36 — the header carries the mode and word-list toggles', () => {
    expect(app).toContain('headerView(');
    expect(views).toMatch(/<header class="app-header">[\s\S]*modeBar\(mode\)/);
    expect(views).toContain('data-testid="mode-patterns"');
    expect(views).toContain('data-testid="mode-bee"');
    expect(views).toContain('data-testid="pattern-toggle"');
    expect(views).toMatch(/aria-pressed="\$\{active\('patterns'\)\}"/);
  });

  it('AC37 — bee mode is reachable from a plain load', () => {
    expect(main).toMatch(/beeDeck:\s*beeJson/);
    expect(main).not.toMatch(/\?\s*\{\s*beeDeck/);
    expect(app).not.toContain('Boolean(beeDeck)');
    expect(app).toContain('startBeeRun');
    expect(views).toContain('data-testid="peek"');
  });

  it('AC38 — the word sits in the framed box before the verdicts', () => {
    const box = views.indexOf('data-testid="word-box"');
    const word = views.indexOf('data-testid="word"');
    const verdicts = views.indexOf('data-testid="verdict-pad"');
    expect(box).toBeGreaterThan(-1);
    expect(word).toBeGreaterThan(box);
    expect(verdicts).toBeGreaterThan(word);
  });

  it('AC39 — the verdict pair fills the pad, enabled and two columns', () => {
    expect((views.match(/data-testid="mark-right"/g) ?? []).length).toBe(1);
    expect((views.match(/data-testid="mark-wrong"/g) ?? []).length).toBe(1);
    expect(views).toMatch(
      /data-testid="verdict-pad"[\s\S]*data-testid="mark-right"[\s\S]*data-testid="mark-wrong"/,
    );
    expect(views).not.toMatch(/data-testid="mark-(?:right|wrong)"[^>]*disabled/);
    expect(styles).toMatch(
      /\.verdict-pad\s*\{[^}]*grid-template-columns:\s*(?:repeat\(2|1fr\s+1fr)/,
    );
    expect(styles).toMatch(/\.verdict-pad\s*\{[^}]*gap:\s*10px/);
    expect(styles).toMatch(/\.verdict\s*\{[^}]*min-height:\s*96px/);
  });

  it('AC40 — the stylesheet carries the maths palette and the font', () => {
    expect(styles).toContain('#ff6b6b');
    expect(styles).toContain('#4ecdc4');
    expect(styles).toMatch(/#ffd1dc[\s\S]*#a2d8f1/);
    expect(styles).toMatch(/border-radius:\s*15px/);
    expect(styles).toMatch(
      /(?:box-shadow|--shadow-card):\s*0\s+10px\s+30px\s+rgba\(0,\s*0,\s*0,\s*0?\.2\)/,
    );
    expect(styles).toMatch(/@font-face\s*\{[^}]*font-family:\s*'Fredoka'/);
    expect(styles).toMatch(/@font-face\s*\{[^}]*font-weight:\s*300\s+700/);
    expect(styles).toContain('/fonts/fredoka-latin.woff2');
    expect(styles).toContain('/fonts/fredoka-latin-ext.woff2');
    expect(styles).not.toMatch(/https?:\/\//);
  });

  it('AC41 — bee practice hides the word and drops the size controls', () => {
    expect(views).toContain('data-testid="word-box"');
    expect(views).toContain('data-testid="peek"');
    expect(views).toMatch(
      /data-testid="word-box"[\s\S]*data-testid="word"[\s\S]*hideWord \? ' hidden' : ''/,
    );
    expect(views).toMatch(/hideWord\s*\?\s*''\s*:\s*`[^`]*data-testid="word-smaller"/);
  });

  it('AC42 — every test id the browser suites need still renders', () => {
    const contract = [
      'app',
      'mode-bar',
      'mode-patterns',
      'mode-bee',
      'pattern-toggle',
      'pattern-option',
      'word-count',
      'word',
      'mark-right',
      'mark-wrong',
      'progress',
      'hear',
      'track',
      'celebration',
      'celebration-close',
      'word-box',
      'verdict-pad',
    ];
    for (const id of contract) {
      expect(views + index, `test id "${id}" must exist`).toContain(`data-testid="${id}"`);
    }
  });

  it('AC43 — the verdict pad stays two columns under 600px', () => {
    const small = styles.match(/@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(small).toMatch(
      /\.verdict-pad\s*\{[^}]*grid-template-columns:\s*(?:repeat\(2|1fr\s+1fr)/,
    );
    expect(small).toMatch(/\.(?:game|app-card)\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it('AC44 — unticking everything does not restart the run', () => {
    expect(views).toMatch(/pick at least one pattern/i);
    expect(app).toMatch(
      /if \(next\.length === 0\)\s*\{[^}]*render\(\)[^}]*return;[^}]*\}[\s\S]{0,160}startPatternRun\(\)/,
    );
  });
});
