import { describe, expect, it, vi } from 'vitest';
import { playWord } from './audio';

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

describe('audio', () => {
  it('AC21 — plays the committed UK-voice file at the chosen volume', () => {
    const play = vi.fn(() => Promise.resolve());
    const makeAudio = vi.fn(
      (src: string) => ({ src, volume: 1, play }) as unknown as HTMLAudioElement,
    );

    const result = playWord('night', { volume: 0.7, hasFile: () => true, makeAudio });

    expect(result).toBe('file');
    expect(makeAudio).toHaveBeenCalledWith('audio/night.mp3');
    expect(play).toHaveBeenCalled();
    expect((makeAudio.mock.results[0]?.value as HTMLAudioElement).volume).toBe(0.7);
  });

  it('AC21b — falls back to the browser voice, at the chosen volume, when no file exists', () => {
    const synth = fakeSynth();
    const result = playWord('zorb', {
      volume: 0.5,
      hasFile: () => false,
      synth: synth as never,
      Utterance: FakeUtterance as never,
    });

    expect(result).toBe('speech');
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe('zorb');
    expect(utterance.lang).toBe('en-GB');
    expect(utterance.volume).toBe(0.5);
  });

  it('AC21c — degrades to silence instead of throwing', () => {
    expect(
      playWord('night', {
        volume: 1,
        hasFile: () => true,
        makeAudio: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('none');

    expect(
      playWord('night', {
        volume: 1,
        hasFile: () => false,
        synth: undefined,
        Utterance: undefined,
      }),
    ).toBe('none');
  });
});
