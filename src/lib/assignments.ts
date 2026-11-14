// Assignments in the online class store (Phase 4): merging them into this device's data, and working out
// who has done each task from the learners' own progress (which their phones send online).
import type { AppData, Assignment, Student } from '../types';
import { getModule } from '../data/modules';

export interface AssignmentRow {
  id: string; class_code: string; kind: Assignment['kind']; ref: string; title: string;
  to_all: boolean; to_students: string[]; due: string | null; created_at: string;
}

/** The online row for a local assignment; `null` targets when some chosen learners are not linked online. */
export function assignmentRow(a: Assignment, classCode: string, students: Student[]): { row: AssignmentRow; missing: number } {
  const chosen = a.to === 'class' ? [] : students.filter((s) => a.to.includes(s.id));
  const ids = chosen.map((s) => s.onlineId).filter((x): x is string => !!x);
  return {
    row: { id: a.id, class_code: classCode, kind: a.kind, ref: a.ref, title: a.title, to_all: a.to === 'class', to_students: ids, due: a.due ?? null, created_at: a.createdAt },
    missing: chosen.length - ids.length,
  };
}

/**
 * Bring the online assignments of one class into this device. Teacher device: every row (learners mapped from
 * their online ids). Learner's phone: the rows the server lets him see. Local "done" marks are kept; online
 * assignments that were removed online disappear here too.
 */
export function mergeOnlineAssignments(d: AppData, classId: string, rows: AssignmentRow[], me?: Student | null): void {
  const byOnline = new Map(d.students.filter((s) => s.classId === classId && s.onlineId).map((s) => [s.onlineId!, s.id]));
  const seen = new Set<string>();
  for (const r of rows) {
    const to: Assignment['to'] = r.to_all ? 'class'
      : me ? (me.onlineId && r.to_students.includes(me.onlineId) ? [me.id] : [])
        : r.to_students.map((id) => byOnline.get(id)).filter((x): x is string => !!x);
    if (to !== 'class' && to.length === 0 && me) continue; // not for this learner
    seen.add(r.id);
    const have = d.assignments.find((a) => a.id === r.id);
    if (have) Object.assign(have, { classId, kind: r.kind, ref: r.ref, title: r.title, to, due: r.due ?? undefined, online: true });
    else d.assignments.unshift({ id: r.id, classId, kind: r.kind, ref: r.ref, title: r.title, to, due: r.due ?? undefined, createdAt: r.created_at, done: [], online: true });
  }
  d.assignments = d.assignments.filter((a) => a.classId !== classId || !a.online || seen.has(a.id));
}

/** Has this learner done this task? Read from his own progress (lessons, exams); other kinds rely on his phone's mark. */
export function assignmentDone(a: Assignment, s: Student): boolean {
  if (a.done.includes(s.id)) return true;
  switch (a.kind) {
    case 'lesson':
    case 'review': return !!s.lessons[a.ref];
    case 'module': {
      const quiz = getModule(a.ref)?.lessons.find((l) => l.type === 'quiz');
      return !!quiz && !!s.lessons[quiz.id];
    }
    case 'exam': return s.exams.some((e) => e.examId === a.ref);
    default: return false;
  }
}

/** Add to each assignment's "done" list the learners whose progress shows the task is finished. */
export function refreshAssignmentDone(d: AppData, classId: string): void {
  const inClass = d.students.filter((s) => s.classId === classId);
  for (const a of d.assignments.filter((x) => x.classId === classId)) {
    const targets = a.to === 'class' ? inClass : inClass.filter((s) => a.to.includes(s.id));
    for (const s of targets) if (!a.done.includes(s.id) && assignmentDone(a, s)) a.done.push(s.id);
  }
}
