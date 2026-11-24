// Conversations (Units 1-14, five per unit: one for each lesson).
// Data: src/data/generated/conversations.json, made by scripts/import_conversations.py from the A1 conversation sheets.
// Every conversation is recorded with its own cast of Kokoro voices (scripts/audio-requests.ts → scripts/build_voices.py).
// These voices are not used anywhere else in the app (not the Reading narrators, not the lesson dialogues):
// British and American speakers take turns, one accent per conversation.
import data from './generated/conversations.json';

export interface ConvLine { speaker: string; text: string }
interface Raw { unit: number; lesson: number; title: string; where: string; people: string[]; lines: ConvLine[] }
export type Accent = 'British' | 'American';
export interface Conversation extends Raw {
  id: string;
  accent: Accent;
  /** speaker name → Kokoro voice */
  voices: Record<string, string>;
}

const VOICES: Record<Accent, { f: string[]; m: string[] }> = {
  British: { f: ['bf_alice', 'bf_lily', 'bf_isabella'], m: ['bm_daniel', 'bm_fable', 'bm_lewis'] },
  American: { f: ['af_heart', 'af_nova', 'af_sarah', 'af_nicole'], m: ['am_adam', 'am_echo', 'am_eric', 'am_onyx'] },
};
// Women in the conversations (everyone else is a man); key = "unit.lesson:name".
const FEMALE = new Set(['1.3:Worker', '3.4:Shop assistant', '4.5:Receptionist', '7.2:Assistant', '10.4:Worker', '11.5:Nurse', '12.2:Assistant', '13.1:Assistant', '14.3:Teacher']);

// A voice swapped by hand after listening ("unit.lesson:name" → voice).
const OVERRIDE: Record<string, string> = { '1.2:Saud': 'am_adam' };

export const conversationId = (unit: number, lesson: number) => `u${unit}-l${lesson}`;
/** The speaker id used for the recording of this person in this conversation. */
export const convSpeaker = (c: { id: string }, who: string) => `cv-${c.id}:${who}`;

export const CONVERSATIONS: Conversation[] = (data as Raw[]).map((r, i) => {
  const id = conversationId(r.unit, r.lesson);
  const accent: Accent = i % 2 === 0 ? 'British' : 'American';
  const next = { f: i, m: i };
  const voices: Record<string, string> = {};
  for (const who of r.people) {
    const k = FEMALE.has(`${r.unit}.${r.lesson}:${who}`) ? 'f' : 'm';
    const pool = VOICES[accent][k];
    const picked = pool[next[k]++ % pool.length];
    voices[who] = OVERRIDE[`${r.unit}.${r.lesson}:${who}`] ?? picked;
  }
  return { ...r, id, accent, voices };
});

export const CONV_UNITS = [...new Set(CONVERSATIONS.map((c) => c.unit))];
export const conversationsOf = (unit: number) => CONVERSATIONS.filter((c) => c.unit === unit);
