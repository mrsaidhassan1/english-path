// Typed access to the IATC resources imported by scripts/import_iatc_content.py.
import raw from './generated/iatc-content.json';
import type { DialogueLine, SourceRef, VocabItem } from '../types';

export interface IatcDay {
  id: string;
  week: number;
  day: string;
  theme: string;
  grammarTitle: string;
  smart: string;
  words: string[];
  grammar?: { rules: string[]; examples: string[]; practice: [string, string][] } | null;
  reading: { title: string; text: string; comp: [string, string][]; tf: [string, string][] } | null;
  reading2?: { title: string; text: string; keywords: string[]; comp: [string, string][]; tf: [string, string][]; writing?: IatcWriting; src: SourceRef };
  opp: [string, string][];
  plur: [string, string][];
  writing: IatcWriting & { title: string };
  speaking: string[];
  dictation?: { words: string[]; sentences: string[] } | null;
  src: SourceRef;
}
/** One day of a weekly unit (Sunday–Thursday), from the Week N reading handout + the matching deck day. */
export interface IatcUnitDay {
  id: string; // u3d2
  day: string;
  theme: string;
  deckDay: string;
  grammarTitle: string;
  smart: string;
  words: string[];
  grammar: { rules: string[]; examples: string[]; practice: [string, string][] } | null;
  reading: { title: string; text: string; keywords: string[]; comp: [string, string][]; tf: [string, string][]; src: SourceRef };
  opp: [string, string][];
  plur: [string, string][];
  writing: IatcWriting & { title: string };
  speaking: string[];
  src: SourceRef;
}
/** Unit N = Week N of the A0 – A1 Weekly Materials (aligned to New Headway Beginner Unit N). */
export interface IatcUnit { n: number; week: number; collegeWeek: number; dates: string; focus: string; headwayUnit: number; review: string[]; days: IatcUnitDay[]; src: SourceRef }
export interface IatcWriting { prompt: string; bullets: string[]; frame?: string; model: string; title?: string }

export interface IatcGrammar {
  id: string;
  num: number;
  title: string;
  sub: string;
  ar: string;
  smart: string;
  objectives: string[];
  warmup: string[];
  table?: { head: string[]; rows: string[][]; note?: string } | null;
  overviewTitle?: string;
  overview: string[][];
  rules: string[][];
  watch?: string;
  watchNote?: string;
  sections: { tag: string; title: string; formula: string; items: string[]; glosses: [string, string][] }[];
  practice: [string, string][];
  practiceTarget?: string;
  exit?: { prompt: string; bullets: string[]; frame?: string; model: string } | null;
  src: SourceRef;
}

export interface IatcDialogue { id: string; week: number; theme: string; grammar?: string; title: string; setting: string; lines: DialogueLine[]; src: SourceRef }
export interface IatcListening {
  id: string; week: number; theme: string; title: string; type: string;
  script: DialogueLine[]; mc: [string, string, string, string, string][]; notesTitle: string; notes: [string, string][]; tip?: string; src: SourceRef;
}
export interface IatcSpeaking {
  id: string; week: number; theme: string; warm: string[];
  task: { type: string; title: string; intro?: string; q?: string[] };
  talk: { topic: string; bullets: string[] }; lang: [string, string][]; src: SourceRef;
  p1?: [question: string, ar: string, model: string][]; // Headway-aligned packs: Part 1 questions with Arabic and a model answer
  p2?: { topic: string; title?: string; prompts: string[]; answers?: string[]; models?: string[] }[]; // information-exchange cards
}
export interface IatcMock {
  id: string; week: number; title: string; p1intro: string; email: string[];
  p1: [string, string][];
  p2: [string, string[], string][];
  p3: [string, string, string, string][];
  p4: [string, string[], string][];
  p5: [string, string[], string][];
  writing?: { title: string; prompt: string; bullets: string[]; model: string } | null;
  src: SourceRef;
}
export interface IatcListeningExam {
  id: string; week: number; day: string; theme: string; grammar: string;
  cast?: Record<string, string>; // voice per speaker, as in the class MP3s
  p1: { example: ListenMc; items: ListenMc[] };
  p2: { title: string; speaker: string; sentences: { text: string; opts?: string[]; focus?: string }[] };
  p3: { title: string; focus: string; lines: DialogueLine[]; items: [string, string][] | [string, boolean][] };
  src: SourceRef;
}
export interface ListenMc { q: string; opts: string[]; ans: number; focus?: string; lines: DialogueLine[] }
export interface IatcTopic { id: string; title: string; ar: string; frame: string; words: string[] }

interface RawContent {
  generatedAt: string;
  counts: Record<string, number>;
  vocab: VocabItem[];
  oxfordA1: string[];
  topics: IatcTopic[];
  days: IatcDay[];
  units: IatcUnit[];
  grammar: IatcGrammar[];
  dialogues: IatcDialogue[];
  listening: IatcListening[];
  speaking: IatcSpeaking[];
  mocks: IatcMock[];
  listeningExams: IatcListeningExam[];
  report: { skipped: { item: string; reason: string }[]; nameReplacements: number };
}

export const IATC = raw as unknown as RawContent;

const vocabById = new Map(IATC.vocab.map((v) => [v.id, v]));
const dayById = new Map(IATC.days.map((d) => [d.id, d]));
const dialogueById = new Map(IATC.dialogues.map((d) => [d.id, d]));

export const getWord = (id: string): VocabItem | undefined => vocabById.get(id);
export const getDay = (id: string): IatcDay | undefined => dayById.get(id);
export const getDialogue = (id: string): IatcDialogue | undefined => dialogueById.get(id);
export const getUnitData = (n: number): IatcUnit | undefined => IATC.units.find((u) => u.n === n);
export const getListening = (id: string): IatcListening | undefined => IATC.listening.find((l) => l.id === id);
export const getGrammar = (id: string): IatcGrammar | undefined => IATC.grammar.find((g) => g.id === id);

/** Word ids that exist, in order, without duplicates. */
export function existingWords(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => vocabById.has(id) && !seen.has(id) && seen.add(id));
}

export function wordsOfDays(dayIds: string[]): string[] {
  return existingWords(dayIds.flatMap((d) => dayById.get(d)?.words ?? []));
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const oxfordSet = new Set(IATC.oxfordA1.flatMap((w) => w.split(/,\s*/)).map((w) => w.toLowerCase()));
export const isOxfordA1 = (word: string) => oxfordSet.has(word.toLowerCase().replace(/[?!.]/g, '').trim());
