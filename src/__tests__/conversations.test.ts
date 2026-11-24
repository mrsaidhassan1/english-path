import { describe, expect, it } from 'vitest';
import manifest from '../data/generated/audio-manifest.json';
import { CONVERSATIONS, convSpeaker } from '../data/conversations';
import { NARRATORS } from '../data/narrators';
import { audioKey } from '../lib/audioKey';

describe('Conversations (Units 1-14)', () => {
  it('has five conversations, Lessons 1-5, in each of the 14 units', () => {
    expect(CONVERSATIONS).toHaveLength(70);
    for (let u = 1; u <= 14; u++) {
      expect(CONVERSATIONS.filter((c) => c.unit === u).map((c) => c.lesson)).toEqual([1, 2, 3, 4, 5]);
    }
    for (const c of CONVERSATIONS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.lines.length).toBeGreaterThanOrEqual(10);
      for (const l of c.lines) expect(c.people).toContain(l.speaker);
    }
    expect(CONVERSATIONS[0].title).toBe('Welcome to IATC!');
  });

  it('never labels anything "Week" (titles and settings)', () => {
    for (const c of CONVERSATIONS) expect(`${c.title} ${c.id}`).not.toMatch(/\bweeks?\b/i);
  });

  it('gives every person their own voice, from British and American speakers, none used by the narrators', () => {
    const narrators = new Set(NARRATORS.map((n) => n.voice));
    const lessonVoices = new Set(['am_puck', 'am_fenrir', 'am_michael', 'af_bella']);
    for (const c of CONVERSATIONS) {
      const v = Object.values(c.voices);
      expect(new Set(v).size).toBe(v.length);
      for (const x of v) {
        expect(narrators.has(x) || lessonVoices.has(x), x).toBe(false);
        expect(x.startsWith(c.accent === 'British' ? 'b' : 'a')).toBe(true);
      }
    }
    expect(new Set(CONVERSATIONS.map((c) => c.accent))).toEqual(new Set(['British', 'American']));
  });

  it('has a natural recording of every line', () => {
    const missing = CONVERSATIONS.flatMap((c) => c.lines
      .filter((l) => !(manifest as Record<string, string>)[audioKey(l.text, convSpeaker(c, l.speaker)).id])
      .map((l) => `U${c.unit} L${c.lesson} ${l.speaker}: ${l.text}`));
    expect(missing).toEqual([]);
  });
});
