// Phase 4: assignments in the online class store.
import { describe, expect, it } from 'vitest';
import { emptyData } from '../lib/demo';
import { newClass } from '../lib/classes';
import { newStudent } from '../lib/learner';
import { assignmentDone, assignmentRow, mergeOnlineAssignments, refreshAssignmentDone, type AssignmentRow } from '../lib/assignments';
import { MODULES } from '../data/modules';
import type { AppData, Assignment } from '../types';

function setup() {
  const d: AppData = emptyData();
  const cls = { ...newClass('FND 99'), code: 'FND99-ABC' };
  d.classes.push(cls);
  d.activeClassId = cls.id;
  const a = newStudent('Nawaf', 'A1', { classId: cls.id });
  a.onlineId = 'online-a';
  const b = newStudent('Majed', 'A1', { classId: cls.id });
  b.onlineId = 'online-b';
  const c = newStudent('Yousef', 'A1', { classId: cls.id }); // only on the teacher's laptop
  d.students.push(a, b, c);
  return { d, cls, a, b, c };
}
const lesson = MODULES[0].lessons[0];
const row = (over: Partial<AssignmentRow> = {}): AssignmentRow => ({
  id: 'as-1', class_code: 'FND99-ABC', kind: 'lesson', ref: lesson.id, title: `Lesson: ${lesson.title}`, to_all: true, to_students: [], due: '2026-11-20', created_at: '2026-11-14T10:00:00Z', ...over,
});

describe('assignments online', () => {
  it('sends chosen learners by their online ids and counts those not online yet', () => {
    const { d, a, c } = setup();
    const as: Assignment = { id: 'x', classId: d.activeClassId, kind: 'lesson', ref: lesson.id, title: 't', to: [a.id, c.id], createdAt: 'now', done: [] };
    const { row: r, missing } = assignmentRow(as, 'FND99-ABC', d.students);
    expect(r.to_all).toBe(false);
    expect(r.to_students).toEqual(['online-a']);
    expect(missing).toBe(1);
  });

  it('brings tasks to the teacher device with learners mapped back from their online ids', () => {
    const { d, cls, b } = setup();
    mergeOnlineAssignments(d, cls.id, [row(), row({ id: 'as-2', to_all: false, to_students: ['online-b'] })]);
    expect(d.assignments.map((x) => x.id).sort()).toEqual(['as-1', 'as-2']);
    expect(d.assignments.find((x) => x.id === 'as-2')!.to).toEqual([b.id]);
    expect(d.assignments.every((x) => x.online)).toBe(true);
  });

  it('gives a learner only his own tasks, keeps his done marks, and drops tasks removed online', () => {
    const { d, cls, a } = setup();
    mergeOnlineAssignments(d, cls.id, [row(), row({ id: 'as-2', to_all: false, to_students: ['online-b'] })], a);
    expect(d.assignments.map((x) => x.id)).toEqual(['as-1']);
    d.assignments[0].done.push(a.id);
    mergeOnlineAssignments(d, cls.id, [row({ title: 'renamed' })], a);
    expect(d.assignments[0]).toMatchObject({ title: 'renamed', done: [a.id] });
    mergeOnlineAssignments(d, cls.id, [], a);
    expect(d.assignments).toEqual([]);
  });

  it('keeps tasks that were never online when merging', () => {
    const { d, cls } = setup();
    d.assignments.push({ id: 'local', classId: cls.id, kind: 'vocab', ref: 'food', title: 'Words', to: 'class', createdAt: 'now', done: [] });
    mergeOnlineAssignments(d, cls.id, []);
    expect(d.assignments.map((x) => x.id)).toEqual(['local']);
  });

  it('works out who has done a task from their progress', () => {
    const { d, cls, a, b } = setup();
    mergeOnlineAssignments(d, cls.id, [row(), row({ id: 'as-e', kind: 'exam', ref: 'mock-w1', title: 'Exam' })]);
    a.lessons[lesson.id] = { score: 5, total: 5, completedAt: '2026-11-15', attempts: 1 };
    b.exams.push({ examId: 'mock-w1', title: 'Mock', date: '2026-11-15', bySkill: {}, score: 10, total: 40, minutes: 20 });
    refreshAssignmentDone(d, cls.id);
    expect(d.assignments.find((x) => x.id === 'as-1')!.done).toEqual([a.id]);
    expect(d.assignments.find((x) => x.id === 'as-e')!.done).toEqual([b.id]);
    const quiz = MODULES[0].lessons.find((l) => l.type === 'quiz')!;
    const unit: Assignment = { id: 'u', classId: cls.id, kind: 'module', ref: MODULES[0].id, title: 'Unit 1', to: 'class', createdAt: 'now', done: [] };
    expect(assignmentDone(unit, a)).toBe(false);
    a.lessons[quiz.id] = { score: 8, total: 10, completedAt: '2026-11-16', attempts: 1 };
    expect(assignmentDone(unit, a)).toBe(true);
  });
});
