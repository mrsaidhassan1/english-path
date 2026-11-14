// Phase 5, data care: class exports (CSV that Excel opens), and linking a learner who joined online under a
// differently spelled name to his roster card. The files are saved on the teacher's own device.
import type { AppData, Student } from '../types';
import { SKILLS } from '../types';
import { lastExam, overallProgress, skillPct } from './progress';
import { nameOf, refreshNameFlags } from './classes';

type Cell = string | number | null | undefined;
const esc = (v: Cell) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; // also stops spreadsheet formulas
};
/** CSV with a byte-order mark, so Excel shows Arabic and accented letters correctly. */
export const toCsv = (rows: Cell[][]) => `﻿${rows.map((r) => r.map(esc).join(',')).join('\r\n')}\r\n`;

const pct = (n: number | null) => (n === null ? '' : `${n}%`);
const writingOf = (d: AppData, s: Student) => d.writing.filter((w) => w.studentId === s.id);
const sortRoster = (a: Student, b: Student) => (a.rosterNo ?? 999) - (b.rosterNo ?? 999) || nameOf(a).localeCompare(nameOf(b));

/** One row per learner: progress, skills, writing and the latest exam. */
export function classReportRows(d: AppData, classId: string): Cell[][] {
  const head = ['No.', 'First name', 'Surname', 'Student ID', 'Level', 'Group', 'Online', 'Last active', 'Days active', 'Streak', 'Lessons done', 'Course progress',
    ...SKILLS.map((k) => k[0].toUpperCase() + k.slice(1)), 'Writing pieces', 'Writing marked', 'Average writing /15', 'Latest exam', 'Latest exam score'];
  const rows = d.students.filter((s) => s.classId === classId).sort(sortRoster).map((s) => {
    const w = writingOf(d, s);
    const marked = w.filter((x) => x.marks);
    const avg = marked.length ? Math.round((marked.reduce((t, x) => t + (x.teacherScore ?? 0), 0) / marked.length) * 10) / 10 : '';
    const e = lastExam(s);
    return [
      s.rosterNo, s.firstName, s.lastName, s.iatcId, s.level, s.group, s.onlineId ? 'yes' : 'no',
      [...s.activeDays].sort().at(-1) ?? '', s.activeDays.length, s.streak.count, Object.keys(s.lessons).length, `${overallProgress(s)}%`,
      ...SKILLS.map((k) => pct(skillPct(s, k))), w.length, marked.length, avg, e ? `${e.title} (${e.date})` : '', e ? `${e.score}/${e.total}` : '',
    ];
  });
  return [head, ...rows];
}

/** One row per piece of writing, with the marks and who marked it. */
export function writingRows(d: AppData, classId: string): Cell[][] {
  const head = ['Date', 'No.', 'Learner', 'Task', 'Words', 'Content /5', 'Organisation /5', 'Language /5', 'Total /15', 'Marked by', 'Feedback', 'Text'];
  const ids = new Map(d.students.filter((s) => s.classId === classId).map((s) => [s.id, s]));
  const rows = d.writing.filter((w) => ids.has(w.studentId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((w) => {
    const s = ids.get(w.studentId)!;
    return [w.createdAt.slice(0, 10), s.rosterNo, nameOf(s), w.taskTitle, w.words, w.marks?.content, w.marks?.organisation, w.marks?.language,
      w.marks ? w.teacherScore : '', w.markedBy, w.teacherNote, w.text];
  });
  return [head, ...rows];
}

const PROGRESS = ['avatar', 'goal', 'interests', 'lessons', 'skillStats', 'grammarStats', 'vocab', 'practiseAgain', 'speaking', 'exams', 'streak', 'activeDays', 'badges', 'log'] as const;

/**
 * A learner joined online with a differently spelled name and so did not link to his roster card. Move his
 * online link, progress and writing onto the roster card and remove the extra learner. Roster details
 * (ID, number, group, photo, classroom participation) stay as they are.
 */
export function linkToRosterCard(d: AppData, extraId: string, cardId: string): boolean {
  const extra = d.students.find((s) => s.id === extraId);
  const card = d.students.find((s) => s.id === cardId);
  if (!extra || !card || extra === card || extra.classId !== card.classId || !extra.onlineId || card.onlineId) return false;
  const photo = card.avatar.kind === 'photo' ? card.avatar : null;
  for (const k of PROGRESS) (card as unknown as Record<string, unknown>)[k] = structuredClone(extra[k]);
  if (photo) card.avatar = photo;
  card.onlineId = extra.onlineId;
  card.onlineAt = extra.onlineAt;
  for (const w of d.writing) if (w.studentId === extra.id) w.studentId = card.id;
  for (const a of d.assignments) {
    if (a.done.includes(extra.id)) a.done = [...new Set(a.done.map((x) => (x === extra.id ? card.id : x)))];
    if (a.to !== 'class' && a.to.includes(extra.id)) a.to = [...new Set(a.to.map((x) => (x === extra.id ? card.id : x)))];
  }
  if (d.session.studentId === extra.id) d.session.studentId = card.id;
  d.students = d.students.filter((s) => s.id !== extra.id);
  refreshNameFlags(d);
  return true;
}

/** Save a file on this device (the browser's Downloads folder). */
export function downloadFile(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
