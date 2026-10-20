import { describe, expect, it, vi } from 'vitest';
import { speakWord, type Speaker } from './speech';

function fakeSynth() {
  return { cancel: vi.fn(), speak: vi.fn() } as unknown as Speaker & {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
  };
}

class FakeUtterance {
  lang = '';
  constructor(public text: string) {}
}

describe('speech', () => {
  it('speaks the word in en-GB after cancelling anything in flight', () => {
    const synth = fakeSynth();
    expect(speakWord('night', synth, FakeUtterance as never)).toBe(true);
    expect(synth.cancel).toHaveBeenCalled();
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe('night');
    expect(utterance.lang).toBe('en-GB');
  });

  it('is a silent no-op where speech is unavailable', () => {
    expect(speakWord('night', undefined, FakeUtterance as never)).toBe(false);
    expect(speakWord('night', fakeSynth(), undefined)).toBe(false);
  });

  it('never throws when the browser rejects the utterance', () => {
    const synth = {
      cancel: () => {
        throw new Error('boom');
      },
      speak: vi.fn(),
    } as unknown as Speaker;
    expect(speakWord('night', synth, FakeUtterance as never)).toBe(false);
  });
});
