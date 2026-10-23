import { buildDictionary, createSession, currentWord, mark, patternOptions } from './engine';
import { createPlayer } from './audio';
import type { Speaker } from './speech';
import {
  hasStoredSelection,
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
import {
  beePanel,
  emptyView,
  endView,
  gameView,
  headerView,
  howToPanel,
  patternPanel,
  type Mode,
} from './views';
import { NONSENSE_TAG, beeDictionary, beeRound, type BeeChoice, type BeeDeck } from './bee';
import {
  DEFAULT_WORD_SIZE,
  canGrow,
  canShrink,
  clampWordSize,
  stepWordSize,
  wordSizeRem,
  wordSizeStyle,
} from './wordSize';
import { firstFit, fitSizes, inkFits } from './wordFit';
import './styles.css';

export type MountOptions = {
  bank: Bank;
  /** Always supplied by main.ts so the mode toggle works from a plain load (AC37). */
  beeDeck?: BeeDeck;
  root: HTMLElement;
  store?: KeyValueStore;
  synth?: Speaker;
};

export type AppHandle = {
  /** Current session, or null when no run can be built (an explicitly empty selection). */
  session: () => Session | null;
  /** Clear pending timers (the flash fade) so a torn-down app is inert. */
  unmount: () => void;
};

const FLASH_MS = 1100;
const FIT_STEP = 0.92;
// The adult may choose 20rem; on a 390px phone that needs a candidate well below
// 40% of the ceiling, so the app's ramp goes further than the helper's default.
const FIT_MIN_SCALE = 0.1;
const RESIZE_DEBOUNCE_MS = 120;

/** Only a first run gets the five short vowels (AC35). */
export const DEFAULT_PATTERNS = ['a', 'e', 'i', 'o', 'u'] as const;

/** Wire the app to a root element. All state lives in this closure. */
export function mount({ bank, root, beeDeck, store, synth }: MountOptions): AppHandle {
  let beeChoice: BeeChoice = { starters: true, movers: true, nonsense: true };
  const MODE_KEY = 'mode';
  const readMode = (): Mode => {
    try {
      return window.localStorage.getItem(MODE_KEY) === 'bee' ? 'bee' : 'patterns';
    } catch {
      return 'patterns';
    }
  };
  // #bee stays a deep link (bookmarks, the phone home screen) even though the mode is
  // now a visible toggle: the hash wins at load, the toggle wins afterwards.
  const HASH = String.fromCharCode(35);
  const hashMode = (): Mode =>
    typeof window !== 'undefined' && window.location.hash.replace(HASH, '') === 'bee'
      ? 'bee'
      : readMode();
  let mode: Mode = hashMode();
  const beeMode = (): boolean => mode === 'bee' && beeDeck !== undefined;
  let spokenAt: string | null = null;
  let selected: string[] = loadSelection(store);
  // An explicit empty selection is a choice; only a device with no saved selection
  // falls back to the short vowels.
  if (!hasStoredSelection(store)) selected = [...DEFAULT_PATTERNS];
  let panelOpen = false;
  let howToOpen = false;
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
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  const store_ = store;

  function dictionarySize(): number {
    return buildDictionary(bank, selected).length;
  }

  function beeSize(): number {
    return beeDeck ? beeDictionary(beeDeck, beeChoice).length : 0;
  }

  function toggleLabel(): string {
    if (beeMode()) {
      const levels = [beeChoice.starters, beeChoice.movers, beeChoice.nonsense].filter(Boolean);
      return `Levels · ${levels.length}`;
    }
    return `Patterns · ${selected.length}`;
  }

  function countText(): string {
    if (beeMode()) return `${beeSize()} words to draw from`;
    if (selected.length === 0) return 'pick at least one pattern';
    return `${dictionarySize()} words in this set`;
  }

  function panelView(): string {
    if (beeMode()) return beePanel(beeChoice, beeSize(), panelOpen);
    return patternPanel(patternOptions(bank), selected, panelOpen);
  }

  function clearRun(): void {
    dismissedMilestone = null;
    spokenAt = null;
    player.stop();
  }

  function startPatternRun(): void {
    clearRun();
    const dictionary = buildDictionary(bank, selected);
    session = dictionary.length ? createSession(dictionary) : null;
  }

  function startBeeRun(): void {
    clearRun();
    if (!beeDeck) {
      session = null;
      return;
    }
    const dictionary = beeDictionary(beeDeck, beeChoice);
    session = dictionary.length ? createSession(beeRound(dictionary)) : null;
  }

  function renderContent(): string {
    if (!session) return emptyView();
    const word = currentWord(session);
    if (!word) return endView(session);

    const showCelebration = dismissedMilestone !== session.right;
    return gameView(
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
      beeMode(),
    );
  }

  /**
   * The adult's size is a ceiling: measure the rendered word and step the font
   * down until it fits on one line. No chosen size means the stylesheet clamp is
   * the ceiling; in both cases fitting only ever shrinks (AC56).
   */
  function fitWord(): void {
    const card = root.querySelector<HTMLElement>('[data-testid="word"]');
    if (!card || card.hasAttribute('hidden')) return;

    const reset = (): void => {
      if (wordSize === null) card.style.removeProperty('font-size');
      else card.style.fontSize = wordSizeRem(clampWordSize(wordSize));
    };
    reset();

    // jsdom has no layout; skip rather than shrink to the minimum blindly.
    if (card.clientWidth === 0) return;

    const ceiling = Number.parseFloat(window.getComputedStyle(card).fontSize);
    if (!Number.isFinite(ceiling) || ceiling <= 0) return;

    const sizes = fitSizes(ceiling, FIT_MIN_SCALE, FIT_STEP);
    const fits = (px: number): boolean => {
      card.style.fontSize = `${px}px`;
      if (card.scrollWidth > card.clientWidth + 1) return false;
      // The box height is fixed, so a word too tall to sit inside it must shrink too.
      if (card.scrollHeight > card.clientHeight + 1) return false;
      // The line box can fit while the glyph ink does not: measure the ink itself.
      const range = document.createRange();
      range.selectNodeContents(card);
      const ink = range.getBoundingClientRect().height;
      const style = window.getComputedStyle(card);
      const inner =
        card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (!inkFits(ink, inner)) return false;
      // The card is capped by its container, so read the page too: if the document
      // scrolls sideways the word is still too wide for the screen.
      return document.documentElement.scrollWidth <= window.innerWidth + 1;
    };

    if (fits(ceiling)) {
      reset();
      return;
    }
    card.style.fontSize = `${firstFit(sizes, fits)}px`;
  }

  function scheduleFit(): void {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      fitWord();
    }, RESIZE_DEBOUNCE_MS);
  }

  function render(): void {
    root.innerHTML = `<div class="app-card">${headerView(
      mode,
      toggleLabel(),
      panelOpen,
      countText(),
      howToOpen,
    )}${howToPanel(howToOpen)}${panelView()}${renderContent()}</div>`;
    wireHeader();
    wirePanel();
    wireGame();
    fitWord();
  }

  function wireHeader(): void {
    for (const [value, testid] of [
      ['patterns', 'mode-patterns'],
      ['bee', 'mode-bee'],
    ] as const) {
      root.querySelector(`[data-testid="${testid}"]`)?.addEventListener('click', () => {
        if (mode === value) return;
        mode = value;
        try {
          window.localStorage.setItem(MODE_KEY, value);
          window.history.replaceState(
            null,
            '',
            value === 'bee' ? '#bee' : window.location.pathname,
          );
        } catch {
          /* private mode: the toggle still works for this session */
        }
        panelOpen = false;
        if (value === 'bee') startBeeRun();
        else startPatternRun();
        render();
      });
    }

    root.querySelector('[data-testid="pattern-toggle"]')?.addEventListener('click', () => {
      panelOpen = !panelOpen;
      render();
    });

    root.querySelector('[data-testid="how-to"]')?.addEventListener('click', () => {
      // Instructions only: the run and the current word stay exactly as they are.
      howToOpen = !howToOpen;
      render();
    });
  }

  function applySelection(next: string[]): void {
    selected = next;
    saveSelection(selected, store_);
    if (next.length === 0) {
      render();
      return;
    }
    startPatternRun();
    render();
  }

  function applyBeeChoice(next: BeeChoice): void {
    beeChoice = next;
    if (beeSize() > 0) startBeeRun();
    render();
  }

  function wirePanel(): void {
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')) {
      input.addEventListener('change', () => {
        const next = [...root.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')]
          .filter((box) => box.checked)
          .map((box) => box.value);
        applySelection(next);
      });
    }

    for (const key of ['starters', 'movers', 'nonsense'] as const) {
      root
        .querySelector<HTMLInputElement>(`[data-testid="level-${key}"]`)
        ?.addEventListener('change', (event) => {
          applyBeeChoice({ ...beeChoice, [key]: (event.target as HTMLInputElement).checked });
        });
    }
  }

  function openPanel(): void {
    panelOpen = true;
    render();
  }

  function wireGame(): void {
    root.querySelector('[data-testid="choose-patterns"]')?.addEventListener('click', openPanel);

    root.querySelector('[data-testid="again"]')?.addEventListener('click', () => {
      if (beeMode()) startBeeRun();
      else startPatternRun();
      render();
    });

    const word = session ? currentWord(session) : null;
    if (!session || !word) return;

    // AC32: in bee mode the word is dictated, never read. The grown-up can reveal
    // it to mark the child's spelling, and each new word is spoken once on arrival.
    if (beeMode()) {
      root.querySelector('[data-testid="peek"]')?.addEventListener('click', () => {
        root.querySelector('[data-testid="word-box"]')?.removeAttribute('hidden');
        root.querySelector('[data-testid="word"]')?.removeAttribute('hidden');
        // A word revealed at a large stored size must be fitted, not clipped by nowrap.
        fitWord();
      });
      const key = `${word.word}:${session.right}:${session.wrong}`;
      if (spokenAt !== key) {
        spokenAt = key;
        player.play(word.word, volumeValue(volume));
      }
    }

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
  }

  window.addEventListener('resize', scheduleFit);

  if (mode === 'bee') startBeeRun();
  else startPatternRun();
  render();

  return {
    session: () => session,
    unmount: () => {
      window.removeEventListener('resize', scheduleFit);
      if (flashTimer !== null) clearTimeout(flashTimer);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      flashTimer = null;
      resizeTimer = null;
      player.stop();
    },
  };
}
