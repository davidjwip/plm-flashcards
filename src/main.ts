import { allDecks, buildRound, listDecks, type Deck, type Word } from './decks';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('no #app element');

function renderPicker(decks: Deck[]): void {
  const listed = listDecks(decks);
  app!.innerHTML = `
    <h1 class="title">Spelling practice</h1>
    <p class="hint">Choose a pattern. Grown-up: pick the one being learned this week.</p>
    <ul class="decks" data-testid="deck-picker">
      ${listed
        .map(
          (deck, index) => `
        <li>
          <button class="deck" data-testid="deck-item" data-deck-id="${deck.id}" data-index="${index}">
            <span class="deck-title">${deck.title}</span>
            <span class="deck-meta">Level ${deck.level} · Unit ${deck.unit} · ${deck.words.length} words</span>
            ${deck.suggested ? '<span class="suggested" data-testid="suggested">start here</span>' : ''}
          </button>
        </li>`,
        )
        .join('')}
    </ul>`;
}

function renderRound(deck: Deck, words: Word[]): void {
  app!.innerHTML = `
    <section data-testid="round">
      <h1 class="title">${deck.title}</h1>
      <p class="hint">${words.length} words in this round</p>
      <ul class="words" data-testid="round-words">
        ${words.map((w) => `<li data-testid="round-word"><span>${w.word}</span><span class="graphemes">${w.graphemes.map((grapheme) => grapheme.text).join(' · ')}</span></li>`).join('')}
      </ul>
      <button class="back" data-testid="back-to-picker">Choose another pattern</button>
    </section>`;
}

function start(deckId: string): void {
  const deck = allDecks.find((candidate) => candidate.id === deckId);
  if (!deck) return;
  renderRound(deck, buildRound(allDecks, deckId));
  app!.querySelector('[data-testid="back-to-picker"]')?.addEventListener('click', () => {
    renderPicker(allDecks);
    wirePicker();
  });
}

function wirePicker(): void {
  app!.querySelectorAll<HTMLButtonElement>('[data-testid="deck-item"]').forEach((button) => {
    button.addEventListener('click', () => start(button.dataset.deckId ?? ''));
  });
}

renderPicker(allDecks);
wirePicker();
