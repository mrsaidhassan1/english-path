import { describe, expect, it } from 'vitest';
import readers from '../data/generated/graded-readers.json';

describe('A1 graded readers', () => {
  it('has one complete reader for every week 1-15', () => {
    expect(readers.map((r) => r.week)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    for (const r of readers) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.story.length).toBeGreaterThan(10);
      expect(r.check).toHaveLength(3);
      expect(r.talk).toHaveLength(2);
      expect(r.vocab).toHaveLength(12);
      for (const v of r.vocab) expect(v.ar).toMatch(/[؀-ۿ]/);
    }
  });

  it('is the student version: no teacher notes and never the teacher\'s own name', () => {
    const all = JSON.stringify(readers);
    expect(all).not.toMatch(/Teacher Notes|Grammar used|pre-reading|follow-up task/i);
    expect(all).not.toMatch(/\bSaid\b|Hassan/);
  });
});
