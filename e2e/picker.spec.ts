import { test, expect } from '@playwright/test';

test('AC1 — the picker lists every deck in teaching order and marks one as suggested', async ({
  page,
}) => {
  await page.goto('/');

  const items = page.getByTestId('deck-item');
  await expect(items).toHaveCount(4);

  const ids = await items.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.deckId ?? ''),
  );
  expect(ids).toEqual(['l2-u1-short-vowels', 'l2-u2-a-e-ai-ay', 'l2-u3-long-i-o', 'l3-u1-ck-c-k']);

  await expect(page.getByTestId('suggested')).toHaveCount(1);
  await expect(items.first().getByTestId('suggested')).toBeVisible();
});

test("a deck starts a round of that deck's words, and back returns to the picker", async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('deck-item').first().click();

  const round = page.getByTestId('round');
  await expect(round).toBeVisible();
  await expect(page.getByTestId('round-word')).toHaveCount(10);

  await page.getByTestId('back-to-picker').click();
  await expect(page.getByTestId('deck-picker')).toBeVisible();
});
