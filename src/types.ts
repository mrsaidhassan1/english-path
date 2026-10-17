// Core types for English Path.

export type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing';
export const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing'];

export type Cefr = 'A0' | 'A1';
export type ContentStatus = 'lesson' | 'revision' | 'exam';

/** Where an imported item came from, so the teacher can find and edit the original. */
export interface SourceRef {
  file: string; // project-relative source file (JSON/TXT that builds the classroom document)
  at?: string; // location inside the source file
  doc?: string | null; // the classroom document (docx/pptx/pdf) that shows the same content
  label: string; // human-friendly label
}

export interface Tags {
  cefr: Cefr | 'A0-A1';
  topic: string;
  grammar?: string; // grammar key, see data/grammarKeys.ts
  vocabTheme?: string;
  skill: Skill;
  module: number;
  status: ContentStatus;
}

export interface VocabItem {
  id: string;
  word: string;
  ar: string;
  pos: string;
  meaning: string;
  example: string;
  topic: string;
  week: number | null;
  day: string | null;
  oxfordA1: boolean;
  src: SourceRef;
}

export type DialogueLine = [speaker: string, text: string];

export interface Dialogue {
  id: string;
  title: string;
  setting?: string;
  lines: DialogueLine[];
  src?: SourceRef;
  original?: boolean; // written for the app (not imported)
}

// ------------------------------------------------------------------ activities
interface ActivityBase {
  id: string;
  title: string;
  prompt: string;
  promptAr?: string;
  tags: Tags;
  src?: SourceRef;
}

export interface McqItem { q: string; options: string[]; answer: number; explain?: string; say?: string; grammar?: string; word?: string }
export interface GapItem { text: string; answer: string; options?: string[]; grammar?: string; hint?: string }
export interface OrderItem { answer: string; grammar?: string }
export interface ErrorItem { sentence: string; wrong: string; right: string; options: string[]; grammar?: string }
export interface PictureItem { word: string; options: string[]; answer: string } // vocab ids
export interface DialogueStep { options: string[]; answer: number }

export type Activity =
  | (ActivityBase & { kind: 'mcq'; items: McqItem[] })
  | (ActivityBase & { kind: 'match'; pairs: [string, string][]; leftLabel?: string; rightLabel?: string; rtlRight?: boolean })
  | (ActivityBase & { kind: 'sort'; groups: string[]; items: { text: string; group: number }[] })
  | (ActivityBase & { kind: 'picture'; items: PictureItem[] })
  | (ActivityBase & { kind: 'gap'; items: GapItem[] })
  | (ActivityBase & { kind: 'order'; items: OrderItem[] })
  | (ActivityBase & { kind: 'dialogue'; dialogue: Dialogue; steps: Record<number, DialogueStep> })
  | (ActivityBase & { kind: 'error'; items: ErrorItem[] })
  | (ActivityBase & { kind: 'listen'; items: { text: string; ar?: string }[] })
  | (ActivityBase & { kind: 'speak'; task: SpeakingTask })
  | (ActivityBase & { kind: 'write'; task: WritingTask })
  | (ActivityBase & { kind: 'flashcards'; words: string[] })
  | (ActivityBase & { kind: 'grammar'; points: GrammarPoint[] })
  | (ActivityBase & { kind: 'watch'; dialogue: Dialogue })
  | (ActivityBase & { kind: 'reading'; text: string; textTitle: string; questions: McqItem[] });

export type ActivityKind = Activity['kind'];

export interface SpeakingTask {
  title: string;
  steps: string[]; // what to say, one line each
  usefulLanguage: [en: string, ar: string][];
  model?: string;
}

export interface WritingTask {
  title: string;
  prompt: string;
  bullets: string[];
  frame?: string;
  model: string;
  minWords: number;
}

export interface GrammarPoint {
  title: string;
  titleAr?: string;
  explain: string[]; // short lines; {x} marks the coloured grammar word
  table?: { head: string[]; rows: string[][] };
  examples: string[];
  watch?: string; // common mistake
  watchAr?: string;
  colour: 'navy' | 'coral' | 'sky' | 'mint' | 'sun';
  src?: SourceRef;
}

export type LessonType = 'day' | 'vocab' | 'grammar' | 'dialogue' | 'practice' | 'speaking' | 'writing' | 'quiz';

export interface Lesson {
  id: string; // e.g. u1-d1 (unit 1, Sunday)
  module: number; // unit number
  title: string;
  titleAr?: string;
  day?: string; // class day (Sunday–Thursday) for day lessons
  type: LessonType;
  minutes: number;
  activities: Activity[];
}

export interface Module {
  n: number;
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  icon: string; // lucide icon name, see components/ModuleIcon
  colour: string; // hex accent
  goals: string[];
  goalsAr: string[];
  grammarKeys: string[];
  vocab: string[];
  dialogue: Dialogue;
  lessons: Lesson[];
  full: boolean; // fully built (true for every weekly unit)
  sources: SourceRef[];
  week?: number; // Unit N = Class Week N of the weekly materials
  collegeWeek?: number;
  dates?: string;
  headwayUnit?: number;
  open?: boolean; // opened for all students by the teacher (set in units.ts)
}

// ------------------------------------------------------------------ learner data
export type AvatarChoice =
  | { kind: 'monster'; seed: number }
  | { kind: 'photo'; dataUrl: string; seed: number };

export interface LessonResult { score: number; total: number; completedAt: string; attempts: number }
export interface VocabState { box: number; due: string; seen: number; right: number; wrong: number; last: string }
export interface ExamResult {
  examId: string;
  reported?: string; // e.g. official scaled score and level from an imported college exam
  title: string;
  date: string;
  bySkill: Partial<Record<Skill, { score: number; total: number }>>;
  score: number;
  total: number;
  minutes: number;
  writingId?: string; // the exam's writing, so the teacher's rubric mark can replace the provisional one
}
export interface LogEntry { at: string; type: 'lesson' | 'vocab' | 'speak' | 'exam' | 'practice' | 'class'; ref: string; score?: number; total?: number }

export interface Student {
  id: string;
  classId: string;
  firstName: string;
  lastName?: string;
  showSurname?: boolean; // set when two learners in a class share a first name
  iatcId?: string; // college Student ID (teacher-only; the key for imports)
  rosterNo?: number;
  group?: string;
  groupRole?: string; // Leader / Assistant / Middle / Support
  partnerNos?: number[]; // roster numbers of pair partners in the same class
  pairNote?: string;
  joinedBy?: 'teacher' | 'import' | 'code' | 'demo' | 'online';
  onlineId?: string; // the learner's id in the online class store (see lib/online.ts)
  onlineAt?: string; // when the teacher last loaded this learner's progress from online
  level: Cefr;
  avatar: AvatarChoice;
  goal: string;
  interests: string[];
  createdAt: string;
  demo?: boolean;
  lessons: Record<string, LessonResult>;
  skillStats: Partial<Record<Skill, { correct: number; total: number }>>;
  grammarStats: Record<string, { correct: number; wrong: number }>;
  vocab: Record<string, VocabState>;
  practiseAgain: string[];
  speaking: { recordings: number; tasks: number; confidence: number[] };
  exams: ExamResult[];
  streak: { count: number; last: string };
  activeDays: string[];
  badges: Record<string, string>;
  log: LogEntry[];
  participation: { count: number; correct: number; incorrect: number; last?: string };
}

export interface Assignment {
  id: string;
  classId: string;
  kind: 'lesson' | 'module' | 'vocab' | 'review' | 'exam' | 'grammar';
  ref: string;
  title: string;
  to: 'class' | string[];
  due?: string;
  createdAt: string;
  done: string[]; // student ids
}

export interface WritingSubmission {
  id: string;
  studentId: string;
  taskTitle: string;
  prompt: string;
  bullets: string[];
  text: string;
  words: number;
  selfCheck: number; // 0–5 from the student's checklist
  estimate?: { content: number; organisation: number; language: number }; // automatic first suggestion (A1 writing rubric)
  marks?: { content: number; organisation: number; language: number }; // teacher's marks, 0–5 each (A1 writing rubric, /15)
  teacherScore?: number; // /15 when `marks` is set; older submissions were marked /5
  teacherNote?: string;
  createdAt: string;
  source: string; // lesson or exam id
  sentOnline?: boolean; // the learner's phone has sent it to the online class store
  online?: boolean; // the teacher loaded it from the online class store (marks are saved back online)
}

export interface Settings {
  arabic: boolean;
  teacherPin: string; // optional, local only (not real security)
  unlockAll: boolean;
  speechRate: number;
  examReadAloud: boolean; // Listen buttons on exam reading texts (the real ELEM exam has none)
}

export interface ClassInfo {
  id: string;
  name: string; // e.g. "FND 68"
  level: string; // e.g. "A0 → A1"
  term?: string; // e.g. "2026-27 S1"
  code: string; // join code learners type to join this class
  allowJoin: boolean; // learners may add themselves with the code
  createdAt: string;
  demo?: boolean;
}

export interface AppData {
  version: 2;
  classes: ClassInfo[];
  activeClassId: string; // the class the teacher is working with
  students: Student[];
  assignments: Assignment[];
  writing: WritingSubmission[];
  settings: Settings;
  session: { role: 'student' | 'teacher' | null; studentId: string | null; staff?: StaffAccess };
}

/** A teacher's access in the online class store (Phase 1 roles), re-checked every time the app opens. */
export type StaffRole = 'admin' | 'teacher' | 'observer';
export type ClassStaffRole = 'admin' | 'owner' | 'teacher' | 'observer';
export interface StaffAccess {
  email: string;
  role: StaffRole;
  classes: { code: string; name: string; role: ClassStaffRole }[];
  checkedAt: string;
}
