// A1 Vocabulary Quizzes (Sets 1-14): every quiz has the right size and every answer is a real option.
import { describe, expect, it } from 'vitest';
import data from '../data/generated/vocab-quizzes.json';

type Item = { text?: string; q?: string; options?: string[]; answer: string | number };
interface Section { id: string; type: 'match' | 'mcq' | 'gap'; pairs?: string[][]; items?: Item[] }
const SETS = (data as unknown as { sets: { n: number; quizzes: { id: string; kind: string; total: number; target: number; sections: Section[] }[] }[] }).sets;

describe('vocabulary quizzes', () => {
  it('has sets 1 to 14, each with five lesson quizzes (35) and a review (40)', () => {
    expect(SETS.map((s) => s.n)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    for (const s of SETS) {
      expect(s.quizzes).toHaveLength(6);
      for (const q of s.quizzes) expect(q.total, q.id).toBe(q.kind === 'lesson' ? 35 : 40);
    }
  });

  it('gives every question a valid answer', () => {
    for (const s of SETS) for (const q of s.quizzes) for (const sec of q.sections) {
      if (sec.type === 'match') { expect(sec.pairs!.length, q.id).toBe(5); continue; }
      for (const it of sec.items!) {
        if (sec.type === 'mcq') {
          expect(new Set(it.options).size, `${q.id} ${sec.id}`).toBe(it.options!.length);
          expect(Number.isInteger(it.answer) && (it.answer as number) < it.options!.length, `${q.id} ${sec.id}`).toBe(true);
        } else {
          expect(String(it.answer).length, `${q.id} ${sec.id}`).toBeGreaterThan(0);
          expect(it.text!.split('___').length, `${q.id} ${sec.id} ${it.text}`).toBe(2);
          if (it.options) expect(it.options, `${q.id} ${sec.id}`).toContain(it.answer);
        }
      }
    }
  });

  it('keeps unsuitable topics and the teacher’s name out', () => {
    const all = JSON.stringify(data);
    expect(all).not.toMatch(/\b(music|song|songs|birthday|guitar|piano|dance|dancing|alcohol|wine|beer|magic|ghost)\b/i);
    expect(all).not.toMatch(/Said|Hassan|سعيد حسن/);
  });
});
