// Classes: several classes on one device, join codes, class files (import / export) and name display.
import type { AppData, Cefr, ClassInfo, ExamResult, Student } from '../types';
import { newStudent, recordExam } from './learner';
import { newSeed } from './rng';

// ------------------------------------------------------------------ names
/** Name to show: first name, plus surname when two learners in the class share a first name. */
export const nameOf = (s: Pick<Student, 'firstName' | 'lastName' | 'showSurname'>) =>
  s.showSurname && s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;

/** Recalculate which learners need their surname shown (per class). */
export function refreshNameFlags(d: AppData) {
  const count = new Map<string, number>();
  for (const s of d.students) count.set(`${s.classId}|${s.firstName.toLowerCase()}`, (count.get(`${s.classId}|${s.firstName.toLowerCase()}`) ?? 0) + 1);
  for (const s of d.students) s.showSurname = (count.get(`${s.classId}|${s.firstName.toLowerCase()}`) ?? 0) > 1 && !!s.lastName;
}

/** "Ziyad Alotaibi" → { firstName: "Ziyad", lastName: "Alotaibi" }. */
export function splitName(full: string): { firstName: string; lastName?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

// ------------------------------------------------------------------ classes
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
export function makeCode(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'CLASS';
  let tail = '';
  for (let i = 0; i < 3; i++) tail += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${base}-${tail}`;
}

export function newClass(name: string, level = 'A0 → A1', term?: string): ClassInfo {
  return {
    id: `cl-${name.replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'class'}-${Date.now().toString(36)}`,
    name: name.trim(),
    level,
    term,
    code: makeCode(name),
    allowJoin: true,
    createdAt: new Date().toISOString(),
  };
}

export const classOf = (d: AppData, id: string) => d.classes.find((c) => c.id === id);
export const studentsIn = (d: AppData, classId: string) => d.students.filter((s) => s.classId === classId);
export const findClassByCode = (d: AppData, code: string) => d.classes.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());

/** A learner joins a class with its code. Returns the new learner, or an error message. */
export function joinWithCode(d: AppData, code: string, fullName: string): { student?: Student; error?: string } {
  const cls = findClassByCode(d, code);
  if (!cls) return { error: 'We can’t find that class code. Check it with your teacher.' };
  if (!cls.allowJoin) return { error: 'This class is closed. Ask your teacher to add you.' };
  const { firstName, lastName } = splitName(fullName);
  if (!firstName) return { error: 'Please write your name.' };
  const dup = studentsIn(d, cls.id).find((s) => s.firstName.toLowerCase() === firstName.toLowerCase() && (s.lastName ?? '').toLowerCase() === (lastName ?? '').toLowerCase());
  if (dup) return { student: dup }; // already in the class: just sign in
  const s = newStudent(firstName, 'A0', { classId: cls.id, lastName, joinedBy: 'code' });
  d.students.push(s);
  refreshNameFlags(d);
  return { student: s };
}

// ------------------------------------------------------------------ class files
export interface ClassFileStudent {
  firstName: string;
  lastName?: string;
  iatcId?: string;
  rosterNo?: number;
  level?: Cefr;
  group?: string;
  groupRole?: string;
  partnerNos?: number[];
  pairNote?: string;
  photo?: string; // small JPEG data URL
  exams?: ExamResult[];
}
export interface ClassFile {
  format: 'sh-a1-class';
  version: 1;
  class: { name: string; level?: string; term?: string };
  students: ClassFileStudent[];
  notes?: string[];
}

export function isClassFile(x: unknown): x is ClassFile {
  return !!x && typeof x === 'object' && (x as ClassFile).format === 'sh-a1-class' && Array.isArray((x as ClassFile).students);
}

/** CSV with a header row: first name, last name (optional), student id (optional), level (optional), group (optional). */
export function parseCsvClass(text: string, className: string): ClassFile {
  const rows = text.split(/\r?\n/).map((r) => r.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''))).filter((r) => r.some(Boolean));
  if (rows.length === 0) throw new Error('The file is empty.');
  const head = rows[0].map((h) => h.toLowerCase());
  const has = head.some((h) => /name|id|level/.test(h));
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iFirst = has ? col(/first|^name$|student name|full/) : 0;
  const iLast = has ? col(/last|surname|family/) : -1;
  const iId = has ? col(/\bid\b|student id|iatc/) : -1;
  const iLevel = has ? col(/level|cefr/) : -1;
  const iGroup = has ? col(/group/) : -1;
  const students = (has ? rows.slice(1) : rows).map((r) => {
    const full = r[iFirst >= 0 ? iFirst : 0] ?? '';
    const split = iLast >= 0 ? { firstName: full.split(/\s+/)[0], lastName: r[iLast] || undefined } : splitName(full);
    const level = (r[iLevel] ?? '').toUpperCase();
    return { ...split, iatcId: iId >= 0 ? r[iId] || undefined : undefined, level: level === 'A1' ? 'A1' : level === 'A0' ? 'A0' : undefined, group: iGroup >= 0 ? r[iGroup] || undefined : undefined } as ClassFileStudent;
  }).filter((s) => s.firstName);
  return { format: 'sh-a1-class', version: 1, class: { name: className }, students };
}

/**
 * Import a class file. Learners are matched by college Student ID (then by full name),
 * so importing the same file twice never makes duplicates or loses progress.
 */
export function importClassFile(d: AppData, file: ClassFile): { classId: string; added: number; updated: number; photos: number; photosKept: number } {
  let cls = d.classes.find((c) => c.name.toLowerCase() === file.class.name.trim().toLowerCase());
  if (!cls) {
    cls = newClass(file.class.name, file.class.level, file.class.term);
    d.classes.push(cls);
  } else {
    if (file.class.level) cls.level = file.class.level;
    if (file.class.term) cls.term = file.class.term;
  }
  let added = 0;
  let updated = 0;
  let photos = 0;
  let photosKept = 0;
  for (const fs of file.students) {
    const match = d.students.find((s) => (fs.iatcId && s.iatcId === fs.iatcId) || (!fs.iatcId && s.classId === cls!.id && s.firstName === fs.firstName && (s.lastName ?? '') === (fs.lastName ?? '')));
    const s = match ?? newStudent(fs.firstName, fs.level ?? 'A0', { classId: cls.id, joinedBy: 'import' });
    s.classId = cls.id; // a learner moved from another class follows the file
    s.firstName = fs.firstName;
    s.lastName = fs.lastName;
    if (fs.iatcId) {
      s.iatcId = fs.iatcId;
      if (!match) s.id = `st-${fs.iatcId}`;
    }
    if (fs.rosterNo) s.rosterNo = fs.rosterNo;
    if (fs.level) s.level = fs.level;
    if (fs.group) s.group = fs.group;
    if (fs.groupRole !== undefined || fs.group) s.groupRole = fs.groupRole;
    if (fs.partnerNos !== undefined || fs.group) s.partnerNos = fs.partnerNos;
    if (fs.pairNote !== undefined || fs.group) s.pairNote = fs.pairNote;
    if (fs.photo) {
      // Never silently replace a different photo the teacher already chose on this device.
      if (s.avatar.kind === 'photo' && s.avatar.dataUrl !== fs.photo) photosKept++;
      else if (s.avatar.kind !== 'photo') {
        s.avatar = { kind: 'photo', dataUrl: fs.photo, seed: s.avatar.seed };
        photos++;
      }
    }
    for (const ex of fs.exams ?? []) if (!s.exams.some((e) => e.examId === ex.examId)) recordExam(s, ex, true);
    if (match) updated++;
    else {
      d.students.push(s);
      added++;
    }
  }
  refreshNameFlags(d);
  d.activeClassId = cls.id;
  return { classId: cls.id, added, updated, photos, photosKept };
}

export function exportClassFile(d: AppData, classId: string): ClassFile {
  const cls = classOf(d, classId)!;
  return {
    format: 'sh-a1-class',
    version: 1,
    class: { name: cls.name, level: cls.level, term: cls.term },
    students: studentsIn(d, classId).map((s) => ({
      firstName: s.firstName, lastName: s.lastName, iatcId: s.iatcId, rosterNo: s.rosterNo, level: s.level,
      group: s.group, groupRole: s.groupRole, partnerNos: s.partnerNos, pairNote: s.pairNote,
      photo: s.avatar.kind === 'photo' ? s.avatar.dataUrl : undefined,
    })),
  };
}

// ------------------------------------------------------------------ migration
/** Old single-class data (version 1) → classes (version 2). */
export function migrate(raw: Record<string, unknown>): AppData {
  if (raw.version === 2) return raw as unknown as AppData;
  const old = raw as unknown as AppData & { settings: { className?: string } };
  const cls: ClassInfo = { ...newClass(old.settings?.className || 'My Class'), id: 'cl-first', demo: old.students?.some((s) => s.demo) };
  const students = (old.students ?? []).map((s) => ({ ...s, classId: s.classId ?? cls.id, avatar: s.avatar ?? { kind: 'monster' as const, seed: newSeed() } }));
  const assignments = (old.assignments ?? []).map((a) => ({ ...a, classId: a.classId ?? cls.id }));
  const settings = { ...old.settings };
  delete (settings as { className?: string }).className;
  return { ...old, version: 2, classes: [cls], activeClassId: cls.id, students, assignments, settings };
}
