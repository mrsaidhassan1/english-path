// A1 writing rubric (Content · Organisation · Language, /15) and the app's first estimate.
import { describe, expect, it } from 'vitest';
import { a1Errors, CRITERIA, estimateWriting, marksTotal, unknownWords, WRITING_MAX } from '../data/writingRubric';
import { EXAMS, examTotal } from '../data/exams';

const bullets = ['your father’s job', 'your brother’s job', 'your job in the future'];

describe('A1 writing rubric', () => {
  it('has three criteria with bands 0–5, total 15', () => {
    expect(CRITERIA.map((c) => c.key)).toEqual(['content', 'organisation', 'language']);
    CRITERIA.forEach((c) => expect(Object.keys(c.bands).map(Number).sort()).toEqual([0, 1, 2, 3, 4, 5]));
    expect(WRITING_MAX).toBe(15);
  });

  it('gives a strong, connected answer a high mark', () => {
    const m = estimateWriting('My father is a pilot, so he flies to many cities. My brother is a teacher at a school in Riyadh, and he likes his job. In the future, I want to be an engineer because I like aircraft.', bullets);
    expect(marksTotal(m)).toBeGreaterThanOrEqual(13);
  });

  it('gives a short, unconnected answer with errors a low mark', () => {
    const m = estimateWriting('father teacher. he go school. i like', bullets);
    expect(marksTotal(m)).toBeLessThanOrEqual(6);
    expect(m.language).toBeLessThanOrEqual(2);
  });

  it('gives nothing for an empty answer', () => {
    expect(marksTotal(estimateWriting('', bullets))).toBe(0);
  });

  it('finds common A1 errors and unknown spellings', () => {
    expect(a1Errors('I want to go because is sunny.')).toHaveLength(1);
    expect(a1Errors('Are you like football?').length).toBeGreaterThan(0);
    expect(a1Errors('He likes football. I am happy.')).toEqual([]);
    expect(unknownWords('I like footbal and my familly.')).toEqual(['footbal', 'familly']);
    expect(unknownWords('My brother lives in Riyadh and he studies English.')).toEqual([]);
  });

  it('marks exam writing out of 15', () => {
    const mock = EXAMS.find((e) => e.kind === 'mock' && e.sections.some((s) => s.kind === 'write'))!;
    const reading = mock.sections.filter((s) => s.kind !== 'write').reduce((t, s) => t + s.items.length, 0);
    expect(examTotal(mock)).toBe(reading + 15);
  });
});
