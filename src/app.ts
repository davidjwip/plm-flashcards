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
import type { Bank, Session, Verdict, Word } from './types';
import {
  beeCountText,
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
import { L2_PATTERN_IDS, untaught } from './levels';
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
  let beeChoice: BeeChoice = { starters: true, movers: true, nonsense: true, l2: false };
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
  let collapsedGroups: string[] = [];
  let searchQuery = '';
  // Tracked so focus lands in search only when the panel opens, never on a rerender.
  let wasPanelOpen = false;
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

  /** The chip's full selection means Level 2: every sound in the word must be taught. */
  function l2ChipSelection(patterns: string[] = selected): boolean {
    return L2_PATTERN_IDS.every((id) => patterns.includes(id));
  }

  /**
   * Coverage ignores a split-digraph reading when the bank tags the word `ghost_e`:
   * the bank is the authority on that vowel, and `have`/`come` only look like `a_e`/`o_e`.
   */
  function coverageMissing(word: Word): string[] {
    return untaught(word.word).filter(
      (grapheme) => !(word.patterns.includes('ghost_e') && grapheme.endsWith('_e')),
    );
  }

  /**
   * The run and the count share this list, so they can never disagree. A full L2
   * selection also applies the coverage rule; a manual subset is left alone.
   */
  function dictionaryFor(patterns: string[]): Word[] {
    const dictionary = buildDictionary(bank, patterns);
    return l2ChipSelection(patterns)
      ? dictionary.filter((word) => coverageMissing(word).length === 0)
      : dictionary;
  }

  function runDictionary(): Word[] {
    return dictionaryFor(selected);
  }

  /**
   * The Level 2 deck: the live chip set when the selection holds the whole chip
   * (it may hold extra patterns), else the canonical set. One function of the real
   * state, so the bee and a patterns run cannot disagree about what Level 2 is.
   */
  function l2Deck(): Word[] {
    return l2ChipSelection() ? runDictionary() : dictionaryFor([...L2_PATTERN_IDS]);
  }

  function dictionarySize(): number {
    return runDictionary().length;
  }

  /** In Level 2 the size is the shared bank set, not the Cambridge deck. */
  function beeSize(): number {
    if (!beeDeck) return 0;
    return beeChoice.l2 ? l2Deck().length : beeDictionary(beeDeck, beeChoice).length;
  }

  function beeDictionaryForChoice(): Word[] {
    if (!beeDeck) return [];
    return beeDictionary(beeDeck, beeChoice, {
      l2Words: beeChoice.l2 ? l2Deck() : [],
    });
  }

  function toggleLabel(): string {
    if (beeMode()) {
      const levels = [
        beeChoice.starters,
        beeChoice.movers,
        beeChoice.nonsense,
        beeChoice.l2,
      ].filter(Boolean);
      return `Levels · ${levels.length}`;
    }
    return `Patterns · ${selected.length}`;
  }

  function toggleShortLabel(): string {
    // The mode pill already reads "Patterns" at this width; name the list instead,
    // or the header shows two identical pills side by side.
    return beeMode() ? 'Levels' : 'Words';
  }

  function countText(): string {
    if (beeMode()) return beeCountText(beeChoice, beeSize());
    if (selected.length === 0) return 'pick at least one pattern';
    return `${dictionarySize()} words in this set`;
  }

  function panelView(): string {
    if (beeMode()) return beePanel(beeChoice, beeSize(), panelOpen);
    return patternPanel(patternOptions(bank), selected, panelOpen, collapsedGroups);
  }

  function clearRun(): void {
    dismissedMilestone = null;
    spokenAt = null;
    if (flashTimer !== null) {
      clearTimeout(flashTimer);
      flashTimer = null;
    }
    player.stop();
  }

  function startPatternRun(): void {
    clearRun();
    const dictionary = runDictionary();
    session = dictionary.length ? createSession(dictionary) : null;
  }

  function startBeeRun(): void {
    clearRun();
    const dictionary = beeDictionaryForChoice();
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

  type ScrollState = { options: number; page: number };

  /**
   * Replacing root.innerHTML destroys the open panel's scroll box. Remember where
   * the grown-up was before the swap, including the page when the panel is not the
   * scrolling element on a short viewport (AC58).
   *
   * Scope: only while the panel is open. Re-renders with the panel closed (volume,
   * word size, a verdict) still reset the page position — pre-existing behaviour,
   * deliberately out of AC58's scope.
   */
  function captureScroll(): ScrollState | null {
    if (!panelOpen) return null;
    const panel = root.querySelector<HTMLElement>('.pattern-panel');
    if (!panel) return null;
    // `.pattern-panel` is not a scroll container; `.option-groups` is (max-height + overflow).
    const options = panel.querySelector<HTMLElement>('.option-groups');
    return {
      options: options?.scrollTop ?? 0,
      page: window.scrollY,
    };
  }

  function restoreScroll(state: ScrollState): void {
    const options = root.querySelector<HTMLElement>('.pattern-panel .option-groups');
    if (options) options.scrollTop = state.options;
    // Restoring a zero position is pointless and noisy in jsdom.
    if (state.page === 0) return;
    window.scrollTo(0, state.page);
  }

  function render(): void {
    const search = root.querySelector<HTMLInputElement>('[data-testid="pattern-search"]');
    const hadSearchFocus = document.activeElement === search;
    const scroll = captureScroll();
    root.innerHTML = `<div class="app-card">${headerView(
      mode,
      toggleLabel(),
      panelOpen,
      countText(),
      howToOpen,
      toggleShortLabel(),
    )}${howToPanel(howToOpen)}${panelView()}${renderContent()}</div>`;
    if (scroll) restoreScroll(scroll);
    wireHeader();
    wirePanel();
    wireGame();
    fitWord();
    if (panelOpen && !wasPanelOpen) {
      root.querySelector<HTMLInputElement>('[data-testid="pattern-search"]')?.focus();
    }
    if (panelOpen && searchQuery !== '') {
      const field = root.querySelector<HTMLInputElement>('[data-testid="pattern-search"]');
      if (field) restoreSearch(field, searchQuery, hadSearchFocus);
    }
    wasPanelOpen = panelOpen;
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
      clearRun();
      session = null;
      render();
      return;
    }
    startPatternRun();
    render();
  }

  function applyBeeChoice(next: BeeChoice): void {
    beeChoice = next;
    if (beeDictionaryForChoice().length === 0) {
      // A run must never outlive the deck that produced it: without this the old
      // word, verdict buttons and audio stay live next to a zero count.
      clearRun();
      session = null;
    } else {
      startBeeRun();
    }
    render();
  }

  /**
   * Filter in place. Re-rendering would replace the checkboxes and silently drop a
   * tick that the search had hidden, so every row stays in the DOM.
   */
  function filterPatterns(raw: string): void {
    const query = raw.toLowerCase();
    let matches = 0;

    for (const group of root.querySelectorAll<HTMLDetailsElement>('.option-group')) {
      let visible = 0;
      for (const row of group.querySelectorAll<HTMLElement>('.option')) {
        const box = row.querySelector<HTMLInputElement>('[data-testid="pattern-option"]');
        const label = row.textContent?.toLowerCase() ?? '';
        const hit =
          query === '' ||
          label.includes(query) ||
          (box?.value.toLowerCase().includes(query) ?? false);
        row.toggleAttribute('hidden', !hit);
        if (hit) {
          visible += 1;
          matches += 1;
        }
      }
      group.toggleAttribute('hidden', query !== '' && visible === 0);
    }

    const empty = root.querySelector<HTMLElement>('[data-testid="pattern-empty"]');
    if (empty) {
      empty.toggleAttribute('hidden', matches !== 0);
      empty.textContent = `no patterns match “${raw}”`;
    }
  }

  /** One restore path for the live input and for the field rebuilt by render (AC64). */
  function restoreSearch(field: HTMLInputElement, query: string, focus: boolean): void {
    if (field.value !== query) field.value = query;
    filterPatterns(query);
    if (!focus) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
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

    for (const key of ['starters', 'movers', 'nonsense', 'l2'] as const) {
      root
        .querySelector<HTMLInputElement>(`[data-testid="level-${key}"]`)
        ?.addEventListener('change', (event) => {
          applyBeeChoice({ ...beeChoice, [key]: (event.target as HTMLInputElement).checked });
        });
    }

    const search = root.querySelector<HTMLInputElement>('[data-testid="pattern-search"]');
    search?.addEventListener('input', () => {
      searchQuery = search.value;
      restoreSearch(search, searchQuery, false);
    });

    root.querySelector('[data-testid="l2-chip"]')?.addEventListener('click', () => {
      const l2 = new Set(L2_PATTERN_IDS);
      const allL2 = L2_PATTERN_IDS.every((id) => selected.includes(id));
      const wanted = new Set(
        allL2 ? selected.filter((id) => !l2.has(id)) : [...selected, ...L2_PATTERN_IDS],
      );
      // Bank order, so the saved selection is the same shape the checkboxes produce.
      applySelection(bank.patterns.map((pattern) => pattern.id).filter((id) => wanted.has(id)));
    });

    for (const details of root.querySelectorAll<HTMLDetailsElement>('.option-group')) {
      details.addEventListener('toggle', () => {
        const group = details.dataset.group;
        if (!group) return;
        const kept = collapsedGroups.filter((id) => id !== group);
        collapsedGroups = details.open ? kept : [...kept, group];
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
