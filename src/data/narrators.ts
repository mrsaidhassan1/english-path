// Narrators for the A1 Graded Readers (Reading page). Each story is recorded once per narrator with
// the Kokoro voices (scripts/audio-requests.ts → scripts/build_voices.py); the reader picks one.
import data from './generated/graded-readers.json';

export interface ReaderLine { speaker?: string; text: string }
export interface Reader {
  week: number;
  title: string;
  setting: string;
  focus: string[];
  story: ReaderLine[];
  check: string[];
  talk: string[];
  vocab: { word: string; ar: string; meaning: string; example: string }[];
  more: { word: string; meaning: string }[];
}
export const READERS = data as Reader[];

export interface Narrator { id: string; name: string; accent: string; about: string; voice: string; speaker: string }
const n = (id: string, name: string, accent: string, about: string, voice: string): Narrator => ({ id, name, accent, about, voice, speaker: `narrator-${id}` });

export const NARRATORS: Narrator[] = [
  n('emma', 'Emma', 'British', 'Calm and clear', 'bf_emma'),
  n('george', 'George', 'British', 'Slow and steady', 'bm_george'),
  n('bella', 'Bella', 'American', 'Warm and friendly', 'af_bella'),
  n('michael', 'Michael', 'American', 'Clear and simple', 'am_michael'),
  n('aoede', 'Aoede', 'American', 'Soft and gentle', 'af_aoede'),
];
export const DEFAULT_NARRATOR = NARRATORS[0].id;

/** What the narrator reads for one story line: the speaker's name first, as on the page. */
export const readerLine = (l: ReaderLine) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text);
