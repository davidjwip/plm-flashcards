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
