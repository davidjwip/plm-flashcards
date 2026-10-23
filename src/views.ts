import { CELEBRATE_EVERY, cycleProgress, praiseFor, progress } from './engine';
import type { Pattern, Session, Word } from './types';

/** Keep view code boring: strings in, strings out, no state. */

export type Mode = 'patterns' | 'bee';

/** Mode switch shown above every screen (AC33, AC36). */
export function modeBar(mode: Mode): string {
  const active = (value: Mode): string => (mode === value ? 'true' : 'false');
  return `
    <nav class="mode-bar" data-testid="mode-bar">
      <button data-testid="mode-patterns" aria-pressed="${active('patterns')}"
        class="${mode === 'patterns' ? 'on' : ''}">Sound patterns</button>
      <button data-testid="mode-bee" aria-pressed="${active('bee')}"
        class="${mode === 'bee' ? 'on' : ''}">Spelling bee</button>
    </nav>`;
}

/** The maths-game header: title, the two switches, and the live set count. */
export function headerView(
  mode: Mode,
  toggleLabel: string,
  open: boolean,
  countText: string,
): string {
  return `
    <header class="app-header">
      <h1 class="title">${mode === 'bee' ? 'Spelling bee' : 'Sound practice'}</h1>
      <p class="subtitle">${
        mode === 'bee' ? 'Listen, write it, then press.' : 'Read it aloud — you press.'
      }</p>
      <div class="header-controls">
        ${modeBar(mode)}
        <button class="word-list-toggle" data-testid="pattern-toggle" aria-expanded="${open}">
          ${toggleLabel}
        </button>
      </div>
      <p class="count" data-testid="word-count">${countText}</p>
    </header>`;
}

/** Pattern picker: a closed panel by default, never a modal (AC36, AC44). */
export function patternPanel(options: Pattern[], selected: string[], open: boolean): string {
  return `
    <section class="pattern-panel" data-testid="pattern-panel" ${open ? '' : 'hidden'}>
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
    </section>`;
}

/** Bee levels live behind the same header toggle, instead of the pattern list. */
export function beePanel(
  choice: { starters: boolean; movers: boolean; nonsense: boolean },
  wordCount: number,
  open: boolean,
): string {
  const box = (id: string, checked: boolean, label: string): string => `
        <label class="option">
          <input type="checkbox" data-testid="level-${id}" ${checked ? 'checked' : ''} />
          <span>${label}</span>
        </label>`;
  return `
    <section class="pattern-panel" data-testid="bee-panel" ${open ? '' : 'hidden'}>
      <div class="options">
        ${box('starters', choice.starters, 'Cambridge Starters words')}
        ${box('movers', choice.movers, 'Cambridge Movers words')}
        ${box('nonsense', choice.nonsense, 'Nonsense words (sound them out)')}
      </div>
      <p class="count" data-testid="bee-count">${wordCount} words to draw from</p>
    </section>`;
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

function gameControls(
  canGrow: boolean,
  canShrink: boolean,
  volume: { label: string; canLouder: boolean; canQuieter: boolean },
  hideWord: boolean,
): string {
  return `
      <div class="size-controls" data-testid="size-controls">
        ${
          hideWord
            ? ''
            : `<button class="size-btn" data-testid="word-smaller" ${canShrink ? '' : 'disabled'} aria-label="Smaller word">A−</button>
        <button class="size-btn" data-testid="word-bigger" ${canGrow ? '' : 'disabled'} aria-label="Bigger word">A+</button>
        <span class="control-sep" aria-hidden="true"></span>`
        }
        <button class="size-btn" data-testid="volume-down" ${volume.canQuieter ? '' : 'disabled'} aria-label="Quieter">🔉−</button>
        <span class="volume-label" data-testid="volume-label">${volume.label}</span>
        <button class="size-btn" data-testid="volume-up" ${volume.canLouder ? '' : 'disabled'} aria-label="Louder">🔉+</button>
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
  hideWord = false,
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

      <div class="word-box" data-testid="word-box"${hideWord ? ' hidden' : ''}>
        <div class="card" data-testid="word"${wordSizeStyle ? ` style="${wordSizeStyle}"` : ''}${hideWord ? ' hidden' : ''}>${word.word}</div>
      </div>

      ${hideWord ? '<button class="action-btn" data-testid="peek" aria-label="Show the word to the grown-up">Show word</button>' : ''}

      ${gameControls(canGrow, canShrink, volume, hideWord)}

      ${flash ? `<div class="flash" data-testid="flash">${flash}</div>` : '<div class="flash-slot"></div>'}

      <button class="action-btn hear" data-testid="hear">🔊 hear it</button>

      <div class="verdict-pad" data-testid="verdict-pad">
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

      <footer class="game-footer">
        <button class="link" data-testid="choose-patterns">${hideWord ? 'Change settings' : 'Change patterns'}</button>
      </footer>

      ${
        session.celebrate && showCelebration
          ? `<div class="celebration" data-testid="celebration">
               <div class="celebration-card">
                 <h2>🎉 Amazing job! 🎉</h2>
                 <p>${session.right} right — that is ${CELEBRATE_EVERY} in a row on the path!</p>
                 <div class="celebration-emojis">🎊 🎈 🚀</div>
                 <button class="action-btn" data-testid="celebration-close">Keep playing</button>
               </div>
             </div>`
          : ''
      }
    </section>`;
}

export function emptyView(): string {
  return `
    <section class="empty">
      <p class="hint">pick at least one pattern</p>
    </section>`;
}

export function endView(session: Session): string {
  return `
    <section data-testid="summary" class="summary">
      <h1 class="title">Done — ${session.right} of ${session.right + session.wrong}</h1>
      <p class="hint">Right: ${session.right} · Not yet: ${session.wrong} · Best streak: ${session.bestStreak}</p>
      <button class="action-btn" data-testid="again">Same patterns again</button>
      <button class="secondary" data-testid="choose-patterns">Change patterns</button>
    </section>`;
}
