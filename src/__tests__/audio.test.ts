// Natural-voice recordings: every speaking line has one, and every file exists.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import manifest from '../data/generated/audio-manifest.json';
import { MODULES } from '../data/modules';
import { ROLE_PLAYS, SPEAKING_PART1 } from '../data/speaking';
import { IATC } from '../data/content';
import { EXAMS } from '../data/exams';
import { clipFor } from '../lib/speech';

const clips = manifest as Record<string, string>;

describe('recorded voices', () => {
  it.runIf(Object.keys(clips).length > 0)('cover all dialogues, role plays, listen-and-repeat and speaking questions', () => {
    const missing: string[] = [];
    const need = (text: string, speaker = '') => clipFor(text, speaker) || missing.push(`${speaker}: ${text}`);
    for (const m of MODULES) {
      m.dialogue.lines.forEach(([who, t]) => need(t, who));
      for (const l of m.lessons) for (const a of l.activities) if (a.kind === 'listen') a.items.forEach((x) => need(x.text));
    }
    ROLE_PLAYS.forEach((r) => r.dialogue.lines.forEach(([who, t]) => need(t, who)));
    SPEAKING_PART1.forEach((q) => need(q.q));
    // every unit's day readings (Week 1–8 handouts), conversations and listening scripts
    for (const m of MODULES) for (const l of m.lessons) for (const a of l.activities) {
      if (a.kind === 'reading') need(a.text);
      if (a.kind === 'watch') a.dialogue.lines.forEach(([who, t]) => need(t, who));
    }
    expect(missing).toEqual([]);
  });

  it.runIf(Object.keys(clips).length > 0)('has every audio file on disk', () => {
    const lost = [...new Set(Object.values(clips).map((c) => c.split('#')[0]))].filter((f) => !existsSync(`public/audio/${f}`));
    expect(lost).toEqual([]);
  });

  it.runIf(Object.values(clips).some((c) => c.includes('#')))('covers every vocabulary word and example sentence', () => {
    const missing = IATC.vocab.flatMap((w) => [w.word, w.example].filter(Boolean)).filter((t) => !clipFor(t));
    expect(missing).toEqual([]);
    // bundle times are valid: start < end
    for (const c of Object.values(clips)) if (c.includes('#')) {
      const [a, b] = c.split('#')[1].split('-').map(Number);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThan(a);
    }
  });

  it.runIf(Object.values(clips).some((c) => c.includes('#')))('covers every listening exam line, each speaker in their own voice', () => {
    const missing: string[] = [];
    for (const e of IATC.listeningExams) {
      e.p1.items.forEach((it) => it.lines.forEach(([who, t]) => clips[`${who.toLowerCase()}|${t.replace(/\s+/g, ' ').trim().toLowerCase()}`] || missing.push(`${e.id} ${who}: ${t}`)));
      e.p3.lines.forEach(([who, t]) => clipFor(t, who) || missing.push(`${e.id} ${who}: ${t}`));
      const talk = e.p2.sentences.map((s) => s.text.replace(/[{}]/g, '')).join(' ');
      if (!clipFor(talk, e.p2.speaker)) missing.push(`${e.id} part 2 talk`);
    }
    // reading texts in the mocks and the diagnostic, joined as the exam screen joins them
    for (const ex of EXAMS) for (const s of ex.sections) if (s.text?.length && !clipFor(s.text.join('\n'))) missing.push(`${ex.id} reading text`);
    expect(missing).toEqual([]);
  });

  it('uses each speaker’s own voice where recorded', () => {
    const first = ROLE_PLAYS[1].dialogue.lines[0]; // Mr. Adel in “First Day in Class”
    if (Object.keys(clips).length) expect(clipFor(first[1], first[0])).toBeTruthy();
  });
});
