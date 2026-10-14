// One key per spoken line, shared by the recording script and the player.
import { stripMarkup } from './text';

export const normText = (s: string) => stripMarkup(s).replace(/…/g, ' ').replace(/\s+/g, ' ').trim();

/** `id` looks up the recording; `spoken` is the text the voice reads. */
export function audioKey(text: string, speaker = ''): { id: string; text: string; spoken: string } {
  const t = normText(text);
  return { id: `${speaker.trim().toLowerCase()}|${t.toLowerCase()}`, text: t, spoken: t };
}
