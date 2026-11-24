import { describe, expect, it } from 'vitest';
import readers from '../data/generated/graded-readers.json';
import manifest from '../data/generated/audio-manifest.json';
import { NARRATORS, READERS, readerLine } from '../data/narrators';
import { audioKey } from '../lib/audioKey';
import { readerActivities } from '../data/readerActivities';

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

  it('has four interactive activities after every story', () => {
    for (const r of READERS) {
      const acts = readerActivities(r);
      expect(acts.map((a) => a.kind)).toEqual(['mcq', 'match', 'gap', 'speak']);
      for (const a of acts) {
        if (a.kind === 'mcq') {
          expect(a.items).toHaveLength(3);
          for (const it of a.items) expect(new Set(it.options).size).toBe(it.options.length);
        }
        if (a.kind === 'match') expect(a.pairs.length).toBe(6);
        if (a.kind === 'gap') {
          expect(a.items.length).toBeGreaterThanOrEqual(3);
          for (const it of a.items) {
            expect(it.text).toContain('___');
            expect(it.options).toContain(it.answer);
            expect(new Set((it.options ?? []).map((o) => o.toLowerCase())).size).toBe((it.options ?? []).length);
          }
        }
        if (a.kind === 'speak') expect(a.task.steps).toEqual(r.talk);
      }
    }
  });

  it('has a natural recording of every story line for every narrator', () => {
    expect(NARRATORS.length).toBeGreaterThanOrEqual(3);
    expect(NARRATORS.length).toBeLessThanOrEqual(5);
    const missing = NARRATORS.flatMap((n) => READERS.flatMap((r) => r.story
      .filter((l) => !(manifest as Record<string, string>)[audioKey(readerLine(l), n.speaker).id])
      .map((l) => `${n.name} W${r.week}: ${l.text}`)));
    expect(missing).toEqual([]);
  });
});
