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

  it('starts on the setup screen with Start disabled', () => {
    const el = root();
    mount({ bank: bank(['rain', 'sail']), root: el, store: store() });
    expect(el.textContent).toContain('Sound practice');
    expect(el.querySelector<HTMLButtonElement>('[data-testid="start"]')!.disabled).toBe(true);
  });

  it('selecting a pattern enables Start, saves it, and starting shows a word', () => {
    const el = root();
    const s = store();
    mount({ bank: bank(['rain', 'sail']), root: el, store: s });

    check('ai');
    expect(s.data['plm.selectedPatterns']).toBe('["ai"]');
    expect(el.querySelector<HTMLButtonElement>('[data-testid="start"]')!.disabled).toBe(false);
    expect(el.querySelector('[data-testid="word-count"]')!.textContent).toContain('2 words');

    click(el.querySelector('[data-testid="start"]'));
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('rain');
  });

  it('restores a saved selection on mount', () => {
    const el = root();
    mount({
      bank: bank(['rain', 'sail']),
      root: el,
      store: { getItem: () => '["ai"]', setItem: () => {} },
    });
    expect(el.querySelector<HTMLInputElement>('[data-testid="pattern-option"]')!.checked).toBe(
      true,
    );
    expect(el.querySelector<HTMLButtonElement>('[data-testid="start"]')!.disabled).toBe(false);
  });

  it('records verdicts, fills the track, flashes praise and fades it', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 12 }, (_, i) => `w${i}`)), root: el, store: store() });
    check('ai');
    click(el.querySelector('[data-testid="start"]'));

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

  it('speaks the word when the hint is pressed', () => {
    // jsdom has no SpeechSynthesisUtterance; speech.ts resolves it at call time.
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      class {
        lang = '';
        constructor(public text: string) {}
      };
    const el = root();
    const speak = vi.fn();
    mount({
      bank: bank(['rain']),
      root: el,
      store: store(),
      synth: { cancel: vi.fn(), speak } as never,
    });
    check('ai');
    click(el.querySelector('[data-testid="start"]'));
    click(el.querySelector('[data-testid="hear"]'));
    expect(speak).toHaveBeenCalled();
  });

  it('celebrates at ten, dismisses, and returns to the patterns', () => {
    const el = root();
    mount({ bank: bank(Array.from({ length: 12 }, (_, i) => `w${i}`)), root: el, store: store() });
    check('ai');
    click(el.querySelector('[data-testid="start"]'));

    for (let i = 0; i < 10; i++) click(el.querySelector('[data-testid="mark-right"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeTruthy();

    click(el.querySelector('[data-testid="celebration-close"]'));
    expect(el.querySelector('[data-testid="celebration"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="track"]')!.getAttribute('data-filled')).toBe('0');

    click(el.querySelector('[data-testid="choose-patterns"]'));
    expect(el.querySelector('[data-testid="pattern-panel"]')).toBeTruthy();
  });

  it('finishes a run, reports the score and can start again', () => {
    const el = root();
    mount({ bank: bank(['rain', 'sail']), root: el, store: store() });
    check('ai');
    click(el.querySelector('[data-testid="start"]'));

    click(el.querySelector('[data-testid="mark-right"]'));
    click(el.querySelector('[data-testid="mark-wrong"]'));
    expect(el.querySelector('[data-testid="summary"]')!.textContent).toContain('Done — 1 of 2');

    click(el.querySelector('[data-testid="again"]'));
    expect(el.querySelector('[data-testid="word"]')!.textContent).toBe('rain');

    click(el.querySelector('[data-testid="choose-patterns"]'));
    expect(el.querySelector('[data-testid="pattern-panel"]')).toBeTruthy();
  });

  it('does not start a run with no words', () => {
    const el = root();
    mount({ bank: bank(['rain']), root: el, store: store() });
    // Start is disabled, but the handler must also refuse if clicked.
    click(el.querySelector('[data-testid="start"]'));
    expect(el.querySelector('[data-testid="word"]')).toBeFalsy();
  });
});
