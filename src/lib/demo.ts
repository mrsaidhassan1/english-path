// Demo class with made-up learners (not real FND 68 students) so every screen has something to show.
// The teacher can clear it and add the real class from Teacher Dashboard → Students.
import type { AppData, Cefr, ClassInfo, Skill, Student } from '../types';
import { MODULES } from '../data/modules';
import { getExam, examTotal } from '../data/exams';
import { newStudent } from './learner';
import { addDays, today } from './date';
import { rngFrom } from './rng';
import { review } from './srs';

const DEMO: [string, Cefr, string[], string][] = [
  ['Yazeed', 'A1', ['football', 'technology'], 'Work in aircraft maintenance.'],
  ['Hamad', 'A0', ['family', 'food'], 'Speak English at the airport.'],
  ['Saad', 'A1', ['travel', 'football'], 'Pass the A1 exam.'],
  ['Nawaf', 'A0', ['technology', 'daily life'], 'Write 25 words with no mistakes.'],
  ['Ziyad', 'A0', ['football', 'shopping'], 'Understand my teacher.'],
  ['Majed', 'A1', ['work', 'travel'], 'Become a pilot.'],
  ['Waleed', 'A0', ['food', 'family'], 'Speak with confidence.'],
  ['Anas', 'A1', ['technology', 'work'], 'Read aircraft manuals.'],
  ['Hussam', 'A0', ['football', 'daily life'], 'Learn 500 words.'],
  ['Sultan', 'A0', ['travel', 'shopping'], 'Pass the A1 exam.'],
  ['Talal', 'A1', ['work', 'technology'], 'Join the Royal Saudi Air Force.'],
  ['Badr', 'A0', ['family', 'football'], 'Speak English with tourists.'],
];

const WEAK_KEYS = ['be', 'possessive-adj', 'numbers', 'a-an', 'wh-questions', 'spelling'];

function seedStudent(i: number): Student {
  const [name, level, interests, goal] = DEMO[i];
  const r = rngFrom(i + 11);
  const s = newStudent(name, level, { interests, goal, demo: true, classId: DEMO_CLASS.id, joinedBy: 'demo' });
  s.id = `demo-${i + 1}`;
  s.avatar = { kind: 'monster', seed: 1000 + i * 7919 };
  const ability = level === 'A1' ? 0.68 + r() * 0.25 : 0.42 + r() * 0.3;
  // lessons: A1 learners are further along
  const lessonsDone = Math.floor((level === 'A1' ? 12 : 4) + r() * 9);
  const all = MODULES.flatMap((m) => m.lessons).slice(0, lessonsDone);
  all.forEach((l, k) => {
    const total = 10;
    const score = Math.max(3, Math.min(10, Math.round(total * (ability + (r() - 0.5) * 0.25))));
    s.lessons[l.id] = { score, total, completedAt: `${addDays(today(), -(lessonsDone - k))}T16:00:00.000Z`, attempts: 1 };
  });
  // skills
  const skills: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing'];
  const bias: Record<Skill, number> = { vocabulary: 0.05, grammar: -0.02, reading: -0.04, listening: -0.06, speaking: 0.08, writing: -0.14 };
  for (const k of skills) {
    const total = 20 + Math.floor(r() * 40);
    s.skillStats[k] = { total, correct: Math.round(total * Math.max(0.15, Math.min(0.97, ability + bias[k] + (r() - 0.5) * 0.15))) };
  }
  // grammar mistakes (some learners struggle with am / is / are)
  for (const key of WEAK_KEYS) {
    const wrong = Math.floor(r() * (key === 'be' && i % 3 === 1 ? 7 : 3));
    s.grammarStats[key] = { wrong, correct: Math.floor(4 + r() * 10) };
  }
  // vocabulary
  const words = MODULES.slice(0, 3).flatMap((m) => m.vocab);
  const known = Math.floor(words.length * (0.25 + ability * 0.5));
  words.slice(0, known).forEach((w, k) => {
    let v = review(undefined, true, addDays(today(), -10));
    for (let t = 0; t < (k % 5); t++) v = review(v, r() < ability + 0.1, addDays(today(), -8 + t * 2));
    s.vocab[w] = v;
    if (v.wrong > 0 && s.practiseAgain.length < 9) s.practiseAgain.push(w);
  });
  // speaking, streak, participation
  s.speaking = { recordings: Math.floor(r() * 8), tasks: Math.floor(r() * 9), confidence: [2 + Math.floor(r() * 3), 3 + Math.floor(r() * 3)] };
  const streak = Math.floor(r() * 7);
  s.streak = { count: streak, last: streak ? today() : addDays(today(), -3) };
  s.activeDays = Array.from({ length: Math.max(1, streak) }, (_, k) => addDays(today(), -k)).reverse();
  s.participation = { count: Math.floor(r() * 4), correct: 0, incorrect: 0 };
  s.participation.correct = Math.round(s.participation.count * ability);
  s.participation.incorrect = s.participation.count - s.participation.correct;
  // one diagnostic result for most learners
  const diag = getExam('diagnostic-1');
  if (diag && i % 4 !== 3) {
    const bySkill: Record<string, { score: number; total: number }> = {};
    let score = 0;
    for (const sec of diag.sections) {
      const t = sec.items.length;
      const sc = Math.max(0, Math.min(t, Math.round(t * (ability + bias[sec.skill] + (r() - 0.5) * 0.2))));
      const prev = bySkill[sec.skill] ?? { score: 0, total: 0 };
      bySkill[sec.skill] = { score: prev.score + sc, total: prev.total + t };
      score += sc;
    }
    s.exams.push({ examId: diag.id, title: diag.title, date: addDays(today(), -6), bySkill, score, total: examTotal(diag), minutes: 14 });
  }
  if (Object.keys(s.lessons).length) s.badges['first-lesson'] = addDays(today(), -lessonsDone);
  if (s.speaking.tasks >= 5) s.badges['brave-speaker'] = addDays(today(), -2);
  return s;
}

export const DEMO_CLASS: ClassInfo = { id: 'cl-demo', name: 'Demo Class', level: 'A0 → A1', code: 'DEMO-123', allowJoin: true, createdAt: '2026-10-13T00:00:00.000Z', demo: true };

export function demoData(): AppData {
  return {
    version: 2,
    classes: [{ ...DEMO_CLASS }],
    activeClassId: DEMO_CLASS.id,
    students: DEMO.map((_, i) => seedStudent(i)),
    assignments: [
      { id: 'as-demo-1', classId: DEMO_CLASS.id, kind: 'review', ref: 'review-1', title: 'Review 1: Units 1–2', to: 'class', due: addDays(today(), 4), createdAt: new Date().toISOString(), done: [] },
      { id: 'as-demo-2', classId: DEMO_CLASS.id, kind: 'grammar', ref: 'g3', title: 'Grammar booster: am / is / are', to: ['demo-2', 'demo-5', 'demo-8'], due: addDays(today(), 2), createdAt: new Date().toISOString(), done: [] },
    ],
    writing: [
      {
        id: 'wr-demo-1', studentId: 'demo-2', taskTitle: 'About Me', prompt: 'Write about 25 words. Introduce yourself to your new classmates.',
        bullets: ['your name', 'where you are from', 'your college and class'], text: 'Hello! my name Hamad. I am from Hail. I am student in IATC. My class FND 68. nice to meet you',
        words: 22, selfCheck: 3, createdAt: `${addDays(today(), -1)}T15:00:00.000Z`, source: 'u1-d1-write',
      },
    ],
    settings: { arabic: true, teacherPin: '', unlockAll: false, speechRate: 0.9, examReadAloud: true },
    session: { role: null, studentId: null },
  };
}

/** No learners and no classes: the teacher creates or imports a class. */
export function emptyData(): AppData {
  return { ...demoData(), classes: [], activeClassId: '', students: [], assignments: [], writing: [] };
}

/**
 * The teacher's real class, built into the app with NO student data: learners join on their own
 * device with the code and their name. The private roster (Web App/class-files/FND68.class.json)
 * merges into this same class when the teacher imports it on their own computer (matched by name).
 */
export const FND68_CLASS: ClassInfo = { id: 'cl-fnd68', name: 'FND 68', level: 'A0 → A1', term: '2026-27 S1', code: 'FND68-SH', allowJoin: true, createdAt: '2026-10-14T00:00:00.000Z' };

/** What a new device starts with: the FND 68 class, empty, ready for learners to join. */
export function startData(): AppData {
  return { ...emptyData(), classes: [{ ...FND68_CLASS }], activeClassId: FND68_CLASS.id };
}

/** Make sure the built-in FND 68 class exists (older saved data, e.g. the demo). Never removes anything. */
export function ensureBuiltInClass(d: AppData): AppData {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  if (d.classes.some((c) => c.id === FND68_CLASS.id || norm(c.name) === norm(FND68_CLASS.name))) return d;
  const onDemo = !d.activeClassId || d.classes.find((c) => c.id === d.activeClassId)?.demo;
  return { ...d, classes: [{ ...FND68_CLASS }, ...d.classes], activeClassId: onDemo ? FND68_CLASS.id : d.activeClassId };
}
