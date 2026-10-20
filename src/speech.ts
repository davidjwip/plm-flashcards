export type Speaker = Pick<SpeechSynthesis, 'cancel' | 'speak'>;

export type UtteranceCtor = new (text: string) => SpeechSynthesisUtterance;

/**
 * Speak a word as a hint. Never throws: speech is optional, and a browser
 * without it must still run the game.
 */
export function speakWord(
  word: string,
  synth: Speaker | undefined = typeof window === 'undefined' ? undefined : window.speechSynthesis,
  Utterance: UtteranceCtor | undefined = typeof SpeechSynthesisUtterance === 'undefined'
    ? undefined
    : SpeechSynthesisUtterance,
): boolean {
  if (!synth || !Utterance) return false;
  try {
    synth.cancel();
    const utterance = new Utterance(word);
    utterance.lang = 'en-GB';
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
