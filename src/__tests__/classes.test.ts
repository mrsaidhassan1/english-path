import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { demoData, emptyData, ensureBuiltInClass, FND68_CLASS, startData } from '../lib/demo';
import { progressOf } from '../lib/online';
import { findClassByCode, importClassFile, joinWithCode, mergeOnlineClass, migrate, nameOf, newClass, parseCsvClass, studentsIn, type ClassFile } from '../lib/classes';
import { assignmentsFor } from '../lib/recommend';

const file: ClassFile = {
  format: 'sh-a1-class', version: 1, class: { name: 'FND 99', level: 'A0 → A1' },
  students: [
    { firstName: 'Abdulaziz', lastName: 'Alfarsi', iatcId: '100001', level: 'A1', exams: [{ examId: 'elem-1', title: 'ELEM 1', date: '2026-09-17', bySkill: { writing: { score: 11, total: 15 } }, score: 11, total: 15, minutes: 0 }] },
    { firstName: 'Abdulaziz', lastName: 'Alkhalidi', iatcId: '100002' },
    { firstName: 'Khalid', lastName: 'Example', iatcId: '100003' },
  ],
};

describe('classes', () => {
  it('imports a class file and shows surnames only for shared first names', () => {
    const d = emptyData();
    const r = importClassFile(d, file);
    expect(r).toMatchObject({ added: 3, updated: 0 });
    const st = studentsIn(d, r.classId);
    expect(st.map(nameOf).sort()).toEqual(['Abdulaziz Alfarsi', 'Abdulaziz Alkhalidi', 'Khalid']);
    expect(d.activeClassId).toBe(r.classId);
    expect(st.find((s) => s.iatcId === '100001')?.skillStats.writing).toEqual({ correct: 11, total: 15 });
    expect(st.every((s) => s.streak.count === 0 && s.activeDays.length === 0)).toBe(true); // import is not learner activity
  });

  it('re-importing matches by Student ID: no duplicates, progress kept, exams not counted twice', () => {
    const d = emptyData();
    importClassFile(d, file);
    const s = d.students.find((x) => x.iatcId === '100003')!;
    s.lessons['m1-l1'] = { score: 8, total: 10, completedAt: '', attempts: 1 };
    const r = importClassFile(d, { ...file, students: [...file.students, { firstName: 'Omar', iatcId: '100004' }] });
    expect(r).toMatchObject({ added: 1, updated: 3 });
    expect(d.students).toHaveLength(4);
    expect(d.students.find((x) => x.iatcId === '100003')!.lessons['m1-l1']).toBeTruthy();
    expect(d.students.find((x) => x.iatcId === '100001')!.exams).toHaveLength(1);
  });

  it('imports groups, roles, partners and photos, but never replaces a photo the teacher already chose', () => {
    const d = emptyData();
    const photo = 'data:image/jpeg;base64,AAAA';
    const f: ClassFile = { ...file, students: [
      { firstName: 'Ali', iatcId: '200001', group: 'G1', groupRole: 'Leader', partnerNos: [2], photo },
      { firstName: 'Omar', iatcId: '200002', group: 'G1', groupRole: 'Support', partnerNos: [1] },
    ] };
    const r1 = importClassFile(d, f);
    expect(r1.photos).toBe(1);
    const ali = d.students.find((x) => x.iatcId === '200001')!;
    expect(ali).toMatchObject({ group: 'G1', groupRole: 'Leader', partnerNos: [2], avatar: { kind: 'photo', dataUrl: photo } });
    ali.avatar = { kind: 'photo', dataUrl: 'data:image/jpeg;base64,TEACHER', seed: 1 };
    const r2 = importClassFile(d, f);
    expect(r2).toMatchObject({ photos: 0, photosKept: 1 });
    expect(d.students.find((x) => x.iatcId === '200001')!.avatar).toMatchObject({ dataUrl: 'data:image/jpeg;base64,TEACHER' });
  });

  it('keeps classes separate: learners, assignments and join codes', () => {
    const d = demoData();
    const other = newClass('FND 70');
    d.classes.push(other);
    const joined = joinWithCode(d, other.code.toLowerCase(), 'Ziyad Alotaibi');
    expect(joined.student?.classId).toBe(other.id);
    expect(joined.student?.lastName).toBe('Alotaibi');
    expect(studentsIn(d, other.id)).toHaveLength(1);
    // the demo class task is not shown to a learner from another class
    expect(assignmentsFor(joined.student!, d.assignments)).toHaveLength(0);
    expect(findClassByCode(d, other.code)?.name).toBe('FND 70');
    other.allowJoin = false;
    expect(joinWithCode(d, other.code, 'Sami').error).toMatch(/closed/);
    expect(joinWithCode(d, 'NOPE-123', 'Sami').error).toMatch(/can’t find/);
  });

  it('reads a CSV class list', () => {
    const f = parseCsvClass('First name,Surname,Student ID,Level\nFahad,Sample,100200,A0\nSaad,,100300,A1\n', 'FND 69');
    expect(f.class.name).toBe('FND 69');
    expect(f.students).toEqual([
      { firstName: 'Fahad', lastName: 'Sample', iatcId: '100200', level: 'A0', group: undefined },
      { firstName: 'Saad', lastName: undefined, iatcId: '100300', level: 'A1', group: undefined },
    ]);
  });

  it('migrates old single-class data without losing learners', () => {
    const old = { ...demoData(), version: 1, classes: undefined, activeClassId: undefined, settings: { ...demoData().settings, className: 'Old Class' } } as unknown as Record<string, unknown>;
    (old.students as { classId?: string }[]).forEach((s) => delete s.classId);
    (old.assignments as { classId?: string }[]).forEach((a) => delete a.classId);
    const d = migrate(old);
    expect(d.version).toBe(2);
    expect(d.classes).toHaveLength(1);
    expect(d.classes[0].name).toBe('Old Class');
    expect(d.students.every((s) => s.classId === d.classes[0].id)).toBe(true);
    expect(d.assignments.every((a) => a.classId === d.classes[0].id)).toBe(true);
  });

  // The real FND 68 file lives outside the app (confidential, local only). Checked when present.
  const real = '../class-files/FND68.class.json';
  it.runIf(existsSync(real))('imports the local FND 68 class file', () => {
    const d = emptyData();
    const r = importClassFile(d, JSON.parse(readFileSync(real, 'utf-8')));
    const st = studentsIn(d, r.classId);
    expect(st).toHaveLength(26);
    expect(new Set(st.map((s) => s.iatcId)).size).toBe(26);
    expect(st.filter((s) => s.exams.length === 1)).toHaveLength(25);
    expect(new Set(st.map(nameOf)).size).toBe(26); // every displayed name is unique
    expect(st.every((s) => s.group && s.groupRole)).toBe(true);
    const groups = new Map<string, number>();
    st.forEach((s) => groups.set(s.group!, (groups.get(s.group!) ?? 0) + 1));
    expect([...groups.values()].sort()).toEqual([5, 5, 5, 5, 6]);
    expect(st.filter((s) => s.groupRole === 'Leader')).toHaveLength(5);
    // partners are mutual and in the same group
    for (const s of st) for (const no of s.partnerNos ?? []) {
      const p = st.find((x) => x.rosterNo === no)!;
      expect(p.group).toBe(s.group);
      expect(p.partnerNos).toContain(s.rosterNo);
    }
    expect(r.photos).toBe(10);
  });
});

describe('built-in FND 68 class (no student data)', () => {
  it('a new device starts with an empty FND 68 class that learners join with FND68-SH', () => {
    const d = startData();
    expect(d.classes.map((c) => c.name)).toEqual(['FND 68']);
    expect(d.students).toEqual([]);
    const r = joinWithCode(d, 'fnd68-sh', 'Test Learner');
    expect(r.error).toBeUndefined();
    expect(r.student?.classId).toBe(FND68_CLASS.id);
  });

  it('is added to older saved data without removing anything, and never twice', () => {
    const demo = demoData();
    const d = ensureBuiltInClass(demo);
    expect(d.classes.map((c) => c.name)).toEqual(['FND 68', 'Demo Class']);
    expect(d.activeClassId).toBe(FND68_CLASS.id);
    expect(d.students).toHaveLength(demo.students.length);
    expect(ensureBuiltInClass(d).classes).toHaveLength(2);
  });

  it('the private class file merges into the same class (matched by name)', () => {
    const d = startData();
    const r = importClassFile(d, { ...file, class: { name: 'FND 68', level: 'A0 → A1' } });
    expect(r.classId).toBe(FND68_CLASS.id);
    expect(d.classes).toHaveLength(1);
  });

  it('ships no FND 68 student names in the built-in data', () => {
    expect(JSON.stringify(startData())).not.toMatch(/iatcId|lastName/);
  });
});

describe('online class store merge', () => {
  const row = (id: string, first: string, last: string | null, lessons = {}) => ({ id, first_name: first, last_name: last, progress: { lessons, streak: { count: 3, last: '2026-10-14' } }, updated_at: '2026-10-14T10:00:00Z' });
  const wr = (id: string, student: string) => ({ id, student_id: student, task_title: 'About Me', prompt: 'Write 25 words.', bullets: ['a', 'b', 'c'], body: 'My name is Test. I am a student.', words: 8, estimate: null, marks: null, teacher_score: null, teacher_note: null, source: 'u1-d1-write', created_at: '2026-10-14T10:05:00Z' });

  it('links roster learners by name, adds new learners, and brings their writing', () => {
    const d = startData();
    importClassFile(d, { ...file, class: { name: 'FND 68' } });
    const before = d.students.length;
    const r = mergeOnlineClass(d, FND68_CLASS.id, [row('u-1', 'Khalid', 'Example', { 'u1-d1': { score: 8, total: 10, completedAt: '', attempts: 1 } }), row('u-2', 'Faris', null)], [wr('wr-1', 'u-1'), wr('wr-2', 'u-2')]);
    expect(r).toEqual({ added: 1, updated: 1, writing: 2 });
    expect(d.students).toHaveLength(before + 1);
    const khalid = d.students.find((s) => s.firstName === 'Khalid')!;
    expect(khalid.onlineId).toBe('u-1');
    expect(khalid.iatcId).toBe('100003'); // teacher-only fields kept
    expect(khalid.lessons['u1-d1'].score).toBe(8);
    expect(d.writing.filter((w) => w.online)).toHaveLength(2);
  });

  it('does not duplicate learners or writing when loaded again', () => {
    const d = startData();
    mergeOnlineClass(d, FND68_CLASS.id, [row('u-1', 'Faris', null)], [wr('wr-1', 'u-1')]);
    const r = mergeOnlineClass(d, FND68_CLASS.id, [row('u-1', 'Faris', null)], [wr('wr-1', 'u-1')]);
    expect(r).toEqual({ added: 0, updated: 1, writing: 0 });
    expect(d.students).toHaveLength(1);
    expect(d.writing).toHaveLength(1);
  });

  it('never sends photos or teacher-only fields online', () => {
    const s = demoData().students[0];
    const p = progressOf({ ...s, avatar: { kind: 'photo', dataUrl: 'data:image/jpeg;base64,xx', seed: 5 }, iatcId: '123', group: 'G1' });
    expect(JSON.stringify(p)).not.toMatch(/dataUrl|iatcId|group|level/);
  });
});
