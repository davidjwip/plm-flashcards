import { buildDictionary, createSession, currentWord, mark, patternOptions } from './engine';
import { createPlayer } from './audio';
import type { Speaker } from './speech';
import {
  loadSelection,
  loadVolume,
  loadWordSize,
  saveSelection,
  saveVolume,
  saveWordSize,
  type KeyValueStore,
} from './storage';
import {
  DEFAULT_VOLUME,
  canLouder,
  canQuieter,
  clampVolume,
  stepVolume,
  volumeValue,
} from './volume';
import audioManifest from '../src/audio-manifest.json';
import type { Bank, Session, Verdict } from './types';
import { beeSettingsView, endView, gameView, settingsView } from './views';
import { NONSENSE_TAG, beeDictionary, beeRound, type BeeChoice, type BeeDeck } from './bee';
import { DEFAULT_WORD_SIZE, canGrow, canShrink, stepWordSize, wordSizeStyle } from './wordSize';
import './styles.css';

export type MountOptions = {
  bank: Bank;
  /** Present => spelling-bee mode: dictation deck instead of sound patterns. */
  beeDeck?: BeeDeck;
  root: HTMLElement;
  store?: KeyValueStore;
  synth?: Speaker;
};

export type AppHandle = {
  /** Current session, or null when the setup screen is showing. */
  session: () => Session | null;
  /** Clear pending timers (the flash fade) so a torn-down app is inert. */
  unmount: () => void;
};

const FLASH_MS = 1100;

/** Wire the app to a root element. All state lives in this closure. */
export function mount({ bank, root, beeDeck, store, synth }: MountOptions): AppHandle {
  let beeChoice: BeeChoice = { starters: true, movers: true, nonsense: true };
  let selected: string[] = loadSelection(store);
  // null = nothing chosen yet, so the stylesheet's clamp() keeps the word responsive.
  let wordSize: number | null = loadWordSize(store);
  let volume = clampVolume(loadVolume(store) ?? DEFAULT_VOLUME);
  const spokenWords = new Set((audioManifest as { words: string[] }).words);
  const player = createPlayer({ hasFile: (candidate) => spokenWords.has(candidate), synth });
  let session: Session | null = null;
  /**
   * Which milestone has been dismissed — not a boolean. A boolean would silence
   * the celebration for the rest of the run after the first one, which is the
   * bug this replaced.
   */
  let dismissedMilestone: number | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  const store_ = store;

  function renderSettings(): void {
    if (beeDeck) {
      root.innerHTML = beeSettingsView(beeChoice, beeDictionary(beeDeck, beeChoice).length);
      wireBeeSettings();
      return;
    }
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

    const showCelebration = dismissedMilestone !== session.right;
    root.innerHTML = gameView(
      session,
      word,
      showCelebration,
      wordSizeStyle(wordSize),
      canGrow(wordSize),
      canShrink(wordSize),
      {
        label: `${Math.round(volumeValue(volume) * 100)}%`,
        canLouder: canLouder(volume),
        canQuieter: canQuieter(volume),
      },
      word.patterns.includes(NONSENSE_TAG)
        ? 'This one is not a real word — sound it out, then write what you hear.'
        : undefined,
    );

    // One fade timer, ever: a rapid run of right answers must not queue a timer
    // per word (the maths game has a regression test for exactly this).
    if (flashTimer !== null) clearTimeout(flashTimer);
    const flash = root.querySelector('[data-testid="flash"]');
    flashTimer = flash
      ? setTimeout(() => {
          flash.classList.add('gone');
          flashTimer = null;
        }, FLASH_MS)
      : null;

    root.querySelector('[data-testid="hear"]')?.addEventListener('click', () => {
      // Ignored while the word is still playing: no layering, no double-tap echo.
      const result = player.play(word.word, volumeValue(volume));
      const button = root.querySelector<HTMLButtonElement>('[data-testid="hear"]');
      if (button) button.classList.toggle('playing', result === 'file' || result === 'speech');
      if (result === 'busy') return;
    });

    for (const [id, direction] of [
      ['volume-up', 'up'],
      ['volume-down', 'down'],
    ] as const) {
      root.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
        volume = stepVolume(volume, direction);
        saveVolume(volume, store_);
        render();
      });
    }

    for (const [id, direction] of [
      ['word-bigger', 'up'],
      ['word-smaller', 'down'],
    ] as const) {
      root.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
        wordSize = stepWordSize(wordSize ?? DEFAULT_WORD_SIZE, direction);
        saveWordSize(wordSize, store_);
        render();
      });
    }

    for (const [id, verdict] of [
      ['mark-right', 'right'],
      ['mark-wrong', 'wrong'],
    ] as const) {
      root.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
        // Moving on stops the word: the next one should not start under the last.
        player.stop();
        session = mark(session!, verdict as Verdict);
        render();
      });
    }

    root.querySelector('[data-testid="celebration-close"]')?.addEventListener('click', () => {
      dismissedMilestone = session!.right;
      render();
    });

    root
      .querySelector('[data-testid="choose-patterns"]')
      ?.addEventListener('click', backToSettings);
  }

  function wireEnd(): void {
    root.querySelector('[data-testid="again"]')?.addEventListener('click', () => {
      session = createSession(buildDictionary(bank, selected));
      dismissedMilestone = null;
      render();
    });
    root
      .querySelector('[data-testid="choose-patterns"]')
      ?.addEventListener('click', backToSettings);
  }

function wireBeeSettings(): void {
    for (const key of ['starters', 'movers', 'nonsense'] as const) {
      root
        .querySelector<HTMLInputElement>(`[data-testid="level-${key}"]`)
        ?.addEventListener('change', (event) => {
          beeChoice = { ...beeChoice, [key]: (event.target as HTMLInputElement).checked };
          renderSettings();
        });
    }

    root.querySelector('[data-testid="start"]')?.addEventListener('click', () => {
      if (!beeDeck) return;
      const dictionary = beeDictionary(beeDeck, beeChoice);
      if (!dictionary.length) return;
      session = createSession(beeRound(dictionary));
      dismissedMilestone = null;
      render();
    });
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
      dismissedMilestone = null;
      render();
    });
  }

  function backToSettings(): void {
    session = null;
    dismissedMilestone = null;
    renderSettings();
  }

  renderSettings();
  return {
    session: () => session,
    unmount: () => {
      if (flashTimer !== null) clearTimeout(flashTimer);
      flashTimer = null;
      player.stop();
    },
  };
}
