import { describe, it, expect } from 'vitest';
import { allDecks, listDecks, buildRound } from './decks';

describe('decks', () => {
  it('AC3 — every deck holds between 8 and 12 words, and its graphemes spell the word', () => {
    expect(allDecks.length).toBeGreaterThan(0);
    for (const deck of allDecks) {
      expect(deck.words.length, `${deck.id} word count`).toBeGreaterThanOrEqual(8);
      expect(deck.words.length, `${deck.id} word count`).toBeLessThanOrEqual(12);
      for (const entry of deck.words) {
        const letters = entry.graphemes.map((grapheme) => grapheme.text).join('');
        expect(letters, `${deck.id}/${entry.word} segmentation`).toBe(entry.word);
        for (const grapheme of entry.graphemes) {
          if (grapheme.pattern) {
            expect(deck.patterns, `${deck.id}/${entry.word} pattern ${grapheme.pattern}`).toContain(
              grapheme.pattern,
            );
          }
        }
      }
    }
  });

  it('AC2 — a round only contains words from that deck or one taught earlier', () => {
    const deck = allDecks.find((d) => d.id === 'l2-u2-a-e-ai-ay');
    expect(deck, 'seed deck l2-u2-a-e-ai-ay exists').toBeDefined();
    if (!deck) return;

    const earlier = allDecks.filter(
      (d) => d.level < deck.level || (d.level === deck.level && d.unit <= deck.unit),
    );
    const allowed = new Set(earlier.flatMap((d) => d.words.map((w) => w.word)));

    const round = buildRound(allDecks, deck.id);
    expect(round.length).toBeGreaterThan(0);
    for (const entry of round) {
      expect(allowed.has(entry.word), `${entry.word} is decodable at ${deck.id}`).toBe(true);
    }
  });

  it('AC1 — decks are listed in teaching order with exactly one suggested', () => {
    const listed = listDecks(allDecks);
    expect(listed.length).toBe(allDecks.length);

    for (let i = 1; i < listed.length; i++) {
      const prev = listed[i - 1]!;
      const cur = listed[i]!;
      const ordered = prev.level < cur.level || (prev.level === cur.level && prev.unit <= cur.unit);
      expect(ordered, `${prev.id} comes before ${cur.id}`).toBe(true);
    }

    expect(listed.filter((d) => d.suggested)).toHaveLength(1);
    expect(listed[0]!.suggested).toBe(true);
  });
});
