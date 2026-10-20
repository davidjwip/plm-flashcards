import bankJson from '../data/wordbank.json';
import {
  buildDictionary,
  createSession,
  currentWord,
  isDone,
  mark,
  patternOptions,
  progress,
} from './engine';
import type { Bank, Session } from './types';
import './styles.css';

const STORAGE_KEY = 'plm.selectedPatterns';
const bank = bankJson as Bank;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('no #app element');

let selected: string[] = loadSelection();
let session: Session | null = null;

function loadSelection(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveSelection(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  } catch {
    /* private mode: the selection just does not persist */
  }
}

function speak(word: string): void {
  // A hint, not the prompt: George reads the card. Silent no-op if unsupported.
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-GB';
  synth.speak(utterance);
}

function renderSettings(): void {
  const options = patternOptions(bank);
  const dictionary = buildDictionary(bank, selected);

  app!.innerHTML = `
    <h1 class="title">Sound practice</h1>
    <p class="hint">Pick the sound patterns to practise. Grown-up screen — George reads, you press.</p>

    <details class="picker" data-testid="pattern-panel" ${selected.length ? '' : 'open'}>
      <summary data-testid="pattern-toggle">Sound patterns${selected.length ? ` — ${selected.length} selected` : ''}</summary>
      <div class="options">
        ${options
          .map(
            (pattern) => `
          <label class="option">
            <input type="checkbox" data-testid="pattern-option" value="${pattern.id}"
              ${selected.includes(pattern.id) ? 'checked' : ''} />
            <span>${pattern.label}</span>
          </label>`,
          )
          .join('')}
      </div>
    </details>

    <p class="count" data-testid="word-count">
      ${
        dictionary.length
          ? `${dictionary.length} words in this set`
          : 'No words yet — pick at least one pattern'
      }
    </p>

    <button class="primary" data-testid="start" ${dictionary.length ? '' : 'disabled'}>
      Start practice
    </button>`;
}

function renderSession(): void {
  if (!session) return;
  const word = currentWord(session);
  const { position, total } = progress(session);

  if (!word) {
    app!.innerHTML = `
      <section data-testid="summary" class="summary">
        <h1 class="title">Done — ${session.right} of ${session.right + session.wrong}</h1>
        <p class="hint">Right: ${session.right} · Not yet: ${session.wrong}</p>
        <button class="primary" data-testid="again">Same patterns again</button>
        <button class="secondary" data-testid="choose-patterns">Change patterns</button>
      </section>`;
    app!.querySelector('[data-testid="again"]')?.addEventListener('click', () => {
      session = createSession(buildDictionary(bank, selected));
      renderSession();
    });
    app!.querySelector('[data-testid="choose-patterns"]')?.addEventListener('click', () => {
      session = null;
      renderSettings();
      wireSettings();
    });
    return;
  }

  app!.innerHTML = `
    <section class="game">
      <header class="game-bar">
        <span data-testid="progress">${position + 1} of ${total}</span>
        <span class="score">✓ ${session.right} · ✗ ${session.wrong}</span>
      </header>

      <div class="card" data-testid="word">${word.word}</div>

      <button class="hear" data-testid="hear">🔊 hear it</button>

      <div class="verdicts">
        <button class="verdict right" data-testid="mark-right">✓ Got it</button>
        <button class="verdict wrong" data-testid="mark-wrong">✗ Not yet</button>
      </div>

      <button class="link" data-testid="choose-patterns">Change patterns</button>

      ${
        session.celebrate
          ? `<div class="celebrate" data-testid="celebrate"><span>🎉</span> ${session.right} right!</div>`
          : ''
      }
    </section>`;

  app!.querySelector('[data-testid="hear"]')?.addEventListener('click', () => speak(word.word));
  for (const [id, verdict] of [
    ['mark-right', 'right'],
    ['mark-wrong', 'wrong'],
  ] as const) {
    app!.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
      session = mark(session!, verdict);
      renderSession();
    });
  }
  app!.querySelector('[data-testid="choose-patterns"]')?.addEventListener('click', () => {
    session = null;
    renderSettings();
    wireSettings();
  });
}

function wireSettings(): void {
  for (const input of app!.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')) {
    input.addEventListener('change', () => {
      selected = [...app!.querySelectorAll<HTMLInputElement>('[data-testid="pattern-option"]')]
        .filter((box) => box.checked)
        .map((box) => box.value);
      saveSelection();
      const open = app!.querySelector<HTMLDetailsElement>('[data-testid="pattern-panel"]')?.open;
      renderSettings();
      const panel = app!.querySelector<HTMLDetailsElement>('[data-testid="pattern-panel"]');
      if (panel) panel.open = open ?? true;
      wireSettings();
    });
  }

  app!.querySelector('[data-testid="start"]')?.addEventListener('click', () => {
    const dictionary = buildDictionary(bank, selected);
    if (!dictionary.length) return;
    session = createSession(dictionary);
    renderSession();
  });
}

renderSettings();
wireSettings();
