// Pure update functions for a learner record. Each mutates the given (cloned) student.
import type { Cefr, ExamResult, Skill, Student } from '../types';
import { MODULES } from '../data/modules';
import { review } from './srs';
import { addDays, today } from './date';
import { newSeed } from './rng';
import { moduleScore } from './progress';

export interface BadgeDef { id: string; title: string; titleAr: string; icon: string; desc: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-lesson', title: 'First Lesson', titleAr: 'الدرس الأول', icon: '🎉', desc: 'Finish your first lesson.' },
  { id: 'vocab-star', title: 'Vocabulary Star', titleAr: 'نجم المفردات', icon: '⭐', desc: 'Learn 25 words to Review or Mastered.' },
  { id: 'brave-speaker', title: 'Brave Speaker', titleAr: 'المتحدث الشجاع', icon: '🎤', desc: 'Finish 5 speaking tasks.' },
  { id: 'five-day-streak', title: 'Five-Day Streak', titleAr: 'خمسة أيام متتالية', icon: '🔥', desc: 'Learn 5 days in a row.' },
  { id: 'module-master', title: 'Unit Master', titleAr: 'متقن الوحدة', icon: '🏆', desc: 'Score 80% or more in a unit check.' },
];

export function newStudent(firstName: string, level: Cefr = 'A0', extra: Partial<Student> = {}): Student {
  return {
    id: `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    classId: '',
    firstName: firstName.trim(),
    level,
    avatar: { kind: 'monster', seed: newSeed() },
    goal: 'Speak and write simple English with confidence.',
    interests: [],
    createdAt: new Date().toISOString(),
    lessons: {},
    skillStats: {},
    grammarStats: {},
    vocab: {},
    practiseAgain: [],
    speaking: { recordings: 0, tasks: 0, confidence: [] },
    exams: [],
    streak: { count: 0, last: '' },
    activeDays: [],
    badges: {},
    log: [],
    participation: { count: 0, correct: 0, incorrect: 0 },
    ...extra,
  };
}

export function touchStreak(s: Student, on = today()) {
  if (s.streak.last === on) return;
  s.streak = { count: s.streak.last === addDays(on, -1) ? s.streak.count + 1 : 1, last: on };
  if (!s.activeDays.includes(on)) s.activeDays = [...s.activeDays, on].slice(-120);
}

export function recordAnswer(s: Student, a: { skill: Skill; correct: boolean; grammar?: string; word?: string }) {
  const st = s.skillStats[a.skill] ?? { correct: 0, total: 0 };
  s.skillStats[a.skill] = { correct: st.correct + (a.correct ? 1 : 0), total: st.total + 1 };
  if (a.grammar) {
    const g = s.grammarStats[a.grammar] ?? { correct: 0, wrong: 0 };
    s.grammarStats[a.grammar] = { correct: g.correct + (a.correct ? 1 : 0), wrong: g.wrong + (a.correct ? 0 : 1) };
  }
  if (a.word) recordWord(s, a.word, a.correct);
  touchStreak(s);
}

/** Spaced-repetition update. Missed words go on the personal “Practise again” list. */
export function recordWord(s: Student, wordId: string, correct: boolean) {
  s.vocab[wordId] = review(s.vocab[wordId], correct);
  if (!correct && !s.practiseAgain.includes(wordId)) s.practiseAgain = [wordId, ...s.practiseAgain].slice(0, 60);
  if (correct && s.vocab[wordId].box >= 3) s.practiseAgain = s.practiseAgain.filter((w) => w !== wordId);
  touchStreak(s);
}

export function markWordsSeen(s: Student, ids: string[]) {
  const on = today();
  for (const id of ids) if (!s.vocab[id]) s.vocab[id] = { box: 1, due: addDays(on, 1), seen: 1, right: 0, wrong: 0, last: on };
}

export function recordLesson(s: Student, lessonId: string, score: number, total: number) {
  const prev = s.lessons[lessonId];
  const best = prev && prev.score / Math.max(1, prev.total) > score / Math.max(1, total) ? prev : { score, total };
  s.lessons[lessonId] = { ...best, completedAt: new Date().toISOString(), attempts: (prev?.attempts ?? 0) + 1 };
  s.log = [{ at: new Date().toISOString(), type: 'lesson' as const, ref: lessonId, score, total }, ...s.log].slice(0, 200);
  touchStreak(s);
}

export function recordSpeaking(s: Student, opts: { recorded: boolean; confidence?: number; ref: string }) {
  s.speaking = {
    recordings: s.speaking.recordings + (opts.recorded ? 1 : 0),
    tasks: s.speaking.tasks + 1,
    confidence: opts.confidence ? [...s.speaking.confidence, opts.confidence].slice(-20) : s.speaking.confidence,
  };
  const st = s.skillStats.speaking ?? { correct: 0, total: 0 };
  s.skillStats.speaking = { correct: st.correct + (opts.recorded || (opts.confidence ?? 0) >= 3 ? 1 : 0), total: st.total + 1 };
  s.log = [{ at: new Date().toISOString(), type: 'speak' as const, ref: opts.ref }, ...s.log].slice(0, 200);
  touchStreak(s);
}

/** `imported` = a college result added by the teacher: it updates skills but is not learner activity (no streak). */
export function recordExam(s: Student, r: ExamResult, imported = false) {
  s.exams = [...s.exams, r].slice(-30);
  for (const [skill, v] of Object.entries(r.bySkill) as [Skill, { score: number; total: number }][]) {
    const st = s.skillStats[skill] ?? { correct: 0, total: 0 };
    s.skillStats[skill] = { correct: st.correct + v.score, total: st.total + v.total };
  }
  if (imported) return;
  s.log = [{ at: new Date().toISOString(), type: 'exam' as const, ref: r.examId, score: r.score, total: r.total }, ...s.log].slice(0, 200);
  touchStreak(s);
}

/** Award any badges that are now earned. Returns the new badge ids. */
export function checkBadges(s: Student): string[] {
  const earned: string[] = [];
  const give = (id: string, ok: boolean) => {
    if (ok && !s.badges[id]) {
      s.badges[id] = today();
      earned.push(id);
    }
  };
  give('first-lesson', Object.keys(s.lessons).length >= 1);
  give('vocab-star', Object.values(s.vocab).filter((v) => v.box >= 3).length >= 25);
  give('brave-speaker', s.speaking.tasks >= 5);
  give('five-day-streak', s.streak.count >= 5);
  give('module-master', MODULES.some((m) => (moduleScore(s, m) ?? 0) >= 80));
  return earned;
}
