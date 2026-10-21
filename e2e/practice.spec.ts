import { expect, test } from '@playwright/test';

/** The picker starts open when nothing is selected; this keeps clicks honest. */
async function openPicker(page: import('@playwright/test').Page): Promise<void> {
  const panel = page.getByTestId('pattern-panel');
  if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await openPicker(page);
  }
  await expect(panel).toHaveJSProperty('open', true);
}

test('AC1/AC2 — choosing patterns builds the word set, and Start is gated on it', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('start')).toBeDisabled();
  await expect(page.getByTestId('word-count')).toContainText('No words yet');

  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();
  await expect(page.getByTestId('word-count')).toContainText('words in this set');
  await expect(page.getByTestId('start')).toBeEnabled();

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
  await page.getByTestId('start').click();

  // "ie" has four words: every press must move the counter.
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('progress')).toContainText(`${i} of 4`);
    await page.getByTestId(i === 1 ? 'mark-wrong' : 'mark-right').click();
  }
  await expect(page.getByTestId('progress')).toContainText('4 of 4');
  await page.getByTestId('mark-right').click();

  await expect(page.getByTestId('summary')).toBeVisible();
  await expect(page.getByTestId('summary')).toContainText('3 of 4');
});

test('AC10 — the pattern selection survives a reload', async ({ page }) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="igh"]').check();

  await page.reload();
  await expect(page.locator('[data-testid="pattern-option"][value="igh"]')).toBeChecked();
  await expect(page.getByTestId('start')).toBeEnabled();
});

test('AC13/AC14 — the party track fills and encouragement flashes without blocking the game', async ({
  page,
}) => {
  await page.goto('/');
  await openPicker(page);
  await page.locator('[data-testid="pattern-option"][value="a"]').check();
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();
  await page.getByTestId('start').click();

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
  await page.locator('[data-testid="pattern-option"][value="a"]').check();
  await page.locator('[data-testid="pattern-option"][value="ai"]').check();
  await page.getByTestId('start').click();

  for (let i = 0; i < 10; i++) {
    await page.getByTestId('mark-right').click();
  }

  await expect(page.getByTestId('celebration')).toBeVisible();
  await page.getByTestId('celebration-close').click();
  await expect(page.getByTestId('celebration')).toBeHidden();
  await expect(page.getByTestId('track')).toHaveAttribute('data-filled', '0');
  await expect(page.getByTestId('streak')).toContainText('10 in a row');
});
