import bankJson from '../data/wordbank.json';
import {
  CELEBRATE_EVERY,
  buildDictionary,
  createSession,
  currentWord,
  cycleProgress,
  isDone,
  mark,
  patternOptions,
  praiseFor,
  progress,
} from './engine';
import type { Bank, Session, Verdict } from './types';
import './styles.css';

const STORAGE_KEY = 'plm.selectedPatterns';
const bank = bankJson as Bank;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('no #app element');

let selected: string[] = loadSelection();
let session: Session | null = null;
let celebrationDismissed = false;

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
    <p class="hint">Pick the sound patterns to practise. Grown-up screen — the child reads, you press.</p>

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

function renderEnd(): void {
  const s = session!;
  app!.innerHTML = `
    <section data-testid="summary" class="summary">
      <h1 class="title">Done — ${s.right} of ${s.right + s.wrong}</h1>
      <p class="hint">Right: ${s.right} · Not yet: ${s.wrong} · Best streak: ${s.bestStreak}</p>
      <button class="primary" data-testid="again">Same patterns again</button>
      <button class="secondary" data-testid="choose-patterns">Change patterns</button>
    </section>`;
  app!.querySelector('[data-testid="again"]')?.addEventListener('click', () => {
    session = createSession(buildDictionary(bank, selected));
    celebrationDismissed = false;
    renderSession();
  });
  app!.querySelector('[data-testid="choose-patterns"]')?.addEventListener('click', backToSettings);
}

function partyTrack(session: Session): string {
  const { filled, target } = cycleProgress(session);
  return `
    <div class="track" data-testid="track" data-filled="${filled}">
      ${Array.from({ length: target }, (_, i) => i + 1)
        .map((step) => `<span class="step ${step <= filled ? 'filled' : ''}">${step}</span>`)
        .join('')}
      <span class="track-end">🎉</span>
    </div>`;
}

function renderSession(): void {
  if (!session) return;
  const word = currentWord(session);
  const { position, total } = progress(session);

  if (!word) return renderEnd();

  const lastVerdict = session.marks.at(-1);
  const flash = lastVerdict === 'right' ? praiseFor(session.right) : '';

  app!.innerHTML = `
    <section class="game">
      <header class="game-bar">
        <span data-testid="progress">${position + 1} of ${total}</span>
        <span class="score">✓ ${session.right} · ✗ ${session.wrong}</span>
      </header>

      <div class="card" data-testid="word">${word.word}</div>

      ${flash ? `<div class="flash" data-testid="flash">${flash}</div>` : '<div class="flash-slot"></div>'}

      <button class="hear" data-testid="hear">🔊 hear it</button>

      <div class="verdicts">
        <button class="verdict right" data-testid="mark-right">✓ Got it</button>
        <button class="verdict wrong" data-testid="mark-wrong">✗ Not yet</button>
      </div>

      <div class="streak" data-testid="streak" ${session.streak > 0 ? '' : 'hidden'}>
        🔥 ${session.streak} in a row${session.bestStreak > 1 ? ` · best ${session.bestStreak}` : ''}
      </div>

      <div class="party">
        <span class="party-label">Path to the party</span>
        ${partyTrack(session)}
      </div>

      <button class="link" data-testid="choose-patterns">Change patterns</button>

      ${
        session.celebrate && !celebrationDismissed
          ? `<div class="celebration" data-testid="celebration">
               <div class="celebration-card">
                 <h2>🎉 Amazing job! 🎉</h2>
                 <p>${session.right} right — that is ${CELEBRATE_EVERY} in a row on the path!</p>
                 <div class="celebration-emojis">🎊 🎈 🚀</div>
                 <button class="primary" data-testid="celebration-close">Keep playing</button>
               </div>
             </div>`
          : ''
      }
    </section>`;

  // The flash is decoration: remove it on a timer, never re-render for it.
  if (flash) {
    const node = app!.querySelector('[data-testid="flash"]');
    setTimeout(() => node?.classList.add('gone'), 1100);
  }

  app!.querySelector('[data-testid="hear"]')?.addEventListener('click', () => speak(word.word));
  for (const [id, verdict] of [
    ['mark-right', 'right'],
    ['mark-wrong', 'wrong'],
  ] as const) {
    app!.querySelector(`[data-testid="${id}"]`)?.addEventListener('click', () => {
      session = mark(session!, verdict as Verdict);
      renderSession();
    });
  }
  app!.querySelector('[data-testid="celebration-close"]')?.addEventListener('click', () => {
    celebrationDismissed = true;
    renderSession();
  });
  app!.querySelector('[data-testid="choose-patterns"]')?.addEventListener('click', backToSettings);
}

function backToSettings(): void {
  session = null;
  celebrationDismissed = false;
  renderSettings();
  wireSettings();
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
    celebrationDismissed = false;
    renderSession();
  });
}

renderSettings();
wireSettings();
