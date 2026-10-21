import { describe, expect, it } from 'vitest';
import { createSession, mark } from './engine';
import { endView, gameView, settingsView, trackView } from './views';
import type { Session } from './types';

const options = [
  { id: 'ai', label: 'ai (rain)' },
  { id: 'oa', label: 'oa (boat)' },
];
const word = { word: 'boat', patterns: ['oa'] };

function sessionWith(verdicts: Array<'right' | 'wrong'>): Session {
  let session = createSession(
    Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, patterns: ['oa'] })),
  );
  for (const verdict of verdicts) session = mark(session, verdict);
  return session;
}

describe('settings view', () => {
  it('disables Start and says there are no words when nothing is selected', () => {
    const html = settingsView(options, [], 0, true);
    expect(html).toContain('No words yet');
    expect(html).toMatch(/data-testid="start"\s+disabled/);
    expect(html).toContain('open');
  });

  it('ticks the selected patterns and enables Start with a count', () => {
    const html = settingsView(options, ['ai'], 42, false);
    expect(html).toContain('42 words in this set');
    expect(html).not.toMatch(/data-testid="start"\s+disabled/);
    expect(html).toMatch(/value="ai"\s+checked/);
    expect(html).not.toMatch(/value="oa"\s+checked/);
    expect(html).toContain('1 selected');
  });
});

describe('game view', () => {
  it('shows the word, position and a ten-step track', () => {
    const html = gameView(sessionWith([]), word, true, 'font-size: 5.5rem', true, true, {
      label: '85%',
      canLouder: true,
      canQuieter: true,
    });
    expect(html).toContain('data-testid="word"');
    expect(html).toContain('>boat<');
    expect(html).toContain('1 of 20');
    expect(html).toContain('data-filled="0"');
    expect((html.match(/class="step/g) ?? []).length).toBe(10);
  });

  it('flashes encouragement only after a right answer', () => {
    expect(
      gameView(sessionWith(['wrong']), word, true, 'font-size: 5.5rem', true, true, {
        label: '85%',
        canLouder: true,
        canQuieter: true,
      }),
    ).not.toContain('data-testid="flash"');
    const praised = gameView(sessionWith(['right']), word, true, 'font-size: 5.5rem', true, true, {
      label: '85%',
      canLouder: true,
      canQuieter: true,
    });
    expect(praised).toContain('data-testid="flash"');
    expect(praised).toContain('Nice!');
  });

  it('hides the streak at zero and shows it once earned', () => {
    expect(
      gameView(sessionWith(['wrong']), word, true, 'font-size: 5.5rem', true, true, {
        label: '85%',
        canLouder: true,
        canQuieter: true,
      }),
    ).toMatch(/data-testid="streak" hidden/);
    const streaked = gameView(
      sessionWith(['right', 'right']),
      word,
      true,
      'font-size: 5.5rem',
      true,
      true,
      { label: '85%', canLouder: true, canQuieter: true },
    );
    expect(streaked).toMatch(/data-testid="streak" >/);
    expect(streaked).toContain('2 in a row');
  });

  it('shows the celebration on a milestone only while it is un-dismissed', () => {
    const milestone = sessionWith(Array(10).fill('right'));
    expect(
      gameView(milestone, word, true, 'font-size: 5.5rem', true, true, {
        label: '85%',
        canLouder: true,
        canQuieter: true,
      }),
    ).toContain('data-testid="celebration"');
    expect(
      gameView(milestone, word, false, 'font-size: 5.5rem', true, true, {
        label: '85%',
        canLouder: true,
        canQuieter: true,
      }),
    ).not.toContain('data-testid="celebration"');
  });
});

describe('word size controls', () => {
  it('applies the chosen size inline and offers both buttons', () => {
    const big = gameView(sessionWith([]), word, true, 'font-size: 9rem', false, true, {
      label: '85%',
      canLouder: true,
      canQuieter: true,
    });
    expect(big).toContain('style="font-size: 9rem"');
    expect(big).toMatch(/data-testid="word-bigger"\s+disabled/);
    expect(big).not.toMatch(/data-testid="word-smaller"\s+disabled/);

    const small = gameView(sessionWith([]), word, true, 'font-size: 3rem', true, false, {
      label: '85%',
      canLouder: true,
      canQuieter: true,
    });
    expect(small).toContain('style="font-size: 3rem"');
    expect(small).toMatch(/data-testid="word-smaller"\s+disabled/);
  });
});

describe('word size: unchosen', () => {
  it('AC20 — leaves the card without an inline size so clamp() applies', () => {
    const html = gameView(sessionWith([]), word, true, null, true, true, {
      label: '85%',
      canLouder: true,
      canQuieter: true,
    });
    expect(html).toContain('data-testid="word"');
    expect(html).not.toContain('style="font-size');
  });
});

describe('track and end views', () => {
  it('fills the track to the cycle position', () => {
    const html = trackView(sessionWith(['right', 'right', 'right']));
    expect(html).toContain('data-filled="3"');
    expect((html.match(/step filled/g) ?? []).length).toBe(3);
  });

  it('reports the score and best streak at the end', () => {
    const html = endView(sessionWith(['right', 'right', 'wrong']));
    expect(html).toContain('Done — 2 of 3');
    expect(html).toContain('Not yet: 1');
    expect(html).toContain('Best streak: 2');
  });
});
