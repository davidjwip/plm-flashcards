import type { Speaker, UtteranceCtor } from './speech';

export type AudioFactory = (src: string) => HTMLAudioElement;

export type PlayResult = 'file' | 'speech' | 'none';

export type PlayOptions = {
  volume: number;
  /** True when a pre-generated file exists for this word. */
  hasFile: (word: string) => boolean;
  makeAudio?: AudioFactory;
  synth?: Speaker;
  Utterance?: UtteranceCtor;
};

function defaultAudioFactory(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

/**
 * Play a word: the committed UK-voice file when one exists, otherwise the
 * browser voice. Never throws — audio is a hint, not the game.
 */
export function playWord(word: string, options: PlayOptions): PlayResult {
  const { volume, hasFile } = options;

  if (hasFile(word)) {
    try {
      const makeAudio = options.makeAudio ?? defaultAudioFactory;
      const audio = makeAudio(`audio/${word}.mp3`);
      audio.volume = volume;
      void audio.play?.();
      return 'file';
    } catch {
      return 'none';
    }
  }

  const synth =
    options.synth ?? (typeof window === 'undefined' ? undefined : window.speechSynthesis);
  const Utterance =
    options.Utterance ??
    (typeof SpeechSynthesisUtterance === 'undefined' ? undefined : SpeechSynthesisUtterance);
  if (!synth || !Utterance) return 'none';
  try {
    synth.cancel();
    const utterance = new Utterance(word);
    utterance.lang = 'en-GB';
    utterance.volume = volume;
    synth.speak(utterance);
    return 'speech';
  } catch {
    return 'none';
  }
}
