import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSession, mark } from './engine';
import { headerView, trackView } from './views';
import type { Session } from './types';

/**
 * AC35–AC49 describe a look and a landing flow, not engine arithmetic. The
 * conventions for this repo forbid jsdom layout assertions, so the contract is
 * read from the view strings, the wiring source and the stylesheet text.
 */
const views = readFileSync('src/views.ts', 'utf8');
const app = readFileSync('src/app.ts', 'utf8');
const main = readFileSync('src/main.ts', 'utf8');
const styles = readFileSync('src/styles.css', 'utf8');
const index = readFileSync('index.html', 'utf8');

function sessionWith(right: number, wrong = 0): Session {
  let session = createSession(
    Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, patterns: ['ai'] })),
  );
  for (let i = 0; i < wrong; i++) session = mark(session, 'wrong');
  for (let i = 0; i < right; i++) session = mark(session, 'right');
  return session;
}

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

  it('AC45 — the title is the maths scale and centred', () => {
    const patterns = headerView('patterns', 'Patterns · 5', false, '10 words');
    const bee = headerView('bee', 'Levels · 3', false, '10 words');
    expect(patterns).toContain('<h1 class="title">Sound practice</h1>');
    expect(bee).toContain('<h1 class="title">Spelling bee</h1>');
    expect(patterns).toContain('class="subtitle"');
    expect(bee).toContain('class="subtitle"');

    expect(styles).toMatch(/\.app-header\s*\{[^}]*text-align:\s*center/);
    expect(styles).toMatch(/\.title\s*\{[^}]*font-size:\s*2\.5rem/);
    expect(styles).toMatch(/\.title\s*\{[^}]*color:\s*var\(--coral\)/);
    expect(styles).toMatch(/\.title\s*\{[^}]*text-shadow:\s*2px\s+2px\s+0\s+#ffd1dc/);
    expect(styles).toMatch(/\.subtitle\s*\{[^}]*color:\s*var\(--teal\)/);
    expect(styles).toMatch(/\.subtitle\s*\{[^}]*font-size:\s*1\.2rem/);

    const small = styles.match(/@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(small).toMatch(/\.title\s*\{[^}]*font-size:\s*2rem/);
  });

  it('AC46 — the active mode pill ring is not clipped', () => {
    const bar = styles.match(/\.mode-bar\s*\{[^}]*\}/)?.[0] ?? '';
    expect(bar).not.toMatch(/overflow\s*:\s*hidden/);
    expect(bar).toMatch(/border-radius:\s*50px/);

    expect(styles).toMatch(
      /\.mode-bar\s+button:first-child\s*\{[^}]*border-radius:\s*50px\s+0\s+0\s+50px/,
    );
    expect(styles).toMatch(
      /\.mode-bar\s+button:last-child\s*\{[^}]*border-radius:\s*0\s+50px\s+50px\s+0/,
    );
    expect(styles).toMatch(
      /\.mode-bar\s+button\.on\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+4px\s+rgba\(78,\s*205,\s*196,\s*0?\.4\)/,
    );
  });

  it('AC47 — the bee peek button is double height', () => {
    expect(views).toContain('class="peek-btn" data-testid="peek"');
    expect(views).not.toMatch(/class="action-btn"[^>]*data-testid="peek"/);

    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*min-height:\s*5rem/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*width:\s*100%/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*max-width:\s*24rem/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*margin:\s*0\s+auto/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*font-size:\s*1\.15rem/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*background:\s*var\(--teal\)/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*color:\s*#fff/);
    expect(styles).toMatch(/\.peek-btn\s*\{[^}]*border-radius:\s*50px/);
  });

  it('AC48 — the footer carries the copyright line', () => {
    const footer =
      '<footer class="site-footer"><p>© 2026 David Ip. Created for George and Teddy Ip.</p></footer>';
    expect(views).toContain(footer);

    const game = views.slice(
      views.indexOf('export function gameView'),
      views.indexOf('export function emptyView'),
    );
    const empty = views.slice(
      views.indexOf('export function emptyView'),
      views.indexOf('export function endView'),
    );
    const summary = views.slice(views.indexOf('export function endView'));
    expect(game).toContain(footer);
    expect(empty).toContain(footer);
    expect(summary).toContain(footer);
    expect(summary).toContain('data-testid="choose-patterns"');

    expect(styles).toMatch(/\.site-footer\s*\{[^}]*margin-top:\s*20px/);
    expect(styles).toMatch(/\.site-footer\s*\{[^}]*color:\s*var\(--teal\)/);
    expect(styles).toMatch(/\.site-footer\s*\{[^}]*font-size:\s*1\.2rem/);
    expect(styles).toMatch(/\.site-footer\s*\{[^}]*text-align:\s*center/);
  });

  it('AC49 — the party track mirrors the maths game', () => {
    const html = trackView(sessionWith(7, 2));
    expect(html).toContain('class="progress-area"');
    expect(html).toContain('<h2>Path to the Party! 🎉</h2>');
    expect(html).toMatch(/class="goal-track"[^>]*data-testid="track"[^>]*data-filled="7"/);
    expect(html).toContain('class="mascot"');
    expect(html).toContain('🦊');

    const rows = [...html.matchAll(/<div class="goal-steps">([\s\S]*?)<\/div>/g)].map(
      (match) => match[1] ?? '',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/1[\s\S]*2[\s\S]*3[\s\S]*4[\s\S]*5/);
    expect(rows[0]).not.toContain('>6<');
    expect(rows[1]).toMatch(/6[\s\S]*7[\s\S]*8[\s\S]*9[\s\S]*10/);
    expect((html.match(/class="step filled"/g) ?? []).length).toBe(7);
    expect(html).toContain('class="goal-end">🎉');
    expect(html).toMatch(
      /Problems Solved:\s*<span data-testid="solved">7<\/span>\s*\/\s*Total Problems:\s*<span data-testid="answered">9<\/span>/,
    );
    expect(trackView(sessionWith(0))).not.toContain('🦊');
    expect(trackView(sessionWith(10))).toMatch(/data-filled="0"/);

    expect(styles).toMatch(/\.progress-area\s*\{[^}]*background:\s*#fff/);
    expect(styles).toMatch(/\.progress-area\s*\{[^}]*border-radius:\s*15px/);
    expect(styles).toMatch(
      /\.progress-area\s*\{[^}]*box-shadow:\s*0\s+5px\s+15px\s+rgba\(0,\s*0,\s*0,\s*0?\.1\)/,
    );
    expect(styles).toMatch(/\.progress-area\s*\{[^}]*padding:\s*15px/);
    expect(styles).toMatch(/\.progress-area\s*\{[^}]*margin-top:\s*10px/);

    expect(styles).toMatch(/\.goal-track\s*\{[^}]*display:\s*grid/);
    expect(styles).toMatch(/\.goal-track\s*\{[^}]*align-items:\s*center/);
    expect(styles).toMatch(/\.goal-track\s*\{[^}]*gap:\s*6px/);
    expect(styles).toMatch(/\.goal-track\s*\{[^}]*padding:\s*10px/);
    expect(styles).toMatch(/\.goal-track\s*\{[^}]*background:\s*#f8f9fa/);
    expect(styles).toMatch(/\.goal-track\s*\{[^}]*border-radius:\s*15px/);

    expect(styles).toMatch(/\.mascot\s*\{[^}]*font-size:\s*2\.5rem/);
    expect(styles).toMatch(/\.mascot\s*\{[^}]*animation:\s*bounce/);
    expect(styles).toMatch(/@keyframes\s+bounce/);

    expect(styles).toMatch(/\.goal-steps-wrapper\s*\{[^}]*flex-direction:\s*column/);
    expect(styles).toMatch(/\.goal-steps-wrapper\s*\{[^}]*gap:\s*4px/);
    expect(styles).toMatch(/\.goal-steps\s*\{[^}]*display:\s*flex/);
    expect(styles).toMatch(/\.goal-steps\s*\{[^}]*justify-content:\s*center/);
    expect(styles).toMatch(/\.goal-steps\s*\{[^}]*gap:\s*5px/);

    expect(styles).toMatch(/\.step\s*\{[^}]*width:\s*35px/);
    expect(styles).toMatch(/\.step\s*\{[^}]*height:\s*35px/);
    expect(styles).toMatch(/\.step\s*\{[^}]*border-radius:\s*8px/);
    expect(styles).toMatch(/\.step\s*\{[^}]*background:\s*#e0e0e0/);
    expect(styles).toMatch(/\.step\s*\{[^}]*color:\s*#7f8c8d/);
    expect(styles).toMatch(/\.step\s*\{[^}]*font-weight:\s*bold/);
    expect(styles).toMatch(
      /\.step\.filled\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#4ecdc4,\s*#ff6b6b\)/,
    );
    expect(styles).toMatch(/\.step\.filled\s*\{[^}]*color:\s*#fff/);
    expect(styles).toMatch(
      /\.step\.filled\s*\{[^}]*box-shadow:\s*0\s+2px\s+8px\s+rgba\(78,\s*205,\s*196,\s*0?\.4\)/,
    );
    expect(styles).toMatch(/\.goal-end\s*\{[^}]*font-size:\s*2\.5rem/);
  });

  it('AC50 — the party steps are centred with or without the mascot', () => {
    const withMascot = trackView(sessionWith(2));
    const withoutMascot = trackView(sessionWith(0));
    expect(withMascot).toContain('class="mascot"');
    expect(withoutMascot).not.toContain('class="mascot"');

    const track = styles.match(/\.goal-track\s*\{[^}]*\}/)?.[0] ?? '';
    expect(track).toMatch(/display:\s*grid/);
    expect(track).toMatch(/grid-template-columns:\s*1fr\s+auto\s+1fr/);
    expect(track).toMatch(/align-items:\s*center/);
    expect(track).not.toMatch(/justify-content:\s*space-between/);

    const wrapper = styles.match(/\.goal-steps-wrapper\s*\{[^}]*\}/)?.[0] ?? '';
    expect(wrapper).toMatch(/grid-column:\s*2/);
    expect(wrapper).toMatch(/grid-row:\s*1/);

    const mascot = styles.match(/\.mascot\s*\{[^}]*\}/)?.[0] ?? '';
    expect(mascot).toMatch(/justify-self:\s*start/);

    const end = styles.match(/\.goal-end\s*\{[^}]*\}/)?.[0] ?? '';
    expect(end).toMatch(/justify-self:\s*end/);

    for (const html of [withMascot, withoutMascot]) {
      expect(html).toContain('class="goal-steps-wrapper"');
      expect(html).toContain('class="goal-end">🎉');
    }
  });

  it('AC51 — the word card is not bold', () => {
    const card = styles.match(/\.card\s*\{[^}]*\}/)?.[0] ?? '';
    expect(card).toMatch(/font-weight:\s*(?:400|500)/);
    expect(card).not.toMatch(/font-weight:\s*(?:700|bold)/);
    expect(card).toMatch(/font-size:\s*clamp\(3\.5rem,\s*12vw,\s*8rem\)/);
    expect(card).toMatch(/letter-spacing:\s*-0\.02em/);
    expect(card).toMatch(/line-height:\s*1/);
    expect(views).toContain('data-testid="word"');
  });

  it('AC52 — the gap above hear-it matches the gap below', () => {
    const slot = [...styles.matchAll(/\.flash-slot\s*\{[^}]*\}/g)].at(-1)?.[0] ?? '';
    expect(slot).toMatch(/min-height:\s*0/);
    expect(slot).toMatch(/height:\s*0/);
    expect(slot).not.toMatch(/min-height:\s*2\.2rem/);

    const flash = styles.match(/\.flash\s*\{[^}]*\}/)?.[0] ?? '';
    expect(flash).toMatch(/min-height:\s*2\.2rem/);
    expect(flash).toMatch(/animation:\s*flash-in/);

    const hear = [...styles.matchAll(/\.hear\s*\{[^}]*\}/g)].at(-1)?.[0] ?? '';
    expect(hear).toMatch(/margin-block:\s*0\.5rem/);
  });

  it('AC53 — the practice screen has no change-patterns link', () => {
    const game = views.slice(
      views.indexOf('export function gameView'),
      views.indexOf('export function emptyView'),
    );
    expect(game).not.toContain('choose-patterns');
    expect(game).not.toContain('game-footer');
    expect(views).toContain('data-testid="pattern-toggle"');

    const summary = views.slice(views.indexOf('export function endView'));
    expect(summary).toContain('data-testid="choose-patterns"');
  });

  it('AC54 — the How to Use toggle opens a numbered instructions panel', () => {
    expect(app).toMatch(/let howToOpen = false;/);
    expect(views).toContain('data-testid="how-to"');
    expect(views).toContain('data-testid="how-to-panel"');
    expect(views).toContain('<h2>How to Use</h2>');
    expect(views).toContain('>How to Use<');
    expect(views).toContain('>Close<');

    // Assert against the panel's own source slice: most of these keywords also occur
    // elsewhere in views.ts, so matching the whole file would pass on an empty panel.
    const panelStart = views.indexOf('export function howToPanel');
    const panelEnd = views.indexOf('export function', panelStart + 10);
    expect(panelStart).toBeGreaterThan(-1);
    const panel = views.slice(panelStart, panelEnd);
    const steps = panel.match(/<li>/g) ?? [];
    expect(steps.length).toBeGreaterThanOrEqual(4);
    for (const content of [
      'Patterns',
      'Levels',
      'Spelling bee',
      'aloud',
      'write',
      'Got it',
      'Not yet',
      'A−',
      'A+',
      '🔉',
      'Path to the Party',
      'tenth',
    ]) {
      expect(panel, `instructions must cover "${content}"`).toContain(content);
    }

    // Opening instructions must not restart the session or re-speak the word.
    const handler = app.match(/\[data-testid="how-to"\][\s\S]{0,260}/)?.[0] ?? '';
    expect(handler).toContain('howToOpen = !howToOpen');
    expect(handler).toContain('render()');
    expect(handler).not.toContain('startPatternRun');
    expect(handler).not.toContain('startBeeRun');
    const headerAt = app.indexOf('${headerView(');
    const howToAt = app.indexOf('${howToPanel(');
    expect(headerAt).toBeGreaterThan(-1);
    expect(howToAt).toBeGreaterThan(headerAt);

    expect(styles).toMatch(/\.how-to-panel\s*\{[^}]*background:\s*#fff/);
    expect(styles).toMatch(/\.how-to-panel\s*\{[^}]*border-radius:\s*15px/);
    expect(styles).toMatch(
      /\.how-to-panel\s*\{[^}]*box-shadow:\s*0\s+5px\s+15px\s+rgba\(0,\s*0,\s*0,\s*0?\.1\)/,
    );
    expect(styles).toMatch(/\.how-to-panel\s*\{[^}]*padding:\s*15px/);
    expect(styles).toMatch(
      /\.how-to-panel\s*\{[^}]*(?:margin-bottom:\s*15px|margin:\s*0\s+0\s+15px)/,
    );
  });

  it('AC55 — the header row never wraps and keeps the mode ring', () => {
    const header = headerView('patterns', 'Patterns · 5', false, '10 words');
    for (const label of [
      '>Sound patterns<',
      '>Patterns<',
      '>Spelling bee<',
      '>Bee<',
      '>Patterns · 5<',
      '>5<',
      '>How to Use<',
      '>Help<',
    ]) {
      expect(header, `header must carry ${label}`).toContain(label);
    }

    expect(styles).toMatch(/\.header-controls\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(styles).toMatch(/\.header-controls\s*\{[^}]*gap:\s*clamp\(/);
    expect(styles).toMatch(/\.header-controls\s+button\s*\{[^}]*white-space:\s*nowrap/);
    expect(styles).toMatch(/font-size:\s*clamp\(0\.7rem,\s*2\.2vw,\s*0\.9rem\)/);
    expect(styles).toMatch(/padding-inline:\s*clamp\(0\.45rem,\s*1\.6vw,\s*0\.95rem\)/);
    expect(styles).toMatch(/\.label-short\s*\{[^}]*display:\s*none/);

    const small = styles.match(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(small).toMatch(/\.label-full\s*\{[^}]*display:\s*none/);
    expect(small).toMatch(/\.label-short\s*\{[^}]*display:\s*inline/);

    // AC46: no ancestor may clip the active pill's 4px ring.
    for (const selector of ['#app', '.app-card', '.app-header', '.header-controls', '.mode-bar']) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rule = styles.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(rule, `${selector} must have a rule`).not.toBe('');
      expect(rule, `${selector} must not clip the ring`).not.toMatch(/overflow\s*:\s*hidden/);
    }
  });
});
