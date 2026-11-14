// Phase 5: data care — exports, linking a learner to his roster card, the activity log wording.
import { describe, expect, it } from 'vitest';
import { emptyData } from '../lib/demo';
import { newClass } from '../lib/classes';
import { newStudent } from '../lib/learner';
import { classReportRows, linkToRosterCard, toCsv, writingRows } from '../lib/dataCare';
import { describeActivity } from '../pages/Staff';
import type { AppData } from '../types';

function setup() {
  const d: AppData = emptyData();
  const cls = { ...newClass('FND 99'), code: 'FND99-ABC' };
  d.classes.push(cls);
  const card = newStudent('Nawaf', 'A1', { classId: cls.id, lastName: 'Example' });
  card.iatcId = '000123';
  card.rosterNo = 3;
  card.group = 'B';
  card.avatar = { kind: 'photo', dataUrl: 'data:image/jpeg;base64,xx', seed: 1 };
  const extra = newStudent('Nawwaf', 'A0', { classId: cls.id, joinedBy: 'online' });
  extra.onlineId = 'online-1';
  extra.lessons['u1-d1'] = { score: 8, total: 10, completedAt: '2026-11-10', attempts: 1 };
  extra.activeDays = ['2026-11-10'];
  d.students.push(card, extra);
  d.writing.push({ id: 'w1', studentId: extra.id, taskTitle: 'My Day', prompt: 'p', bullets: [], text: '=SUM(A1) I get up at 6, "early".', words: 8, selfCheck: 0, createdAt: '2026-11-10T08:00:00Z', source: 'u1-d1', marks: { content: 4, organisation: 3, language: 3 }, teacherScore: 10, markedBy: 'teacher@example.com' });
  d.assignments.push({ id: 'a1', classId: cls.id, kind: 'lesson', ref: 'u1-d1', title: 't', to: [extra.id], createdAt: 'now', done: [extra.id] });
  return { d, cls, card, extra };
}

describe('exports', () => {
  it('writes CSV that Excel opens safely (BOM, quotes, no formulas)', () => {
    const csv = toCsv([['a', 'b,c', 'say "hi"', '=1+1', 5, null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('a,"b,c","say ""hi""","\'=1+1",5,');
  });

  it('makes a class report and a writing list', () => {
    const { d, cls } = setup();
    const rep = classReportRows(d, cls.id);
    expect(rep[0]).toContain('Average writing /15');
    expect(rep).toHaveLength(3);
    expect(rep[1].slice(0, 4)).toEqual([3, 'Nawaf', 'Example', '000123']); // roster order first
    const w = writingRows(d, cls.id);
    expect(w[1]).toEqual(expect.arrayContaining([4, 3, 3, 10, 'teacher@example.com']));
  });
});

describe('linking a learner who joined online to his roster card', () => {
  it('moves progress, writing and tasks onto the card and keeps the roster details', () => {
    const { d, card, extra } = setup();
    expect(linkToRosterCard(d, extra.id, card.id)).toBe(true);
    const c = d.students.find((s) => s.id === card.id)!;
    expect(d.students).toHaveLength(1);
    expect(c).toMatchObject({ onlineId: 'online-1', iatcId: '000123', rosterNo: 3, group: 'B', firstName: 'Nawaf' });
    expect(c.avatar.kind).toBe('photo');
    expect(c.lessons['u1-d1']).toBeTruthy();
    expect(d.writing[0].studentId).toBe(card.id);
    expect(d.assignments[0]).toMatchObject({ to: [card.id], done: [card.id] });
  });

  it('refuses a card that is already linked online', () => {
    const { d, card, extra } = setup();
    card.onlineId = 'online-2';
    expect(linkToRosterCard(d, extra.id, card.id)).toBe(false);
    expect(d.students).toHaveLength(2);
  });
});

describe('activity log', () => {
  const emails = { u1: 'teacher@example.com' };
  const row = (action: string, r: Record<string, unknown>, before?: Record<string, unknown>) => ({ id: 1, at: '2026-11-14T10:00:00Z', actor: 'u1', action, target: null, details: { row: r, before } });
  it('says what happened in plain words', () => {
    expect(describeActivity(row('staff insert', { user_id: 'u1', role: 'teacher' }), emails)).toBe('teacher@example.com added as teacher');
    expect(describeActivity(row('classes update', { name: 'FND 99', code: 'X', archived: true }, { name: 'FND 99', code: 'X', archived: false }), emails)).toBe('Class FND 99 (X): archived: false → true');
    expect(describeActivity(row('assignments insert', { title: 'Unit 1', class_code: 'X' }), emails)).toBe('Task “Unit 1” set for X');
  });
});
