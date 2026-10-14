// The course: Units 1–8 (= Weeks 1–8 of the A0 – A1 Weekly Materials), plus a review after every 2 units.
// The code still says "module" internally (types, routes, stored progress); learners and teachers see "Unit".
import type { Activity, Lesson, McqItem, Module } from '../../types';
import { UNITS } from './units';
import { autoMatch, tag } from './builder';
import { rngFrom, shuffle } from '../../lib/rng';

export const MODULES: Module[] = UNITS;

/** Accepts 3, "3", "u3" and old "m3" links. */
export const getModule = (n: number | string) => MODULES.find((m) => m.n === Number(String(n).replace(/^[mu]/, '')));

const lessonIndex = new Map<string, Lesson>(MODULES.flatMap((m) => m.lessons.map((l) => [l.id, l] as [string, Lesson])));
export const getLesson = (id: string) => lessonIndex.get(id) ?? REVIEWS.find((r) => r.id === id);

export const allLessons = () => MODULES.flatMap((m) => m.lessons);

// ------------------------------------------------------------- review lessons (after every 2 units)
export const UNITS_PER_REVIEW = 2;
/** The units a review covers (review index 0, 1, 2 …). */
export const reviewUnits = (r: number) => MODULES.slice(r * UNITS_PER_REVIEW, r * UNITS_PER_REVIEW + UNITS_PER_REVIEW);

function quizOf(m: Module): McqItem[] {
  const q = m.lessons.find((l) => l.type === 'quiz')?.activities[0];
  return q && q.kind === 'mcq' ? q.items : [];
}

function buildReview(r: number): Lesson {
  const mods = reviewUnits(r - 1);
  const first = mods[0].n;
  const last = mods[mods.length - 1].n;
  const items = shuffle(mods.flatMap((m) => quizOf(m).slice(0, 6)), rngFrom(r * 99)).slice(0, 12);
  const words = mods.flatMap((m) => m.vocab.slice(0, 4));
  const activities: Activity[] = [
    autoMatch(`rev${r}-match`, first, `Review ${r}`, shuffle(words, rngFrom(r * 7)), 8),
    { kind: 'mcq', id: `rev${r}-quiz`, title: `Review ${r} quiz`, prompt: 'Choose the right answer.', promptAr: 'اختر الإجابة الصحيحة.', items, tags: tag(first, 'grammar', `Review ${r}`, undefined, 'revision') },
  ];
  return { id: `review-${r}`, module: first, title: `Review ${r}: Units ${first}–${last}`, titleAr: `مراجعة ${r}`, type: 'quiz', minutes: 15, activities };
}

export const REVIEWS: Lesson[] = Array.from({ length: Math.ceil(MODULES.length / UNITS_PER_REVIEW) }, (_, i) => buildReview(i + 1));
/** The review that follows unit n (after Units 2, 4, 6 and 8). */
export const reviewAfterModule = (n: number) => (n % UNITS_PER_REVIEW === 0 ? REVIEWS[n / UNITS_PER_REVIEW - 1] : undefined);
