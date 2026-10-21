import { CELEBRATE_EVERY, cycleProgress, praiseFor, progress } from './engine';
import type { Pattern, Session, Word } from './types';

/** Keep view code boring: strings in, strings out, no state. */

export function settingsView(
  options: Pattern[],
  selected: string[],
  wordCount: number,
  open: boolean,
): string {
  return `
    <h1 class="title">Sound practice</h1>
    <p class="hint">Pick the sound patterns to practise. Grown-up screen — the child reads, you press.</p>

    <details class="picker" data-testid="pattern-panel" ${open ? 'open' : ''}>
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
      ${wordCount ? `${wordCount} words in this set` : 'No words yet — pick at least one pattern'}
    </p>

    <button class="primary" data-testid="start" ${wordCount ? '' : 'disabled'}>
      Start practice
    </button>`;
}

export function beeSettingsView(
  choice: { starters: boolean; movers: boolean; nonsense: boolean },
  wordCount: number,
): string {
  const box = (id: string, checked: boolean, label: string): string => `
        <label class="option">
          <input type="checkbox" data-testid="level-${id}" ${checked ? 'checked' : ''} />
          <span>${label}</span>
        </label>`;
  return `
    <h1 class="title">Spelling bee</h1>
    <p class="hint">Grown-up screen. The app says a word, the child writes it, you press. Ten words a round.</p>

    <div class="picker" data-testid="bee-panel">
      <div class="options">
        ${box('starters', choice.starters, 'Cambridge Starters words')}
        ${box('movers', choice.movers, 'Cambridge Movers words')}
        ${box('nonsense', choice.nonsense, 'Nonsense words (sound them out)')}
      </div>
    </div>

    <p class="hint" data-testid="bee-count">${wordCount} words to draw from</p>
    <button class="start" data-testid="start" ${wordCount ? '' : 'disabled'}>Start</button>
    <p class="hint"><a href="./">← back to sound patterns</a></p>
  `;
}

export function trackView(session: Session): string {
  const { filled, target } = cycleProgress(session);
  return `
    <div class="track" data-testid="track" data-filled="${filled}">
      ${Array.from({ length: target }, (_, i) => i + 1)
        .map((step) => `<span class="step ${step <= filled ? 'filled' : ''}">${step}</span>`)
        .join('')}
      <span class="track-end">🎉</span>
    </div>`;
}

export function gameView(
  session: Session,
  word: Word,
  showCelebration: boolean,
  wordSizeStyle: string | null,
  canGrow: boolean,
  canShrink: boolean,
  volume: { label: string; canLouder: boolean; canQuieter: boolean },
  note?: string,
): string {
  const { position, total } = progress(session);
  const lastVerdict = session.marks.at(-1);
  const flash = lastVerdict === 'right' ? praiseFor(session.right) : '';

  return `
    <section class="game">
      <header class="game-bar">
        <span data-testid="progress">${position + 1} of ${total}</span>
        <span class="score">✓ ${session.right} · ✗ ${session.wrong}</span>
      </header>

      ${note ? `<p class="hint" data-testid="bee-note">${note}</p>` : ''}

      <div class="card" data-testid="word"${wordSizeStyle ? ` style="${wordSizeStyle}"` : ''}>${word.word}</div>

      <div class="size-controls" data-testid="size-controls">
        <button class="size-btn" data-testid="word-smaller" ${canShrink ? '' : 'disabled'} aria-label="Smaller word">A−</button>
        <button class="size-btn" data-testid="word-bigger" ${canGrow ? '' : 'disabled'} aria-label="Bigger word">A+</button>
        <span class="control-sep" aria-hidden="true"></span>
        <button class="size-btn" data-testid="volume-down" ${volume.canQuieter ? '' : 'disabled'} aria-label="Quieter">🔉−</button>
        <span class="volume-label" data-testid="volume-label">${volume.label}</span>
        <button class="size-btn" data-testid="volume-up" ${volume.canLouder ? '' : 'disabled'} aria-label="Louder">🔉+</button>
      </div>

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
        ${trackView(session)}
      </div>

      <button class="link" data-testid="choose-patterns">Change patterns</button>

      ${
        session.celebrate && showCelebration
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
}

export function endView(session: Session): string {
  return `
    <section data-testid="summary" class="summary">
      <h1 class="title">Done — ${session.right} of ${session.right + session.wrong}</h1>
      <p class="hint">Right: ${session.right} · Not yet: ${session.wrong} · Best streak: ${session.bestStreak}</p>
      <button class="primary" data-testid="again">Same patterns again</button>
      <button class="secondary" data-testid="choose-patterns">Change patterns</button>
    </section>`;
}
