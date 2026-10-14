// Content integrity: every answer key must be valid and nothing culturally unsuitable or personal may appear.
import { describe, expect, it } from 'vitest';
import { MODULES, REVIEWS } from '../data/modules';
import { EXAMS } from '../data/exams';
import { ROLE_PLAYS } from '../data/speaking';
import { IATC, getWord } from '../data/content';
import { buildContentIndex } from '../data/contentIndex';
import type { Activity } from '../types';

const allActivities: Activity[] = [...MODULES.flatMap((m) => m.lessons.flatMap((l) => l.activities)), ...REVIEWS.flatMap((r) => r.activities)];

describe('units', () => {
  it('has 8 units = Weeks 1–8, each with a lesson for every class day (Sun–Thu), a conversation lesson and a check', () => {
    expect(MODULES).toHaveLength(8);
    MODULES.forEach((m, i) => {
      expect(m.n).toBe(i + 1);
      expect(m.week).toBe(i + 1);
      expect(m.lessons.filter((l) => l.type === 'day').map((l) => l.day)).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
      expect(m.lessons.at(-1)?.type).toBe('quiz');
      expect(m.goals.length).toBe(m.goalsAr.length);
      expect(m.vocab.length).toBeGreaterThanOrEqual(100);
    });
    expect(REVIEWS).toHaveLength(4);
  });

  it('every day lesson has its reading (from the Week N handout) and a writing task', () => {
    for (const m of MODULES) for (const l of m.lessons.filter((x) => x.type === 'day')) {
      const kinds = l.activities.map((a) => a.kind);
      expect(kinds, l.id).toContain('reading');
      expect(kinds, l.id).toContain('write');
      const read = l.activities.find((a) => a.kind === 'reading');
      expect(read?.src?.file, l.id).toMatch(/readings\/week\d\.json$/);
    }
  });

  it('the units use all the interactive activity types', () => {
    const kinds = new Set(MODULES.flatMap((m) => m.lessons.flatMap((l) => l.activities.map((a) => a.kind))));
    for (const k of ['flashcards', 'match', 'picture', 'grammar', 'gap', 'order', 'reading', 'mcq', 'sort', 'watch', 'dialogue', 'listen', 'speak', 'write']) expect(kinds, k).toContain(k);
  });

  it('every unit check has listening, vocabulary and grammar questions', () => {
    for (const m of MODULES) {
      const q = m.lessons.at(-1)!.activities[0];
      expect(q.kind).toBe('mcq');
      if (q.kind !== 'mcq') continue;
      expect(q.items.length, m.id).toBeGreaterThanOrEqual(8);
      expect(q.items.some((x) => x.say), m.id).toBe(true);
      expect(q.items.some((x) => x.grammar), m.id).toBe(true);
    }
  });

  it('every answer key is valid', () => {
    for (const a of allActivities) {
      const where = `${a.id} (${a.kind})`;
      switch (a.kind) {
        case 'mcq':
          expect(a.items.length, where).toBeGreaterThan(0);
          a.items.forEach((q) => { expect(q.answer, `${where}: ${q.q}`).toBeGreaterThanOrEqual(0); expect(q.answer, `${where}: ${q.q}`).toBeLessThan(q.options.length); });
          break;
        case 'gap':
          expect(a.items.length, where).toBeGreaterThan(0);
          a.items.forEach((g) => { expect(g.text, where).toContain('___'); if (g.options) expect(g.options, `${where}: ${g.text}`).toContain(g.answer); });
          break;
        case 'error':
          a.items.forEach((e) => { expect(e.sentence.split(' '), `${where}: ${e.sentence}`).toContain(e.wrong); expect(e.options, where).toContain(e.right); });
          break;
        case 'dialogue':
          Object.entries(a.steps).forEach(([i, st]) => { expect(Number(i)).toBeLessThan(a.dialogue.lines.length); expect(st.answer, `${where} line ${i}`).toBeGreaterThanOrEqual(0); });
          break;
        case 'picture':
          a.items.forEach((p) => { expect(p.options).toContain(p.answer); expect(getWord(p.answer), where).toBeTruthy(); });
          break;
        case 'match':
          expect(a.pairs.length, where).toBeGreaterThanOrEqual(3);
          break;
        case 'sort':
          a.items.forEach((x) => expect(x.group).toBeLessThan(a.groups.length));
          break;
        case 'order':
          a.items.forEach((o) => expect(o.answer.split(' ').length, where).toBeGreaterThanOrEqual(2));
          break;
        case 'flashcards':
          a.words.forEach((w) => expect(getWord(w), `${where}: ${w}`).toBeTruthy());
          break;
        default:
          break;
      }
    }
  });
});

describe('exams', () => {
  it('builds the diagnostic, mocks, listening and speaking exams with valid keys', () => {
    expect(EXAMS.filter((e) => e.kind === 'mock').length).toBeGreaterThanOrEqual(5);
    expect(EXAMS.filter((e) => e.kind === 'listening').length).toBeGreaterThanOrEqual(5);
    for (const e of EXAMS) for (const s of e.sections) for (const q of s.items) {
      if (s.kind === 'choice') {
        expect(q.answer as number, `${e.id}/${s.id}: ${q.q}`).toBeGreaterThanOrEqual(0);
        expect(q.answer as number).toBeLessThan(q.options!.length);
      }
    }
  });
  it('reading mocks follow the ELEM format: five parts of five', () => {
    for (const e of EXAMS.filter((x) => x.kind === 'mock')) {
      const reading = e.sections.filter((s) => s.kind !== 'write');
      expect(reading).toHaveLength(5);
      reading.forEach((s) => expect(s.items, `${e.id}/${s.id}`).toHaveLength(5));
    }
  });
});

describe('safety and privacy', () => {
  const everything = JSON.stringify({ MODULES, EXAMS, ROLE_PLAYS, vocab: IATC.vocab, days: IATC.days, units: IATC.units, dialogues: IATC.dialogues });
  it('never shows the teacher’s personal name', () => {
    expect(everything).not.toMatch(/Said Hassan|Mr\.? Said\b|سعيد حسن/);
  });
  it('contains no IATC “avoid” topics', () => {
    expect(everything).not.toMatch(/\b(music|guitar|birthday|christmas|girlfriend|boyfriend|alcohol|dancing|magic)\b/i);
  });
  it('tags every imported resource with a source reference', () => {
    const idx = buildContentIndex();
    expect(idx.length).toBeGreaterThan(1000);
    idx.forEach((r) => {
      expect(r.src?.label, r.id).toBeTruthy();
      expect(r.module).toBeGreaterThanOrEqual(1);
      expect(r.module).toBeLessThanOrEqual(8);
      expect(['A0', 'A1', 'A0-A1']).toContain(r.cefr);
    });
  });
});
