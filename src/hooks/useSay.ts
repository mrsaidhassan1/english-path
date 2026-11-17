// Read a word or sentence aloud when a learner taps it or finishes a question.
import { useCallback } from 'react';
import { speak, speakable, ttsSupported } from '../lib/speech';
import { useApp } from '../store';

/** Returns say(text): plays the recording (or the browser voice) at the learner's speed. Arabic and empty text are skipped. */
export function useSay() {
  const { data } = useApp();
  const rate = data.settings.speechRate;
  return useCallback((text: string | undefined | null) => {
    if (speakable(text) && ttsSupported()) void speak(text, { rate });
  }, [rate]);
}
