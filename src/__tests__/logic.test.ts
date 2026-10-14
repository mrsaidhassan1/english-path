import { describe, expect, it } from 'vitest';
import { review, statusOf, dueWords } from '../lib/srs';
import { fairPick } from '../lib/picker';
import { newStudent, recordAnswer, recordWord, checkBadges, recordLesson } from '../lib/learner';
import { recommend, suggestQuestion } from '../lib/recommend';
import { monsterTraits } from '../components/Monster';
import { mulberry32 } from '../lib/rng';
import { addDays, today } from '../lib/date';

describe('spaced repetition', () => {
  it('moves a word up one box when known and back to box 1 when missed', () => {
    let v = review(undefined, true, '2026-10-01');
    expect(v.box).toBe(1);
    v = review(v, true, '2026-10-02');
    expect(v.box).toBe(2);
    expect(v.due).toBe('2026-10-04');
    v = review(v, false, '2026-10-04');
    expect(v.box).toBe(1);
    expect(v.wrong).toBe(1);
  });
  it('reports statuses', () => {
    expect(statusOf(undefined)).toBe('new');
    expect(statusOf({ box: 2, due: '', seen: 2, right: 2, wrong: 0, last: '' })).toBe('learning');
    expect(statusOf({ box: 4, due: '', seen: 4, right: 4, wrong: 0, last: '' })).toBe('review');
    expect(statusOf({ box: 5, due: '', seen: 5, right: 5, wrong: 0, last: '' })).toBe('mastered');
  });
  it('lists due words', () => {
    const s = newStudent('Test');
    s.vocab.hello = { box: 1, due: addDays(today(), -1), seen: 1, right: 1, wrong: 0, last: '' };
    s.vocab.name = { box: 2, due: addDays(today(), 3), seen: 1, right: 1, wrong: 0, last: '' };
    expect(dueWords(s)).toEqual(['hello']);
  });
});

describe('fair student picker', () => {
  const students = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  it('only picks learners who answered least', () => {
    const counts = { a: 1, b: 1, c: 0, d: 1 };
    for (let i = 0; i < 20; i++) expect(fairPick(students, counts, null)?.id).toBe('c');
  });
  it('never repeats the last learner when there is a choice', () => {
    const rnd = mulberry32(7);
    let last: string | null = null;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 40; i++) {
      const p: { id: string } = fairPick(students, counts, last, rnd)!;
      expect(p.id).not.toBe(last);
      counts[p.id] = (counts[p.id] ?? 0) + 1;
      last = p.id;
    }
    // everyone gets an equal turn
    expect(new Set(Object.values(counts))).toEqual(new Set([10]));
  });
  it('handles a class of one and an empty class', () => {
    expect(fairPick([{ id: 'x' }], {}, 'x')?.id).toBe('x');
    expect(fairPick([], {}, null)).toBeNull();
  });
});

describe('personalisation', () => {
  it('recommends an am / is / are booster after repeated mistakes', () => {
    const s = newStudent('Abdullah');
    for (let i = 0; i < 4; i++) recordAnswer(s, { skill: 'grammar', correct: false, grammar: 'be' });
    const recs = recommend(s);
    expect(recs[0].kind).toBe('grammar');
    expect(recs[0].to).toContain('/practice/grammar/g3');
    expect(suggestQuestion(s)).toContain('am / is / are');
  });
  it('adds missed words to Practise again and removes them once learned', () => {
    const s = newStudent('Fahad');
    recordWord(s, 'hello', false);
    expect(s.practiseAgain).toContain('hello');
    recordWord(s, 'hello', true);
    recordWord(s, 'hello', true);
    recordWord(s, 'hello', true);
    expect(s.practiseAgain).not.toContain('hello');
  });
  it('first recommendation for a new learner is Unit 1, Sunday', () => {
    const recs = recommend(newStudent('New'));
    expect(recs.some((r) => r.to === '/lessons/u1/u1-d1')).toBe(true);
  });
  it('awards the First Lesson badge', () => {
    const s = newStudent('B');
    recordLesson(s, 'm1-l1', 8, 10);
    expect(checkBadges(s)).toContain('first-lesson');
    expect(checkBadges(s)).toEqual([]);
  });
});

describe('monster avatars', () => {
  it('are deterministic per seed and vary between seeds', () => {
    expect(monsterTraits(1234)).toEqual(monsterTraits(1234));
    const variants = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(monsterTraits(i * 977))));
    expect(variants.size).toBe(50);
  });
  it('never combine a cap with horns or hair', () => {
    for (let i = 0; i < 500; i++) {
      const t = monsterTraits(i);
      if (t.accessory === 2) expect(t.horns + t.hair).toBe(0);
    }
  });
});
