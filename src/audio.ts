import type { Speaker, UtteranceCtor } from './speech';

export type AudioFactory = (src: string) => HTMLAudioElement;

/** `busy` means a word is already playing — the press is deliberately ignored. */
export type PlayResult = 'file' | 'speech' | 'busy' | 'none';

export type PlayerOptions = {
  /** True when a pre-generated file exists for this word. */
  hasFile: (word: string) => boolean;
  makeAudio?: AudioFactory;
  synth?: Speaker;
  Utterance?: UtteranceCtor;
};

export type Player = {
  play: (word: string, volume: number) => PlayResult;
  stop: () => void;
  isPlaying: () => boolean;
};

function defaultAudioFactory(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

/**
 * One player per app. A word plays to completion; pressing again while it is
 * still speaking is ignored rather than layered on top, which is what a child
 * mashing "hear it" would otherwise produce.
 */
export function createPlayer(options: PlayerOptions): Player {
  const makeAudio = options.makeAudio ?? defaultAudioFactory;
  let audio: HTMLAudioElement | null = null;
  let audioSrc: string | null = null;
  let playing = false;
  let spoken = false;

  const finish = (): void => {
    playing = false;
  };

  const ensureAudio = (src: string): HTMLAudioElement => {
    if (!audio || audioSrc !== src) {
      if (audio) audio.pause?.();
      audio = makeAudio(src);
      audioSrc = src;
      audio.addEventListener?.('ended', finish);
      audio.addEventListener?.('error', finish);
    }
    return audio;
  };

  return {
    isPlaying: () => playing,

    stop: () => {
      if (audio) audio.pause?.();
      if (spoken) options.synth?.cancel?.();
      spoken = false;
      playing = false;
    },

    play: (word, volume) => {
      if (playing) return 'busy';

      if (options.hasFile(word)) {
        try {
          const element = ensureAudio(`audio/${word}.mp3`);
          element.volume = volume;
          playing = true;
          void element.play?.();
          return 'file';
        } catch {
          playing = false;
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
        spoken = true;
        playing = true;
        return 'speech';
      } catch {
        playing = false;
        return 'none';
      }
    },
  };
}
