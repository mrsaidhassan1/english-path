// Spaced repetition (Leitner boxes 0–5).
// box 0 = new, 1–2 = learning, 3–4 = review, 5 = mastered.
import type { Student, VocabState } from '../types';
import { addDays, today } from './date';

export const INTERVALS = [0, 1, 2, 4, 7, 14];
export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export function statusOf(v?: VocabState): WordStatus {
  if (!v || v.seen === 0) return 'new';
  if (v.box >= 5) return 'mastered';
  if (v.box >= 3) return 'review';
  return 'learning';
}

export function review(v: VocabState | undefined, correct: boolean, on = today()): VocabState {
  const base: VocabState = v ?? { box: 0, due: on, seen: 0, right: 0, wrong: 0, last: on };
  const box = correct ? Math.min(5, base.box + 1) : 1;
  return {
    box,
    due: addDays(on, INTERVALS[box]),
    seen: base.seen + 1,
    right: base.right + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    last: on,
  };
}

/** Words due for review today, most overdue first. */
export function dueWords(s: Student, on = today()): string[] {
  return Object.entries(s.vocab)
    .filter(([, v]) => v.seen > 0 && v.box < 5 && v.due <= on)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}

export function countByStatus(s: Student, ids?: string[]): Record<WordStatus, number> {
  const out: Record<WordStatus, number> = { new: 0, learning: 0, review: 0, mastered: 0 };
  const list = ids ?? Object.keys(s.vocab);
  for (const id of list) out[statusOf(s.vocab[id])]++;
  return out;
}
