// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from './app';
import type { Bank } from './types';
import type { KeyValueStore } from './storage';

function bank(words: string[], patterns = ['ai']): Bank {
  return {
    patterns: patterns.map((id) => ({ id, label: id })),
    words: words.map((word) => ({ word, patterns: [patterns[0]!] })),
  };
}

function store(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
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

const click = (el: Element | null) => {
  expect(el, 'element to click exists').toBeTruthy();
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const check = (value: string) => {
  const box = document.querySelector<HTMLInputElement>(
    `[data-testid="pattern-option"][value="${value}"]`,
  )!;
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('app wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in a run with the five short vowels on a fresh device', () => {
    const el = root();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const vowelBank: Bank = {
      patterns: vowels.map((id) => ({ id, label: id })),
      words: ['apple', 'egg', 'ink', 'ox', 'sun'].map((word, i) => ({
        word,
        patterns: [vowels[i]!],
      })),
    };
    mount({ bank: vowelBank, root: el, store: store() });
    expect(el.textContent).toContain('Sound practice');
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('apple');
    for (const id of vowels) {
      expect(el.querySelector<HTMLInputElement>(`[value="${id}"]`)!.checked).toBe(true);
    }
    expect(el.querySelector('[data-testid="start"]')).toBeFalsy();
  });

  it('selecting a pattern rebuilds the run, saves it and reports the count', () => {
    const el = root();
    const s = store();
    mount({ bank: bank(['rain', 'sail']), root: el, store: s });

    expect(el.querySelector('[data-testid="word"]')).toBeFalsy();
    check('ai');
    expect(s.data['plm.selectedPatterns']).toBe('["ai"]');
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('rain');
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toContain('2 words');
  });

  it('restores a saved selection on mount and starts there', () => {
    const el = root();
    mount({
      bank: bank(['rain', 'sail']),
      root: el,
      store: { getItem: () => '["ai"]', setItem: () => {} },
    });
    expect(el.querySelector<HTMLInputElement>('[data-testid="pattern-option"]')!.checked).toBe(
      true,
    );
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('rain');
    expect(el.querySelector('[data-testid="start"]')).toBeFalsy();
  });

  it('records verdicts, fills the track, flashes praise and fades it', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 12 }, (_, i) => `w${i}`)), root: el, store: store() });
    check('ai');

    click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="track"]')!.getAttribute('data-filled')).toBe('1');
    const flash = el.querySelector('[data-testid="flash"]')!;
    expect(flash.textContent).toBe('Nice!');

    vi.advanceTimersByTime(1200);
    expect(flash.classList.contains('gone')).toBe(true);

    click(el.querySelector('[data-testid="mark-wrong"]'));
    expect(el.querySelector('[data-testid="track"]')!.getAttribute('data-filled')).toBe('1');
    expect(el.querySelector('[data-testid="streak"]')!.hasAttribute('hidden')).toBe(true);
  });

  it('AC21 — a word with no committed audio falls back to the browser voice', () => {
    // jsdom has no SpeechSynthesisUtterance; audio.ts resolves it at call time.
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      class {
        lang = '';
        volume = 1;
        constructor(public text: string) {}
      };
    const el = root();
    const speak = vi.fn();
    mount({
      bank: bank(['zorb']),
      root: el,
      store: store(),
      synth: { cancel: vi.fn(), speak } as never,
    });
    check('ai');
    click(el.querySelector('[data-testid="hear"]'));
    expect(speak).toHaveBeenCalled();
  });

  it('celebrates at ten, dismisses, and opens the patterns again', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 12 }, (_, i) => `w${i}`)), root: el, store: store() });
    check('ai');

    for (let i = 0; i < 10; i++) click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeTruthy();

    click(el.querySelector('[data-testid="celebration-close"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="track"]')!.getAttribute('data-filled')).toBe('0');

    click(el.querySelector('[data-testid="pattern-toggle"]'));
    expect(el.querySelector('[data-testid="pattern-panel"]')).toBeTruthy();
  });

  it('AC16 — after dismissing the tenth, the twentieth celebration still appears', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 25 }, (_, i) => `w${i}`)), root: el, store: store() });
    check('ai');

    for (let i = 0; i < 10; i++) click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeTruthy();
    click(el.querySelector('[data-testid="celebration-close"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeFalsy();

    for (let i = 0; i < 10; i++) click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeTruthy();
  });

  it('AC18 — a rapid run of right answers leaves exactly one flash timer pending', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 12 }, (_, i) => `w${i}`)), root: el, store: store() });

    const setTimer = vi.spyOn(globalThis, 'setTimeout');
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout');

    check('ai');
    const scheduled: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      click(el.querySelector('[data-testid="mark-right"]'));
      scheduled.push(setTimer.mock.results.at(-1)?.value);
    }

    const cleared = clearTimer.mock.calls.map((call) => call[0]);
    const stillPending = scheduled.filter((id) => !cleared.includes(id as never));
    expect(stillPending).toHaveLength(1);
    setTimer.mockRestore();
    clearTimer.mockRestore();
  });

  it('AC18b — unmount clears the pending flash timer', () => {
    const el = root();
    const app = mount({ bank: bank(['rain', 'sail']), root: el, store: store() });

    const setTimer = vi.spyOn(globalThis, 'setTimeout');
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout');

    check('ai');
    click(el.querySelector('[data-testid="mark-right"]'));
    const flashId = setTimer.mock.results.at(-1)?.value;

    app.unmount();
    expect(clearTimer.mock.calls.map((call) => call[0])).toContain(flashId);
    setTimer.mockRestore();
    clearTimer.mockRestore();
  });

  it('AC19 — the size buttons resize the word and the choice is remembered', () => {
    const el = root();
    const s = store();
    mount({ bank: bank(['rain', 'sail']), root: el, store: s });
    check('ai');

    const card = () => el.querySelector('[data-testid="word"]') as HTMLElement;
    // Nothing chosen yet: no inline size, the stylesheet's clamp() is in charge.
    expect(card().style.fontSize).toBe('');
    click(el.querySelector('[data-testid="word-bigger"]'));
    expect(card().style.fontSize).toBe('7rem');
    expect(s.data['plm.wordSize']).toBe('3');

    click(el.querySelector('[data-testid="word-smaller"]'));
    click(el.querySelector('[data-testid="word-smaller"]'));
    expect(card().style.fontSize).toBe('4rem');
    expect(s.data['plm.wordSize']).toBe('1');
  });

  it('AC19b — a stored size is used from the first render', () => {
    const el = root();
    mount({
      bank: bank(['rain', 'sail']),
      root: el,
      store: {
        getItem: (key: string) => (key === 'plm.wordSize' ? '4' : '["ai"]'),
        setItem: () => {},
      },
    });
    expect((el.querySelector('[data-testid="word"]') as HTMLElement).style.fontSize).toBe('9rem');
  });

  it('AC22 — the volume buttons trim playback and the choice is remembered', () => {
    const el = root();
    const s = store();
    mount({ bank: bank(['rain', 'sail']), root: el, store: s });
    check('ai');

    expect(el.querySelector('[data-testid="volume-label"]')!.textContent).toBe('85%');
    click(el.querySelector('[data-testid="volume-down"]'));
    expect(el.querySelector('[data-testid="volume-label"]')!.textContent).toBe('70%');
    expect(s.data['plm.volume']).toBe('2');

    click(el.querySelector('[data-testid="volume-up"]'));
    click(el.querySelector('[data-testid="volume-up"]'));
    expect(s.data['plm.volume']).toBe('4');
  });

  it('AC22b — a stored volume is used from the first render', () => {
    const el = root();
    mount({
      bank: bank(['rain', 'sail']),
      root: el,
      store: {
        getItem: (key: string) => (key === 'plm.volume' ? '0' : '["ai"]'),
        setItem: () => {},
      },
    });
    expect(el.querySelector('[data-testid="volume-label"]')!.textContent).toBe('30%');
  });

  it('finishes a run, reports the score and can start again', () => {
    const el = root();
    mount({ bank: bank(['rain', 'sail']), root: el, store: store() });
    check('ai');

    click(el.querySelector('[data-testid="mark-right"]'));
    click(el.querySelector('[data-testid="mark-wrong"]'));
    expect(el.querySelector('[data-testid="summary"]')!.textContent).toContain('Done — 1 of 2');

    click(el.querySelector('[data-testid="again"]'));
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('rain');

    click(el.querySelector('[data-testid="pattern-toggle"]'));
    expect(el.querySelector('[data-testid="pattern-panel"]')).toBeTruthy();
  });

  it('shows the pick-a-pattern prompt when the saved selection is empty', () => {
    const el = root();
    mount({
      bank: bank(['rain']),
      root: el,
      store: { getItem: () => '[]', setItem: () => {} },
    });
    expect(el.querySelector('[data-testid="word"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toContain(
      'pick at least one pattern',
    );
  });
});
