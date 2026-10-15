// A1 writing rubric (Content · Organisation · Language, /15) and the app's first check.
import { describe, expect, it } from 'vitest';
import { CRITERIA, marksTotal, WRITING_MAX } from '../data/writingRubric';
import { a1Errors, analyseWriting, estimateWriting, grammarIssues, unknownWords } from '../data/writingCheck';
import { EXAMS, examTotal } from '../data/exams';
import { IATC } from '../data/content';

const jobs = { prompt: 'Write about 25 words about jobs in your family.', bullets: ['your father’s job', 'your brother’s job', 'your job in the future'] };

describe('A1 writing rubric', () => {
  it('has three criteria with bands 0–5, total 15', () => {
    expect(CRITERIA.map((c) => c.key)).toEqual(['content', 'organisation', 'language']);
    CRITERIA.forEach((c) => expect(Object.keys(c.bands).map(Number).sort()).toEqual([0, 1, 2, 3, 4, 5]));
    expect(WRITING_MAX).toBe(15);
  });

  it('marks exam writing out of 15', () => {
    const mock = EXAMS.find((e) => e.kind === 'mock' && e.sections.some((s) => s.kind === 'write'))!;
    const reading = mock.sections.filter((s) => s.kind !== 'write').reduce((t, s) => t + s.items.length, 0);
    expect(examTotal(mock)).toBe(reading + 15);
  });
});

describe('the app’s first check', () => {
  it('gives a strong, connected answer a high mark and says why', () => {
    const a = analyseWriting('My father is a pilot, so he flies to many cities. My brother is a teacher at a school in Riyadh, and he likes his job. In the future, I want to be an engineer because I like aircraft.', jobs);
    expect(marksTotal(a.marks)).toBeGreaterThanOrEqual(13);
    expect(a.bullets.every((b) => b.covered)).toBe(true);
    expect(a.reasons.content.join(' ')).toMatch(/all 3 points/);
  });

  it('gives a short, unconnected answer with errors a low mark, with corrections', () => {
    const a = analyseWriting('father teacher. he go school. i like', jobs);
    expect(marksTotal(a.marks)).toBeLessThanOrEqual(6);
    expect(a.marks.language).toBeLessThanOrEqual(2);
    expect(a.issues.find((i) => i.text.toLowerCase() === 'he go')?.fix).toBe('he goes');
  });

  it('names the point that is missing', () => {
    const a = analyseWriting('My father is a doctor at King Fahd Hospital. He works every day, and he is very busy. My brother is a police officer in Riyadh.', jobs);
    expect(a.bullets.map((b) => b.covered)).toEqual([true, true, false]);
    expect(a.marks.content).toBe(3);
    expect(a.tips[0].en).toMatch(/your job in the future/);
  });

  it('notices writing about something else', () => {
    const a = analyseWriting('I like football and basketball. I play with my friends at the park every weekend. We have a good team and we win many matches.', jobs);
    expect(a.offTopic).toBe(true);
    expect(a.marks.content).toBeLessThanOrEqual(1);
  });

  it('notices the past in a task about plans', () => {
    const a = analyseWriting('Last summer I went to Abha with my family. We stayed in a hotel and we visited the mountains. It was cool and green.',
      { prompt: 'Write about 25 words about your plans for the holiday.', bullets: ['where you are going to go', 'who you are going to go with', 'what you are going to do'] });
    expect(a.timeMismatch).toBe('past-for-future');
  });

  it('gives nothing for an empty answer', () => {
    expect(marksTotal(estimateWriting('', jobs.bullets))).toBe(0);
  });

  it('finds common A1 errors, with a fix', () => {
    const fix = (t: string) => grammarIssues(t)[0]?.fix;
    expect(fix('I want to go because is sunny.')).toBe('because it is');
    expect(fix('Are you like football?')).toBe('Do you like');
    expect(fix('My first name are Turki.')).toMatch(/is$/);
    expect(fix('There are a big park near my house.')).toBe('There is a');
    expect(fix('We go the bus to college.')).toBe('go by bus');
    expect(fix('I have 19 years.')).toBe('am 19 years old');
    expect(fix('He is a engineer.')).toBe('an engineer');
    expect(a1Errors('He likes football. I am happy. The buildings in the centre are beautiful.')).toEqual([]);
  });

  it('checks spelling against the A1 word lists, but not names', () => {
    expect(unknownWords('I like footbal and my familly.')).toEqual(['footbal', 'familly']);
    expect(unknownWords('My brother lives in Riyadh and he studies English. Yesterday we went to Jeddah.')).toEqual([]);
  });

  it('scores every model answer in the weekly materials well', () => {
    const tasks = IATC.units.flatMap((u) => u.days.map((d) => ({ ...d.writing, bullets: d.writing.bullets ?? [] }))).filter((t) => t.model && t.prompt);
    expect(tasks.length).toBeGreaterThan(60);
    const totals = tasks.map((t) => marksTotal(analyseWriting(t.model, t).marks));
    expect(Math.min(...totals)).toBeGreaterThanOrEqual(10);
    expect(totals.reduce((a, b) => a + b, 0) / totals.length).toBeGreaterThanOrEqual(12.5);
  });
});
