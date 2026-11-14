// The Foundation Grammar Challenge: every question has a valid answer, a note and a rule, and nothing personal or unsuitable is in it.
import { describe, expect, it } from 'vitest';
import { CHALLENGE_SETS, PART_RULES, QUESTION_NOTES, completedSentence, toMcq } from '../data/grammarChallenge';
import { GRAMMAR_KEYS } from '../data/grammarKeys';

describe('grammar challenge', () => {
  it('has 100 questions in 20 parts of 5, each with three different options and one valid answer', () => {
    expect(CHALLENGE_SETS.length).toBeGreaterThan(0);
    for (const set of CHALLENGE_SETS) {
      expect(set.parts).toHaveLength(20);
      const numbers = set.parts.flatMap((p) => p.questions.map((q) => q.n));
      expect(numbers).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
      for (const p of set.parts) {
        expect(p.questions, `part ${p.n}`).toHaveLength(5);
        expect(p.focus && p.focusAr && p.instruction && p.instructionAr, `part ${p.n} titles`).toBeTruthy();
        for (const q of p.questions) {
          expect(q.options, `Q${q.n}`).toHaveLength(3);
          expect(new Set(q.options).size, `Q${q.n}`).toBe(3);
          expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3, `Q${q.n}`).toBe(true);
        }
      }
    }
  });

  it('explains every question and every part (English; the parts also in Arabic)', () => {
    for (const set of CHALLENGE_SETS) {
      for (const p of set.parts) {
        const rule = PART_RULES[set.id]?.[p.n];
        expect(rule?.en && rule?.ar, `part ${p.n} rule`).toBeTruthy();
        for (const q of p.questions) expect(QUESTION_NOTES[set.id]?.[q.n]?.length, `Q${q.n} note`).toBeGreaterThan(5);
      }
    }
  });

  it('fills every blank with the right answer and keeps the explanation next to it', () => {
    const set = CHALLENGE_SETS[0];
    const q1 = set.parts[0].questions[0];
    expect(completedSentence(q1)).toBe('Khalid speaks English very well in class.');
    const two = set.parts.flatMap((p) => p.questions).find((q) => q.n === 35)!;
    expect(completedSentence(two)).toBe('I drink coffee every morning, but today I am drinking tea.');
    for (const p of set.parts) for (const q of p.questions) {
      const done = completedSentence(q);
      if (done !== null) expect(done, `Q${q.n}`).not.toContain('___');
      const m = toMcq(set, p, q);
      expect(m.options[m.answer]).toBe(q.options[q.answer]);
      expect(m.explain, `Q${q.n}`).toContain(QUESTION_NOTES[set.id][q.n]);
    }
  });

  it('only tracks grammar points that exist in My Progress', () => {
    const known = new Set(GRAMMAR_KEYS.map((g) => g.key));
    for (const set of CHALLENGE_SETS) for (const p of set.parts) for (const q of p.questions) {
      const g = toMcq(set, p, q).grammar;
      if (g) expect(known.has(g), `Q${q.n} ${g}`).toBe(true);
    }
  });

  it('never shows the teacher’s name', () => {
    const all = JSON.stringify([CHALLENGE_SETS, PART_RULES, QUESTION_NOTES]);
    expect(all).not.toMatch(/Said|Hassan|سعيد/);
  });
});
