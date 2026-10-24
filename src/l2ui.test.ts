// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bankJson from '../data/wordbank.json';
import beeJson from '../data/bee.json';
import { mount } from './app';
import type { BeeDeck } from './bee';
import { buildDictionary, patternOptions } from './engine';
import {
  DIGRAPHS,
  END_CLUSTERS,
  GROUP_ORDER,
  L2_PATTERN_IDS,
  LONG_VOWELS,
  R_CONTROLLED,
  SHORT_VOWELS,
  SILENT_E,
  SPELLING_L2,
  START_CLUSTERS,
  isL2Word,
  segment,
  syllables,
  untaught,
} from './levels';
import type { KeyValueStore } from './storage';
import type { Bank } from './types';
import { patternPanel } from './views';

const bank = bankJson as Bank;
const beeDeck = beeJson as BeeDeck;

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

function mountBee(selection = '[]'): HTMLElement {
  const el = root();
  mount({
    bank,
    beeDeck,
    root: el,
    store: store({ 'plm.selectedPatterns': selection }),
  });
  click(el.querySelector('[data-testid="mode-bee"]'));
  return el;
}

function openBeePanel(el: HTMLElement): void {
  click(el.querySelector('[data-testid="pattern-toggle"]'));
}

function level(key: string, checked: boolean): void {
  const box = document.querySelector<HTMLInputElement>(`[data-testid="level-${key}"]`);
  expect(box, `level ${key} exists`).toBeTruthy();
  box!.checked = checked;
  box!.dispatchEvent(new Event('change', { bubbles: true }));
}

function checkedIds(el: HTMLElement): string[] {
  return [...el.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]:checked')].map(
    (box) => box.value,
  );
}

/** The family a bank id belongs under, derived from its shape and the exported lists. */
function expectedFamily(id: string): string {
  if (id.endsWith('-')) {
    if (!START_CLUSTERS.includes(id)) throw new Error(`${id} is not in START_CLUSTERS`);
    return 'start';
  }
  if (id.startsWith('-')) {
    if (!END_CLUSTERS.includes(id)) throw new Error(`${id} is not in END_CLUSTERS`);
    return 'end';
  }
  if (SHORT_VOWELS.includes(id)) return 'short';
  if (LONG_VOWELS.includes(id)) return 'long';
  if (R_CONTROLLED.includes(id)) return 'r-controlled';
  if (DIGRAPHS.includes(id)) return 'digraph';
  if (SILENT_E.includes(id)) return 'silent';
  throw new Error(`no expected family for bank id ${id}`);
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
    expect(groups.map((group) => group.dataset.group)).toEqual([
      'short',
      'long',
      'r-controlled',
      'digraph',
      'start',
      'end',
      'silent',
    ]);
    expect(groups.map((group) => group.querySelector('summary')?.textContent?.trim())).toEqual([
      'Short vowels',
      'Long vowels',
      'R-controlled',
      'Digraphs',
      'Starting clusters',
      'Ending clusters',
      'Silent e',
    ]);

    // The seven groups share one scroll box: seven independently scrolling grids is the bug.
    const wrappers = document.querySelectorAll<HTMLElement>('.option-groups');
    expect(wrappers, 'one option-groups scroll wrapper').toHaveLength(1);
    expect(wrappers[0]!.querySelectorAll('.option-group')).toHaveLength(GROUP_ORDER.length);

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
    expect(groupOfId('ghost_e')).toBe('silent');
    // Every bank id, not a spot check: a typo in R_CONTROLLED/LONG_VOWELS must fail here.
    for (const id of bank.patterns.map((pattern) => pattern.id)) {
      expect(groupOfId(id), `${id} groups under ${expectedFamily(id)}`).toBe(expectedFamily(id));
    }

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

  it('AC64 — a tick keeps the typed filter and the focus', () => {
    const el = mountOpen();

    const search = el.querySelector<HTMLInputElement>('[data-testid="pattern-search"]')!;
    search.focus();
    typeSearch(el, 'sm');
    expect(visibleRows(el).map((row) => row.querySelector('input')!.value)).toEqual(['sm-']);

    check('sm-');

    expect(el.querySelector<HTMLInputElement>('[data-testid="pattern-search"]')!.value).toBe('sm');
    expect(visibleRows(el).map((row) => row.querySelector('input')!.value)).toEqual(['sm-']);
    expect(el.querySelector<HTMLInputElement>('[value="sm-"]')!.checked).toBe(true);
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toBe(
      `${buildDictionary(bank, ['sm-']).length} words in this set`,
    );
    expect(document.activeElement).toBe(el.querySelector('[data-testid="pattern-search"]'));

    typeSearch(el, '');
    expect(visibleRows(el)).toHaveLength(bank.patterns.length);
  });

  it('AC65 — the chip selects the whole class set and clears it again', () => {
    const el = mountOpen();

    click(chip(el));
    expect(checkedIds(el).sort()).toEqual([...L2_PATTERN_IDS].sort());
    expect(checkedIds(el)).toHaveLength(62);
    for (const id of ['ee', 'oo', 'ou', 'ghost_e', 'shr-', 'spl-']) {
      expect(checkedIds(el), `${id} is selected`).toContain(id);
    }
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

  it('AC65 — clearing the last pattern leaves the empty state, not a stale word', () => {
    const el = mountOpen(JSON.stringify(L2_PATTERN_IDS));

    expect(el.querySelector('[data-testid="word"]')).toBeTruthy();

    click(chip(el));

    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toBe(
      'pick at least one pattern',
    );
    expect(el.querySelector('[data-testid="word"]')).toBeFalsy();
    expect(el.querySelector('.empty')).toBeTruthy();
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

  it('AC68 — ghost e is exactly the pinned twelve, in the L2 set, and never filters spelling', () => {
    // Ghost e: a silent final `e` that leaves the vowel before it unchanged, not a
    // split digraph (`cake`, `like`, `bone`). `live`, `dove` and `one` are rejected:
    // live = /lɪv/ vs /laɪv/, dove = bird vs past of dive, one has an unwritten /w/
    // and is not decodable. Do not add them back. The exact set is pinned here on
    // purpose: changing the word list must also be a deliberate change to this test.
    const words = bank.words
      .filter((entry) => entry.patterns.includes('ghost_e'))
      .map((entry) => entry.word)
      .sort();

    expect(words).toEqual([
      'above',
      'come',
      'done',
      'give',
      'glove',
      'gone',
      'have',
      'love',
      'none',
      'shove',
      'some',
      'twelve',
    ]);
    expect(L2_PATTERN_IDS).toContain('ghost_e');
    expect(SPELLING_L2).not.toContain('ghost_e');
  });
});

describe('AC69 — Level 2 means every sound taught', () => {
  it('AC69 — the syllable helper counts the twenty pinned examples', () => {
    const cases: [string, number][] = [
      ['cake', 1],
      ['house', 1],
      ['above', 2],
      ['table', 2],
      ['little', 2],
      ['armchair', 2],
      ['strawberry', 3],
      ['smile', 1],
      ['squiggle', 2],
      ['restaurant', 3],
      ['yourself', 2],
      ['thousand', 2],
      ['twelve', 1],
      ['shove', 1],
      ['script', 1],
      ['swept', 1],
      ['scalp', 1],
      ['self', 1],
      ['next', 1],
      ['spring', 1],
    ];
    for (const [word, count] of cases) {
      expect(syllables(word), word).toBe(count);
    }
  });

  it('AC69 — a word is Level 2 only when every sound in it has been taught', () => {
    const inside = [
      'smart',
      'smash',
      'thousand',
      'sprout',
      'prank',
      'shrunk',
      'sprung',
      'help',
      'next',
      'duck',
      'sing',
      'ship',
      'thin',
      'stamp',
      'black',
      'jump',
      'hand',
      'bell',
      'miss',
      'fork',
    ];
    const outside = [
      'armchair',
      'chair',
      'strawberry',
      'squawk',
      'splurge',
      'scrawl',
      'throne',
      'cake',
      'night',
      'boat',
      'coin',
      'saw',
      'snow',
      'bird',
      'her',
      'catch',
    ];
    for (const word of inside) {
      expect(isL2Word(word), `${word} is Level 2`).toBe(true);
    }
    for (const word of outside) {
      expect(isL2Word(word), `${word} is not Level 2`).toBe(false);
    }
  });

  it('AC69 — segmentation takes the longest grapheme, so air is not ai plus ir', () => {
    expect(segment('chair')).toEqual(['ch', 'air']);

    const armchair = segment('armchair');
    expect(armchair).toContain('air');
    expect(armchair).not.toContain('ai');
    expect(armchair).not.toContain('ir');

    expect(segment('squawk')).toContain('aw');
  });

  it('AC69 — a final -le is not a split digraph', () => {
    expect(untaught('cake')).toEqual(['a_e']);
    expect(untaught('table')).toEqual([]);
    expect(untaught('smile')).toEqual([]);
  });

  it('AC69 — the chip serves only words whose every sound is taught; a manual subset brings the rest back', () => {
    const el = root();
    const app = mount({
      bank,
      root: el,
      store: store({ 'plm.selectedPatterns': JSON.stringify(L2_PATTERN_IDS) }),
    });
    const served = app.session()?.words.map((entry) => entry.word) ?? [];
    expect(served.length).toBeGreaterThan(0);
    for (const word of served) {
      expect(untaught(word), `${word} has no untaught grapheme`).toEqual([]);
    }
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toBe(
      `${served.length} words in this set`,
    );
    for (const word of ['armchair', 'strawberry', 'squawk', 'throne']) {
      expect(served, `${word} is not served by the chip`).not.toContain(word);
    }

    // A manual subset is the adult's call: the same words come back.
    const manualEl = root();
    const manual = mount({
      bank,
      root: manualEl,
      store: store({
        'plm.selectedPatterns': JSON.stringify(['air', 'str-', 'squ-', 'thr-']),
      }),
    });
    const manualWords = manual.session()?.words.map((entry) => entry.word) ?? [];
    for (const word of ['armchair', 'strawberry', 'squawk', 'throne']) {
      expect(manualWords, `${word} returns with a manual subset`).toContain(word);
    }
  });
});

describe('AC66 — the bee deck and the Level 2 switch', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('AC66 — an empty bee deck serves no words from the previous round', () => {
    const el = mountBee();
    const oldWord = el.querySelector('[data-testid="word"]')?.textContent;
    expect(oldWord, 'the default bee deck starts a round').toBeTruthy();
    expect(el.querySelector('[data-testid="mark-right"]')).toBeTruthy();

    openBeePanel(el);
    // Level 2 is a filter over the real levels; switch it on, then remove every source.
    level('l2', true);
    level('starters', false);
    level('movers', false);
    level('nonsense', false);
    // A filter cannot supply words on its own: switch it off and the deck stays empty.
    level('l2', false);

    expect(el.querySelector('[data-testid="word"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="mark-right"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="mark-wrong"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toContain(
      'no levels selected',
    );
  });

  it('AC66 — turning Level 2 on always leaves a deck to filter', () => {
    const el = mountBee();
    openBeePanel(el);
    for (const key of ['starters', 'movers', 'nonsense']) level(key, false);
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toContain(
      'no levels selected',
    );

    level('l2', true);

    expect(el.querySelector<HTMLInputElement>('[data-testid="level-starters"]')!.checked).toBe(
      true,
    );
    expect(el.querySelector<HTMLInputElement>('[data-testid="level-movers"]')!.checked).toBe(true);
    const count = Number(
      el.querySelector('[data-testid="word-count"]')!.textContent!.match(/(\d+) words/)?.[1] ?? 0,
    );
    expect(count).toBeGreaterThan(0);
  });

  it('AC66 — the bee pill counts Level 2 as a level', () => {
    const el = mountBee();
    openBeePanel(el);
    level('l2', true);
    level('starters', false);
    level('movers', false);
    level('nonsense', false);

    expect(el.querySelector('[data-testid="pattern-toggle"] .label-full')!.textContent).toBe(
      'Levels · 1',
    );
  });
});
