import { expect, test } from '@playwright/test';

/** The panel starts closed; this keeps every selection click honest. */
async function openPicker(page: import('@playwright/test').Page): Promise<void> {
  const panel = page.getByTestId('pattern-panel');
  if (!(await panel.isVisible())) {
    await page.getByTestId('pattern-toggle').click();
  }
  await expect(panel).toBeVisible();
}

test('AC1/AC2 — choosing patterns builds the word set on the one-screen landing', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('word')).toBeVisible();
  await expect(page.getByTestId('pattern-panel')).toBeHidden();

  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();
  await expect(page.getByTestId('word-count')).toContainText('words in this set');

  await page.locator('[data-testid="pattern-option"][value="oa"]').check();
  const count = await page.getByTestId('word-count').textContent();
  const shown = Number((count ?? '').match(/(\d+) words/)?.[1]);
  expect(shown).toBeGreaterThan(8);
});

test('AC5/AC6/AC8 — each press records a verdict, advances, and the run ends with a score', async ({
  page,
}) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="ie"]').check();

  // The set size comes from the bank, which changes as patterns gain words: read it
  // from the screen rather than hardcoding it, and answer every word in the run.
  const first = (await page.getByTestId('progress').textContent()) ?? '';
  const total = Number(first.match(/of\s+(\d+)/)?.[1] ?? 0);
  expect(total).toBeGreaterThan(1);

  for (let i = 1; i <= total; i++) {
    await expect(page.getByTestId('progress')).toContainText(`${i} of ${total}`);
    // AC16: every tenth right answer raises a celebration that covers the buttons.
    const cel = page.getByTestId('celebration');
    if (await cel.isVisible().catch(() => false)) {
      await page.getByTestId('celebration-close').click();
    }
    await page.getByTestId(i === 1 ? 'mark-wrong' : 'mark-right').click();
  }

  await expect(page.getByTestId('summary')).toBeVisible();
  await expect(page.getByTestId('summary')).toContainText(`${total - 1} of ${total}`);
});

test('AC10 — the pattern selection survives a reload', async ({ page }) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="igh"]').check();

  await page.reload();
  await expect(page.getByTestId('word')).toBeVisible();
  await openPicker(page);
  await expect(page.locator('[data-testid="pattern-option"][value="igh"]')).toBeChecked();
});

test('AC13/AC14 — the party track fills and encouragement flashes without blocking the game', async ({
  page,
}) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();

  const track = page.getByTestId('track');
  await expect(track).toHaveAttribute('data-filled', '0');
  await expect(track.locator('.step')).toHaveCount(10);

  await page.getByTestId('mark-right').click();
  await expect(page.getByTestId('track')).toHaveAttribute('data-filled', '1');
  await expect(page.getByTestId('flash')).toBeVisible();
  await expect(page.getByTestId('word')).toBeVisible();
  await expect(page.getByTestId('mark-right')).toBeEnabled();

  await page.getByTestId('mark-wrong').click();
  await expect(page.getByTestId('track')).toHaveAttribute('data-filled', '1');
  await expect(page.getByTestId('streak')).toBeHidden();
});

test('AC16 — ten right answers raise the celebration, and the track starts again', async ({
  page,
}) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();

  for (let i = 0; i < 10; i++) {
    await page.getByTestId('mark-right').click();
  }

  await expect(page.getByTestId('celebration')).toBeVisible();
  await page.getByTestId('celebration-close').click();
  await expect(page.getByTestId('celebration')).toBeHidden();
  await expect(page.getByTestId('track')).toHaveAttribute('data-filled', '0');
  await expect(page.getByTestId('streak')).toContainText('10 in a row');
});

test('AC56 — every word fits on one line at 390px at maximum size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  // Raise the adult's ceiling to the maximum, so every word has to be shrunk to fit.
  for (let i = 0; i < 12; i++) {
    const bigger = page.getByTestId('word-bigger');
    if (await bigger.isDisabled()) break;
    await bigger.click();
  }
  await expect(page.getByTestId('word-bigger')).toBeDisabled();

  // Ten words, no long-word lottery: at 20rem on a 390px screen even a short word overflows.
  for (let round = 0; round < 10; round++) {
    const metrics = await page.getByTestId('word').evaluate((el) => {
      const style = getComputedStyle(el);
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        text: (el.textContent ?? '').trim(),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        textHeight: range.getBoundingClientRect().height,
        lineHeight: parseFloat(style.lineHeight),
        whiteSpace: style.whiteSpace,
        fontSize: parseFloat(style.fontSize),
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(metrics.whiteSpace, `${metrics.text} must not wrap`).toBe('nowrap');
    expect(metrics.scrollWidth, `${metrics.text} must not overflow`).toBeLessThanOrEqual(
      metrics.clientWidth + 1,
    );
    expect(metrics.pageOverflow, `${metrics.text} must not scroll the page`).toBeLessThanOrEqual(1);
    // At the maximum ceiling the font must actually have been shrunk to fit.
    expect(metrics.fontSize).toBeLessThan(320);
    expect(metrics.textHeight, `${metrics.text} must be one line`).toBeLessThanOrEqual(
      metrics.lineHeight * 1.5,
    );
    await page.getByTestId('mark-right').click();
  }
});

test('AC55 — the header row never wraps at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  const row = page.locator('.header-controls');
  await expect(row).toHaveCSS('flex-wrap', 'nowrap');
  const overflow = await row.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  // The active mode pill keeps its ring, and no ancestor clips it.
  const ring = await page
    .getByTestId('mode-patterns')
    .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ring).toContain('4px');

  const clippers = await page.evaluate(() => {
    const bad: string[] = [];
    let node: HTMLElement | null = document.querySelector('.mode-bar');
    while (node && node !== document.documentElement) {
      const o = getComputedStyle(node);
      if (o.overflow === 'hidden' || o.overflow === 'clip') {
        bad.push(node.className || node.tagName);
      }
      node = node.parentElement;
    }
    return bad;
  });
  expect(clippers).toEqual([]);
});
