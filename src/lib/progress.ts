// Progress maths shared by learner and teacher views.
import type { Lesson, Module, Skill, Student } from '../types';
import { MODULES, REVIEWS, reviewUnits } from '../data/modules';
import { SKILLS } from '../types';

export const lessonDone = (s: Student, lessonId: string) => !!s.lessons[lessonId];

export function moduleProgress(s: Student, m: Module): { done: number; total: number; pct: number } {
  const done = m.lessons.filter((l) => lessonDone(s, l.id)).length;
  return { done, total: m.lessons.length, pct: Math.round((done / m.lessons.length) * 100) };
}

export function moduleScore(s: Student, m: Module): number | null {
  const quiz = m.lessons.find((l) => l.type === 'quiz');
  const r = quiz && s.lessons[quiz.id];
  return r ? Math.round((r.score / Math.max(1, r.total)) * 100) : null;
}

export const moduleComplete = (s: Student, m: Module) => m.lessons.every((l) => lessonDone(s, l.id));

export function overallProgress(s: Student): number {
  const total = MODULES.reduce((t, m) => t + m.lessons.length, 0);
  const done = MODULES.reduce((t, m) => t + moduleProgress(s, m).done, 0);
  return Math.round((done / total) * 100);
}

/** First module that is not complete. */
export function currentModule(s: Student): Module {
  return MODULES.find((m) => !moduleComplete(s, m)) ?? MODULES[MODULES.length - 1];
}

export function moduleUnlocked(s: Student, m: Module, opts: { unlockAll?: boolean; assigned?: Set<string> } = {}): boolean {
  if (opts.unlockAll || m.n === 1 || m.open) return true;
  if (opts.assigned?.has(m.id)) return true;
  const prev = MODULES[m.n - 2];
  const quiz = prev.lessons.find((l) => l.type === 'quiz')!;
  return lessonDone(s, quiz.id) || moduleProgress(s, prev).done >= prev.lessons.length - 1;
}

export function lessonUnlocked(s: Student, m: Module, l: Lesson, opts: { unlockAll?: boolean; assigned?: Set<string> } = {}): boolean {
  if (!moduleUnlocked(s, m, opts)) return false;
  if (opts.unlockAll || m.open || opts.assigned?.has(l.id)) return true;
  const i = m.lessons.indexOf(l);
  return i === 0 || lessonDone(s, m.lessons[i - 1].id) || lessonDone(s, l.id);
}

export function reviewUnlocked(s: Student, reviewIndex: number, unlockAll = false): boolean {
  if (unlockAll) return true;
  return reviewUnits(reviewIndex).every((m) => moduleComplete(s, m));
}

export function skillPct(s: Student, skill: Skill): number | null {
  const st = s.skillStats[skill];
  return st && st.total > 0 ? Math.round((st.correct / st.total) * 100) : null;
}

export function skillProfile(s: Student): { skill: Skill; pct: number | null }[] {
  return SKILLS.map((skill) => ({ skill, pct: skillPct(s, skill) }));
}

export function strengthsAndNeeds(s: Student): { strengths: Skill[]; needs: Skill[] } {
  const prof = skillProfile(s).filter((p) => p.pct !== null) as { skill: Skill; pct: number }[];
  const sorted = [...prof].sort((a, b) => b.pct - a.pct);
  return {
    strengths: sorted.filter((p) => p.pct >= 70).slice(0, 2).map((p) => p.skill),
    needs: sorted.filter((p) => p.pct < 70).reverse().slice(0, 2).map((p) => p.skill),
  };
}

export function grammarWeaknesses(s: Student, min = 2): { key: string; wrong: number; correct: number; rate: number }[] {
  return Object.entries(s.grammarStats)
    .map(([key, v]) => ({ key, ...v, rate: v.wrong / Math.max(1, v.wrong + v.correct) }))
    .filter((g) => g.wrong >= min && g.rate >= 0.34)
    .sort((a, b) => b.wrong - a.wrong);
}

export const speakingConfidence = (s: Student) => {
  const c = s.speaking.confidence.slice(-5);
  return c.length ? Math.round((c.reduce((a, b) => a + b, 0) / c.length) * 10) / 10 : null;
};

export const lastExam = (s: Student) => s.exams[s.exams.length - 1];

export const reviewsList = () => REVIEWS;

export const participationStatus = (s: Student, sessionIds: Set<string>) =>
  sessionIds.has(s.id) ? 'answered' : s.participation.count === 0 ? 'not yet' : 'waiting';
