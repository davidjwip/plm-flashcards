import { buildDictionary, createSession, currentWord, mark, patternOptions } from './engine';
import { speakWord, type Speaker } from './speech';
import { loadSelection, saveSelection, type KeyValueStore } from './storage';
import type { Bank, Session, Verdict } from './types';
import { endView, gameView, settingsView } from './views';
import './styles.css';

export type MountOptions = {
  bank: Bank;
  root: HTMLElement;
  store?: KeyValueStore;
  synth?: Speaker;
};

export type AppHandle = {
  /** Current session, or null when the setup screen is showing. */
  session: () => Session | null;
};

const FLASH_MS = 1100;

/** Wire the app to a root element. All state lives in this closure. */
export function mount({ bank, root, store, synth }: MountOptions): AppHandle {
  let selected: string[] = loadSelection(store);
  let session: Session | null = null;
  let celebrationDismissed = false;

  const store_ = store;

  function renderSettings(): void {
    const open =
      root.querySelector<HTMLDetailsElement>('[data-testid="pattern-panel"]')?.open ??
      selected.length === 0;
    root.innerHTML = settingsView(
      patternOptions(bank),
      selected,
      buildDictionary(bank, selected).length,
      open,
    );
    wireSettings();
  }

  function render(): void {
    if (!session) return renderSettings();
    const word = currentWord(session);
    if (!word) {
      root.innerHTML = endView(session);
      wireEnd();
      return;
    }

    root.innerHTML = gameView(session, word, celebrationDismissed);

    const flash = root.querySelector('[data-testid="flash"]');
    if (flash) setTimeout(() => flash.classList.add('gone'), FLASH_MS);

    root
      .querySelector('[data-testid="hear"]')
      ?.addEventListener('click', () => speakWord(word.word, synth));

    for (const [id, verdict] of [
      ['mark-right', 'right'],
      ['mark-wrong', 'wrong'],
    ] as const) {
      root.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
        session = mark(session!, verdict as Verdict);
        render();
      });
    }

    root.querySelector('[data-testid="celebration-close"]')?.addEventListener('click', () => {
      celebrationDismissed = true;
      render();
    });

    root
      .querySelector('[data-testid="choose-patterns"]')
      ?.addEventListener('click', backToSettings);
  }

  function wireEnd(): void {
    root.querySelector('[data-testid="again"]')?.addEventListener('click', () => {
      session = createSession(buildDictionary(bank, selected));
      celebrationDismissed = false;
      render();
    });
    root
      .querySelector('[data-testid="choose-patterns"]')
      ?.addEventListener('click', backToSettings);
  }

  function wireSettings(): void {
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')) {
      input.addEventListener('change', () => {
        selected = [...root.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')]
          .filter((box) => box.checked)
          .map((box) => box.value);
        saveSelection(selected, store_);
        renderSettings();
      });
    }

    root.querySelector('[data-testid="start"]')?.addEventListener('click', () => {
      const dictionary = buildDictionary(bank, selected);
      if (!dictionary.length) return;
      session = createSession(dictionary);
      celebrationDismissed = false;
      render();
    });
  }

  function backToSettings(): void {
    session = null;
    celebrationDismissed = false;
    renderSettings();
  }

  renderSettings();
  return { session: () => session };
}
