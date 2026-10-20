import { describe, expect, it, vi } from 'vitest';
import { createPlayer } from './audio';

class FakeUtterance {
  lang = '';
  volume = 1;
  constructor(public text: string) {}
}

function fakeSynth() {
  return { cancel: vi.fn(), speak: vi.fn() } as unknown as {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
  };
}

/** Just enough of HTMLAudioElement for the player, with a way to end playback. */
function fakeAudioElement() {
  const listeners: Record<string, Array<() => void>> = {};
  const element = {
    src: '',
    volume: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    getAttribute: vi.fn((name: string) => (name === 'src' ? element.src : null)),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      (listeners[event] ??= []).push(handler);
    }),
    fire: (event: string) => (listeners[event] ?? []).forEach((handler) => handler()),
  };
  return element;
}

describe('player', () => {
  it('AC21 — plays the committed UK-voice file at the chosen volume', () => {
    const element = fakeAudioElement();
    const player = createPlayer({ hasFile: () => true, makeAudio: () => element as never });

    expect(player.play('night', 0.7)).toBe('file');
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(element.volume).toBe(0.7);
  });

  it('AC23 — a second press while the word is still playing is ignored', () => {
    const element = fakeAudioElement();
    const player = createPlayer({ hasFile: () => true, makeAudio: () => element as never });

    expect(player.play('night', 1)).toBe('file');
    expect(player.play('night', 1)).toBe('busy');
    expect(player.play('night', 1)).toBe('busy');
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(player.isPlaying()).toBe(true);
  });

  it('AC24 — once the word finishes, the next press plays it again', () => {
    const element = fakeAudioElement();
    const player = createPlayer({ hasFile: () => true, makeAudio: () => element as never });

    player.play('night', 1);
    element.fire('ended');
    expect(player.isPlaying()).toBe(false);

    expect(player.play('night', 1)).toBe('file');
    expect(element.play).toHaveBeenCalledTimes(2);
  });

  it('AC25 — one audio element is reused, not one per press', () => {
    const makeAudio = vi.fn(() => fakeAudioElement() as never);
    const player = createPlayer({ hasFile: () => true, makeAudio });

    player.play('night', 1);
    makeAudio.mock.results[0]?.value?.fire?.('ended');
    player.play('night', 1);

    expect(makeAudio).toHaveBeenCalledWith('audio/night.mp3');
    expect(makeAudio).toHaveBeenCalledTimes(1);
  });

  it('stops playback when the run moves on', () => {
    const element = fakeAudioElement();
    const player = createPlayer({ hasFile: () => true, makeAudio: () => element as never });

    player.play('night', 1);
    player.stop();
    expect(element.pause).toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
  });

  it('AC21b — falls back to the browser voice, at the chosen volume, when no file exists', () => {
    const synth = fakeSynth();
    const player = createPlayer({
      hasFile: () => false,
      synth: synth as never,
      Utterance: FakeUtterance as never,
    });

    expect(player.play('zorb', 0.5)).toBe('speech');
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe('zorb');
    expect(utterance.lang).toBe('en-GB');
    expect(utterance.volume).toBe(0.5);
    expect(player.play('zorb', 0.5)).toBe('busy');
  });

  it('AC21c — degrades to silence instead of throwing', () => {
    const broken = createPlayer({
      hasFile: () => true,
      makeAudio: () => {
        throw new Error('blocked');
      },
    });
    expect(broken.play('night', 1)).toBe('none');
    expect(broken.isPlaying()).toBe(false);

    const noSynth = createPlayer({ hasFile: () => false, synth: undefined, Utterance: undefined });
    expect(noSynth.play('night', 1)).toBe('none');
  });
});
