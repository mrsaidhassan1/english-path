// Mixed-ability groups (from the class file) for Classroom Mode.
import type { Student } from '../types';

export interface Group { name: string; members: Student[] }

const ROLE_ORDER = ['Leader', 'Assistant', 'Middle', 'Support'];
export const roleRank = (s: Student) => {
  const i = ROLE_ORDER.findIndex((r) => s.groupRole?.startsWith(r));
  return i < 0 ? ROLE_ORDER.length : i;
};

/** Groups in name order (G1, G2 …), members Leader → Support. Learners without a group are left out. */
export function groupsOf(students: Student[]): Group[] {
  const map = new Map<string, Student[]>();
  for (const s of students) if (s.group) map.set(s.group, [...(map.get(s.group) ?? []), s]);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([name, members]) => ({ name, members: [...members].sort((a, b) => roleRank(a) - roleRank(b) || (a.rosterNo ?? 0) - (b.rosterNo ?? 0)) }));
}

export const roleIcon = (s: Student) =>
  s.groupRole?.startsWith('Leader') ? '⭐' : s.groupRole?.startsWith('Assistant') ? '🤝' : s.groupRole?.startsWith('Support') ? '🌱' : '';

/** Pair partners of a learner (same class, by roster number). */
export const partnersOf = (s: Student, classmates: Student[]) =>
  (s.partnerNos ?? []).map((no) => classmates.find((x) => x.rosterNo === no)).filter((x): x is Student => !!x);

/** What to do with a picked group: support students answer first, the leader checks. */
export function groupTask(g: Group): string {
  const support = g.members.filter((m) => m.groupRole?.startsWith('Support') || m.groupRole?.startsWith('Middle'));
  const leader = g.members.find((m) => m.groupRole?.startsWith('Leader'));
  if (!support.length || !leader) return 'Discuss for 30 seconds, then one student answers.';
  return `Discuss for 30 seconds. A Support or Middle student answers; the Leader checks.`;
}
