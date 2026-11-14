// Restore codes: a learner whose phone forgot him gets his online record back.
import { describe, expect, it } from 'vitest';
import { emptyData } from '../lib/demo';
import { joinWithCode, mergeOnlineClass, newClass, restoreOnPhone } from '../lib/classes';
import type { AppData } from '../types';

const row = { id: 'w-1', student_id: 'old-login', task_title: 'My Day', prompt: 'p', bullets: ['a'], body: 'I get up at 6.', words: 5, estimate: null,
  marks: { content: 4, organisation: 3, language: 4 }, teacher_score: 11, teacher_note: 'Good', source: 'u6-d2', created_at: '2026-11-01T08:00:00Z' };

describe('restoring a learner on a phone that forgot him', () => {
  it('puts his online progress, code and writing back, without sending the writing again', () => {
    const d: AppData = emptyData();
    const cls = { ...newClass('FND 99'), code: 'FND99-ABC' };
    d.classes.push(cls);
    const j = joinWithCode(d, 'FND99-ABC', 'Nawaf Example'); // the fresh, empty learner on this phone
    expect(Object.keys(j.student!.lessons)).toHaveLength(0);
    restoreOnPhone(d, j.student!.id, 'new-login', { lessons: { 'u1-d1': { score: 9, total: 10, completedAt: '2026-10-20', attempts: 1 } }, streak: { count: 4, last: '2026-11-01' } }, 'K7P4', [row]);
    const s = d.students.find((x) => x.id === j.student!.id)!;
    expect(s).toMatchObject({ onlineId: 'new-login', restoreCode: 'K7P4', streak: { count: 4 } });
    expect(s.lessons['u1-d1'].score).toBe(9);
    expect(d.writing).toHaveLength(1);
    expect(d.writing[0]).toMatchObject({ studentId: s.id, teacherScore: 11, sentOnline: true });
  });

  it('brings each learner\'s restore code to the teacher with Load the class now', () => {
    const d: AppData = emptyData();
    const cls = { ...newClass('FND 99'), code: 'FND99-ABC' };
    d.classes.push(cls);
    mergeOnlineClass(d, cls.id, [{ id: 'login-1', first_name: 'Majed', last_name: 'Example', progress: {}, updated_at: '2026-11-01', restore_code: 'Q2RT' }], []);
    expect(d.students[0].restoreCode).toBe('Q2RT');
  });
});
