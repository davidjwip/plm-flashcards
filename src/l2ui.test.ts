// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import bankJson from '../data/wordbank.json';
import { mount } from './app';
import { patternOptions } from './engine';
import { GROUP_ORDER, L2_PATTERN_IDS } from './levels';
import type { KeyValueStore } from './storage';
import type { Bank } from './types';
import { patternPanel } from './views';

const bank = bankJson as Bank;

function store(data: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

function root(): HTMLElement {
  document.body.innerHTML = '<main id="app"></main>';
  return document.querySelector<HTMLElement>('#app')!;
}

function click(el: Element | null): void {
  expect(el, 'element to click exists').toBeTruthy();
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function check(value: string, checked = true): void {
  const box = document.querySelector<HTMLInputElement>(
    `[data-testid="pattern-option"][value="${value}"]`,
  );
  expect(box, `checkbox ${value} exists`).toBeTruthy();
  box!.checked = checked;
  box!.dispatchEvent(new Event('change', { bubbles: true }));
}

function mountOpen(selection = '[]'): HTMLElement {
  const el = root();
  mount({ bank, root: el, store: store({ 'plm.selectedPatterns': selection }) });
  click(el.querySelector('[data-testid="pattern-toggle"]'));
  return el;
}

function checkedIds(el: HTMLElement): string[] {
  return [...el.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]:checked')].map(
    (box) => box.value,
  );
}

function chip(el: HTMLElement): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>('[data-testid="l2-chip"]')!;
}

function typeSearch(el: HTMLElement, text: string): void {
  const search = el.querySelector<HTMLInputElement>('[data-testid="pattern-search"]')!;
  search.value = text;
  search.dispatchEvent(new Event('input', { bubbles: true }));
}

function visibleRows(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.option')].filter(
    (row) => !row.hasAttribute('hidden'),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('level 2 pattern panel', () => {
  it('AC63 — the pattern panel groups every row under its family heading', () => {
    document.body.innerHTML = patternPanel(patternOptions(bank), [], true, ['long']);

    const groups = [...document.querySelectorAll<HTMLDetailsElement>('.option-group')];
    expect(groups.map((group) => group.dataset.group)).toEqual([...GROUP_ORDER]);
    expect(groups.map((group) => group.querySelector('summary')?.textContent?.trim())).toEqual([
      'Short vowels',
      'Long vowels',
      'R-controlled',
      'Digraphs',
      'Starting clusters',
      'Ending clusters',
    ]);

    const values = [
      ...document.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]'),
    ].map((box) => box.value);
    expect(values).toHaveLength(bank.patterns.length);
    for (const id of bank.patterns.map((pattern) => pattern.id)) {
      expect(
        values.filter((value) => value === id),
        `${id} appears once`,
      ).toHaveLength(1);
    }

    const groupOfId = (id: string): string | undefined =>
      document
        .querySelector<HTMLInputElement>(`[data-testid="pattern-option"][value="${id}"]`)
        ?.closest<HTMLDetailsElement>('.option-group')?.dataset.group;
    expect(groupOfId('bl-')).toBe('start');
    expect(groupOfId('-nd')).toBe('end');

    const short = groups.find((group) => group.dataset.group === 'short')!;
    const long = groups.find((group) => group.dataset.group === 'long')!;
    expect(short.hasAttribute('open')).toBe(true);
    expect(long.hasAttribute('open')).toBe(false);
  });

  it('AC64 — search filters on label and id without losing ticks', () => {
    const el = mountOpen();
    check('ai');
    check('sm-');

    const countBefore = el.querySelector('[data-testid="word-count"]')!.textContent;

    typeSearch(el, 'sm');
    expect(visibleRows(el).map((row) => row.querySelector('input')!.value)).toEqual(['sm-']);
    expect(el.querySelector<HTMLInputElement>('[value="sm-"]')!.checked).toBe(true);
    const hiddenTick = el.querySelector<HTMLInputElement>('[value="ai"]')!;
    expect(hiddenTick.checked).toBe(true);
    expect(hiddenTick.closest('.option')!.hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toBe(countBefore);

    typeSearch(el, 'SM');
    expect(visibleRows(el).map((row) => row.querySelector('input')!.value)).toEqual(['sm-']);

    typeSearch(el, 'start');
    expect(visibleRows(el)).toHaveLength(27);

    typeSearch(el, 'a_e');
    expect(visibleRows(el).map((row) => row.querySelector('input')!.value)).toEqual(['a_e']);

    typeSearch(el, 'zzzz');
    expect(visibleRows(el)).toHaveLength(0);
    const empty = el.querySelector<HTMLElement>('[data-testid="pattern-empty"]')!;
    expect(empty.hasAttribute('hidden')).toBe(false);
    expect(empty.textContent).toContain('no patterns match');
    expect(empty.textContent).toContain('zzzz');
    for (const group of el.querySelectorAll('.option-group')) {
      expect(group.hasAttribute('hidden')).toBe(true);
    }

    typeSearch(el, '');
    expect(visibleRows(el)).toHaveLength(bank.patterns.length);
    expect(empty.hasAttribute('hidden')).toBe(true);
    for (const group of el.querySelectorAll('.option-group')) {
      expect(group.hasAttribute('hidden')).toBe(false);
    }
    expect(el.querySelector<HTMLInputElement>('[value="sm-"]')!.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>('[value="ai"]')!.checked).toBe(true);
  });

  it('AC65 — the chip selects the whole class set and clears it again', () => {
    const el = mountOpen();

    click(chip(el));
    expect(checkedIds(el).sort()).toEqual([...L2_PATTERN_IDS].sort());
    expect(checkedIds(el)).toContain('shr-');
    expect(checkedIds(el)).toContain('spl-');
    expect(checkedIds(el)).not.toContain('tw');
    expect(checkedIds(el)).not.toContain('ff');
    expect(checkedIds(el)).not.toContain('zz');
    expect(chip(el).getAttribute('aria-pressed')).toBe('true');

    check('a', false);
    expect(chip(el).getAttribute('aria-pressed')).toBe('mixed');
    expect(chip(el).className).toContain('mixed');

    check('a', true);
    expect(chip(el).getAttribute('aria-pressed')).toBe('true');

    check('ai');
    expect(chip(el).getAttribute('aria-pressed')).toBe('true');

    click(chip(el));
    expect(checkedIds(el)).toEqual(['ai']);
    expect(chip(el).getAttribute('aria-pressed')).toBe('false');
  });

  it('AC67 — the chip restarts through the same path as a manual selection', () => {
    const el = root();
    mount({ bank, root: el, store: store({ 'plm.selectedPatterns': '["a"]' }) });

    expect(el.querySelector('[data-testid="progress"]')!.textContent).toContain('1 of');
    click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="progress"]')!.textContent).toContain('2 of');

    click(el.querySelector('[data-testid="pattern-toggle"]'));

    const random = vi.spyOn(Math, 'random');
    const callsBefore = random.mock.calls.length;
    const countBefore = el.querySelector('[data-testid="word-count"]')!.textContent;

    click(chip(el));

    const calls = random.mock.calls.length - callsBefore;
    const countAfter = el.querySelector('[data-testid="word-count"]')!.textContent ?? '';
    const total = Number(countAfter.match(/(\d+) words/)?.[1] ?? 0);

    expect(countAfter).not.toBe(countBefore);
    expect(total).toBeGreaterThan(1);
    expect(el.querySelector('[data-testid="progress"]')!.textContent).toBe(`1 of ${total}`);
    // One Fisher–Yates shuffle per restart: two restart paths would double this.
    expect(calls).toBe(total - 1);
  });
});
