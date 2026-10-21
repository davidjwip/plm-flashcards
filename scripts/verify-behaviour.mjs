#!/usr/bin/env node
// scripts/verify-behaviour.mjs
// Behavioural verification loop: build is already done by the npm script; this
// serves dist/, drives the real game in Chromium, captures a screenshot at every
// step, and prints what it actually observed.
//
// The point is evidence, not just an exit code: an agent (or Dave) reads the
// step table and the screenshots and compares them against plan.md. Assertions
// catch the obvious breakage; the screenshots catch "it ran, but it looks wrong".
//
// Usage:  node scripts/verify-behaviour.mjs [--pattern=ai] [--headful]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.VERIFY_PORT ?? 4175);
const BASE = `http://127.0.0.1:${PORT}`;
const STAMP = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const OUT = join('verify', STAMP);
const pattern = (process.argv.find((a) => a.startsWith('--pattern=')) ?? '--pattern=ai').split('=')[1];
const headful = process.argv.includes('--headful');
const HASH = (process.argv.find((a) => a.startsWith('--hash=')) ?? '').replace('--hash=', '');

const rows = [];
let failed = 0;

function record(step, ok, detail) {
  rows.push({ step, ok, detail });
  if (!ok) failed++;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  ${mark}  ${step.padEnd(28)} ${detail}`);
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function settle(page, selector) {
  // Let layout, the size ramp and any flash animation finish before the shot.
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function dismissCelebration(page) {
  // AC16: every tenth right answer raises a celebration that must be clicked away.
  // Without this, a set of 10+ words stalls the run at the milestone.
  const cel = page.getByTestId('celebration');
  if (await cel.isVisible().catch(() => false)) {
    await page.getByTestId('celebration-close').click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function text(page, testid) {
  return (await page.getByTestId(testid).textContent().catch(() => null))?.trim() ?? null;
}

async function beeFlow(page, shot) {
  await page.goto(`${BASE}/#bee`, { waitUntil: 'load' });
  await settle(page, '[data-testid="bee-count"]');
  await shot('bee-setup');
  const count = await text(page, 'bee-count');
  const startOn = await page.getByTestId('start').isEnabled();
  record('bee setup loads', Boolean(startOn) && /\d+ words/.test(count ?? ''), `count="${count}"; start enabled=${startOn}`);

  // AC27 / C5: no level chosen => no words, Start disabled.
  for (const level of ['starters', 'movers', 'nonsense']) {
    await page.locator(`[data-testid="level-${level}"]`).uncheck();
  }
  await settle(page, '[data-testid="bee-count"]');
  await shot('bee-no-levels');
  const none = await text(page, 'bee-count');
  const off = await page.getByTestId('start').isDisabled();
  record('no level means no words', Boolean(off) && /^0 words/.test(none ?? ''), `count="${none}"; start disabled=${off}`);

  // Nonsense only, so the round is guaranteed to contain labelled nonsense words (C4/AC30).
  await page.locator('[data-testid="level-nonsense"]').check();
  await settle(page, '[data-testid="bee-count"]');
  await page.getByTestId('start').click();
  await settle(page, '[data-testid="hear"]');
  await shot('bee-first-word');

  // AC32: the word is dictated, not read — and the grown-up can peek to mark it.
  const wordHidden = await page.getByTestId('word').isHidden();
  record('bee word is dictated, not shown', wordHidden, `word hidden=${wordHidden}`);

  await page.getByTestId('peek').click();
  const peeked = await page.getByTestId('word').isVisible();
  const peekedText = (await page.getByTestId('word').textContent())?.trim() ?? '';
  record('grown-up can reveal the word to mark it', peeked && peekedText.length > 0,
    `visible=${peeked}; word="${peekedText}"`);

  let answered = 0;
  let labelled = 0;
  for (let i = 0; i < 14; i += 1) {
    if (await page.getByTestId('summary').isVisible().catch(() => false)) break;
    if (await page.getByTestId('bee-note').isVisible().catch(() => false)) labelled += 1;
    await dismissCelebration(page);
    await page.getByTestId('mark-right').click();
    answered += 1;
    await sleep(150);
    await dismissCelebration(page);
  }
  await settle(page, '[data-testid="summary"]');
  await shot('bee-summary');
  const summary = await text(page, 'summary');
  record('bee round completes', Boolean(summary), `${answered} words answered; summary="${(summary ?? '').slice(0, 48)}"`);
  record('nonsense word is labelled', labelled > 0, `words showing the note: ${labelled}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\nverify-behaviour — pattern "${pattern}" — screenshots in ${OUT}\n`);

  const server = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (d) => process.stderr.write(`[serve] ${d}`));

  const browser = await chromium.launch({ headless: !headful });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const shots = [];
  const shot = async (name) => {
    const file = join(OUT, `${String(shots.length + 1).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots.push(file);
    return file;
  };

  try {
    if (!(await waitForServer(BASE))) throw new Error(`server never came up on ${BASE}`);

    if (HASH === 'bee') {
      await beeFlow(page, shot);
    } else {

    // 1. Cold load — nothing selected, Start must be gated.
    await page.goto(HASH ? `${BASE}/#${HASH}` : BASE, { waitUntil: 'load' });
    await settle(page, '[data-testid="app"]');
    await shot('loaded');
    const count0 = await text(page, 'word-count');
    const startDisabled = await page.getByTestId('start').isDisabled();
    record('cold load', startDisabled && /no words yet/i.test(count0 ?? ''), `start disabled=${startDisabled}; count="${count0}"`);

    // 2. Pick one pattern — the word set builds and Start unlocks.
    const panelOpen = await page.getByTestId('pattern-panel').evaluate((el) => el.hasAttribute('open'));
    if (!panelOpen) await page.getByTestId('pattern-toggle').click();
    await page.locator(`[data-testid="pattern-option"][value="${pattern}"]`).check();
    await settle(page, '[data-testid="word-count"]');
    await shot('pattern-picked');
    const count1 = await text(page, 'word-count');
    const startEnabled = await page.getByTestId('start').isEnabled();
    const nWords = Number((count1 ?? '').match(/(\d+)\s+words/)?.[1] ?? 0);
    record('pattern picked', startEnabled && nWords > 0, `pattern=${pattern}; count="${count1}"; start enabled=${startEnabled}`);

    // 3. Start the run — one word, huge, one of the two buttons live.
    await page.getByTestId('start').click();
    await settle(page, '[data-testid="word"]');
    await shot('first-word');
    const word1 = await text(page, 'word');
    const progress1 = await text(page, 'progress');
    record('run started', Boolean(word1) && /\d+\s+of\s+\d+/.test(progress1 ?? ''), `word="${word1}"; progress="${progress1}"`);

    // 4. Answer every word, marking the first one wrong — the run must end in a summary.
    const total = Number((progress1 ?? '').match(/of\s+(\d+)/)?.[1] ?? nWords);
    let seen = [];
    for (let i = 0; i < Math.max(total, 0) + 2; i++) {
      if (await page.getByTestId('summary').isVisible().catch(() => false)) break;
      const w = await text(page, 'word');
      seen.push(w);
      await dismissCelebration(page);
      await page.getByTestId(i === 0 ? 'mark-wrong' : 'mark-right').click();
      await sleep(180);
      await dismissCelebration(page);
      if (i === Math.floor(total / 2)) await shot('mid-run');
    }
    await settle(page, '[data-testid="summary"]');
    await shot('summary');
    const summary = await text(page, 'summary');
    const distinct = new Set(seen).size;
    record('run completed', Boolean(summary), `${seen.length} words shown, ${distinct} distinct; summary="${(summary ?? '').slice(0, 60)}"`);
    record('no repeated word in a run', distinct === seen.length, `distinct=${distinct} of ${seen.length}`);

    // 5. Reload — the chosen pattern must survive, Start must be enabled again.
    await page.reload({ waitUntil: 'load' });
    await settle(page, '[data-testid="app"]');
    await shot('after-reload');
    const stillChecked = await page.locator(`[data-testid="pattern-option"][value="${pattern}"]`).isChecked();
    const startAfter = await page.getByTestId('start').isEnabled();
    record('selection persists', stillChecked && startAfter, `checked=${stillChecked}; start enabled=${startAfter}`);
    }
  } catch (err) {
    failed++;
    console.error(`\n  FAIL  unexpected error: ${err?.message ?? err}`);
    await shot('failure').catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }

  const report = { stamp: STAMP, pattern, base: BASE, failed, rows, screenshots: shots };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log(`\n  ${failed === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${failed} step${failed === 1 ? '' : 's'})`}`);
  console.log(`  evidence: ${OUT}/report.json + ${shots.length} screenshots`);
  console.log(`  compare against plan.md / specs/v1.md before claiming the change works.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
