// Content map: every imported IATC item with its tags and a teacher-visible source reference.
import type { Cefr, ContentStatus, Skill, SourceRef } from '../types';
import { IATC } from './content';
import { UNIT_CFG } from './modules/units';
import { GRAMMAR_KEYS } from './grammarKeys';
import { ROLE_PLAYS, SPEAKING_SRC } from './speaking';

export interface ContentRecord {
  id: string;
  type: 'Word' | 'Daily lesson' | 'Reading handout' | 'Grammar deck' | 'Dialogue' | 'Listening' | 'Speaking task' | 'Mock exam' | 'Listening exam' | 'Topic list' | 'Role play';
  title: string;
  cefr: Cefr | 'A0-A1';
  topic: string;
  grammar: string;
  vocabTheme: string;
  skill: Skill;
  module: number;
  status: ContentStatus;
  src: SourceRef;
}

// Unit N = Week N, so a daily lesson or word from Week N belongs to Unit N.
export const DAY_MODULE = new Map<string, number>(IATC.days.map((d) => [d.id, d.week]));
const UNIT_COUNT = UNIT_CFG.length;

// For items without a week (or from the skills pack, whose topics follow a different order): match by topic.
const KEYWORDS: [RegExp, number][] = [
  [/born|history|famous people|when i was|childhood|months|dates/i, 9],
  [/weekend|sightseeing|trip|holiday in|last week|did you|visited/i, 10],
  [/internet|dangerous|can you|skills|what's the matter|problem/i, 11],
  [/supermarket|restaurant|order|signs|healthy|i'd like|menu/i, 12],
  [/wearing|clothes|right now|at the moment|feelings|ill/i, 13],
  [/transport|going to|plans|future|abroad|airport|travel/i, 14],
  [/hello|classroom|greet|introduc|my english class|what's this/i, 1],
  [/countr|world|where i am from|cities|holiday/i, 2],
  [/job|airport|aviation|hangar|college life|work|personal information|excuse/i, 3],
  [/family|friend|people|alphabet|spell|phone/i, 4],
  [/food|drink|caf|restaurant|nationalit|language|price|shopping for the family|like/i, 5],
  [/daily|routine|morning|time|days|busy|every day|week/i, 6],
  [/cloth|shop|favourite|free time|hobb|sport|football|train|travel|ticket|neighbour/i, 7],
  [/home|house|object|room|furniture|flat|apartment|place|direction|town|riyadh|weather|season|winter/i, 8],
];
export function moduleForTheme(theme: string, week?: number | null): number {
  for (const [re, n] of KEYWORDS) if (re.test(theme)) return n;
  return Math.min(UNIT_COUNT, Math.max(1, week ?? 1));
}

const cefrFor = (module: number): Cefr | 'A0-A1' => (module <= 2 ? 'A0' : module <= 5 ? 'A0-A1' : 'A1');
const grammarForModule = (n: number) => UNIT_CFG.find((s) => s.n === n)?.grammarKeys[0] ?? '';

function rec(r: Omit<ContentRecord, 'cefr' | 'grammar'> & { grammar?: string; cefr?: ContentRecord['cefr'] }): ContentRecord {
  return { ...r, cefr: r.cefr ?? cefrFor(r.module), grammar: r.grammar ?? grammarForModule(r.module) };
}

export function buildContentIndex(): ContentRecord[] {
  const out: ContentRecord[] = [];
  for (const v of IATC.vocab) {
    const module = v.week ? Math.min(UNIT_COUNT, v.week) : moduleForTheme(v.topic);
    out.push(rec({ id: `word:${v.id}`, type: 'Word', title: v.word, topic: v.topic, vocabTheme: v.topic, skill: 'vocabulary', module, status: 'lesson', src: v.src, cefr: v.oxfordA1 ? 'A1' : cefrFor(module) }));
  }
  for (const d of IATC.days) {
    const module = Math.min(UNIT_COUNT, d.week);
    out.push(rec({ id: `day:${d.id}`, type: 'Daily lesson', title: `Week ${d.week} ${d.day}: ${d.theme}`, topic: d.theme, vocabTheme: d.theme, skill: 'reading', module, status: 'lesson', src: d.src }));
  }
  for (const u of IATC.units) for (const d of u.days) {
    out.push(rec({ id: `reading:${d.id}`, type: 'Reading handout', title: `Week ${u.week} ${d.day}: ${d.reading.title}`, topic: d.theme, vocabTheme: d.theme, skill: 'reading', module: u.n, status: 'lesson', src: d.reading.src }));
  }
  for (const g of IATC.grammar) {
    const key = GRAMMAR_KEYS.find((k) => k.deck === g.id);
    out.push(rec({ id: `grammar:${g.id}`, type: 'Grammar deck', title: `A1 Grammar ${g.num}: ${g.title}`, topic: g.sub, vocabTheme: '—', skill: 'grammar', module: key?.module ?? 1, grammar: key?.key ?? '', status: 'lesson', src: g.src }));
  }
  for (const d of IATC.dialogues) {
    const module = d.week ? Math.min(UNIT_COUNT, d.week) : moduleForTheme(`${d.theme} ${d.title}`);
    out.push(rec({ id: `dialogue:${d.id}`, type: 'Dialogue', title: d.title, topic: d.theme, vocabTheme: d.theme, skill: 'speaking', module, status: 'lesson', src: d.src }));
  }
  for (const l of IATC.listening) {
    const module = l.week ? Math.min(UNIT_COUNT, l.week) : moduleForTheme(`${l.theme} ${l.title}`);
    out.push(rec({ id: `listening:${l.id}`, type: 'Listening', title: l.title, topic: l.theme, vocabTheme: l.theme, skill: 'listening', module, status: 'revision', src: l.src }));
  }
  for (const s of IATC.speaking) {
    const module = s.week ? Math.min(UNIT_COUNT, s.week) : moduleForTheme(`${s.theme} ${s.talk.topic}`);
    out.push(rec({ id: `speaking:${s.id}`, type: 'Speaking task', title: s.talk.topic, topic: s.theme, vocabTheme: s.theme, skill: 'speaking', module, status: 'lesson', src: s.src }));
  }
  for (const m of IATC.mocks) {
    out.push(rec({ id: `mock:${m.id}`, type: 'Mock exam', title: m.title, topic: 'ELEM Reading & Writing', vocabTheme: 'mixed', skill: 'reading', module: Math.min(UNIT_COUNT, m.week), status: 'exam', src: m.src, cefr: 'A1' }));
  }
  for (const e of IATC.listeningExams) {
    out.push(rec({ id: `lexam:${e.id}`, type: 'Listening exam', title: `Week ${e.week} ${e.day}: ${e.theme}`, topic: e.theme, vocabTheme: e.theme, skill: 'listening', module: e.week ? Math.min(UNIT_COUNT, e.week) : moduleForTheme(e.theme), status: 'exam', src: e.src, cefr: 'A1' }));
  }
  for (const t of IATC.topics) {
    out.push(rec({ id: `topic:${t.id}`, type: 'Topic list', title: t.title, topic: t.title, vocabTheme: t.title, skill: 'writing', module: moduleForTheme(t.title), status: 'revision', src: { file: 'tools/weekly-pack/content/topic-words/a1_topics.txt', label: `A1 Vocabulary Topics · ${t.title}`, doc: 'FND68/CLass FND 68/A0 - A1 Resources/A1 Vocabulay/A1 Vocabulary Topics/FND_68_A1_Vocabulary_Topics_Words.docx' } }));
  }
  for (const r of ROLE_PLAYS) {
    out.push(rec({ id: `roleplay:${r.id}`, type: 'Role play', title: r.title, topic: r.title, vocabTheme: r.title, skill: 'speaking', module: r.module, status: 'lesson', src: r.dialogue.src ?? { file: 'src/data/speaking.ts', label: 'Original app dialogue (written for English Path)' } }));
  }
  out.push(rec({ id: 'speaking:part1', type: 'Speaking task', title: 'A1 Speaking Part 1 questions', topic: 'Questions about you', vocabTheme: 'personal information', skill: 'speaking', module: 1, status: 'exam', src: SPEAKING_SRC, cefr: 'A1' }));
  return out;
}
