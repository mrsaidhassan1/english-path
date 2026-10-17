// Phase 2: the teacher preview's answer key covers every activity in the course.
import { describe, expect, it } from 'vitest';
import { MODULES, REVIEWS } from '../data/modules';
import { EXAMS } from '../data/exams';
import { answerLines } from '../components/activities/AnswerKey';

const all = [...MODULES.flatMap((m) => m.lessons), ...REVIEWS].flatMap((l) => l.activities);
const CHECKABLE = new Set(['mcq', 'reading', 'gap', 'order', 'error', 'picture', 'match', 'sort', 'dialogue', 'write']);

describe('teacher preview answer key', () => {
  it('gives answers for every checkable activity in all units and reviews', () => {
    expect(all.length).toBeGreaterThan(300);
    for (const a of all) {
      const lines = answerLines(a);
      if (CHECKABLE.has(a.kind)) {
        expect(lines.length, `${a.id} (${a.kind})`).toBeGreaterThan(0);
        lines.forEach((l) => expect(l.a.trim(), `${a.id}: ${l.q}`).not.toBe(''));
      }
    }
  });

  it('shows the right option, not its number', () => {
    const mcq = all.find((a) => a.kind === 'mcq')!;
    if (mcq.kind !== 'mcq') throw new Error('no mcq');
    expect(answerLines(mcq)[0].a).toBe(mcq.items[0].options[mcq.items[0].answer]);
    const gap = all.find((a) => a.kind === 'gap')!;
    if (gap.kind !== 'gap') throw new Error('no gap');
    expect(answerLines(gap)[0].a).toBe(gap.items[0].answer);
  });

  it('has a key for every exam question with choices or typed answers', () => {
    for (const e of EXAMS) for (const s of e.sections) {
      if (s.kind === 'choice') s.items.forEach((q) => expect(q.options?.[q.answer as number], `${e.id} ${s.id}`).toBeTruthy());
      if (s.kind === 'typed') s.items.forEach((q) => expect(String(q.answer).trim(), `${e.id} ${s.id}`).not.toBe(''));
      if (s.kind === 'write') expect(s.write?.model, e.id).toBeTruthy();
    }
  });
});
