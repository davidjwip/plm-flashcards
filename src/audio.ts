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
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const finish = (): void => {
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    playing = false;
    spoken = false;
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
      finish();
    },

    play: (word, volume) => {
      if (playing) return 'busy';

      if (options.hasFile(word)) {
        try {
          const element = ensureAudio(`audio/${word}.mp3`);
          element.volume = volume;
          try {
            element.currentTime = 0;
          } catch {
            /* some browsers refuse until metadata loads; harmless */
          }
          playing = true;
          // A rejected play() (autoplay policy, aborted load) fires no 'ended',
          // so without this the player stays 'busy' for ever.
          const started = element.play?.();
          if (started && typeof (started as Promise<void>).catch === 'function') {
            (started as Promise<void>).catch(() => finish());
          }
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
        // Without these handlers a cancelled or silently-dropped utterance never
        // reports completion, and the player refuses every later press as 'busy'.
        utterance.onend = () => finish();
        utterance.onerror = () => finish();
        synth.speak(utterance);
        spoken = true;
        playing = true;
        if (watchdog !== null) clearTimeout(watchdog);
        watchdog = setTimeout(finish, 900 + word.length * 140);
        return 'speech';
      } catch {
        playing = false;
        return 'none';
      }
    },
  };
}
