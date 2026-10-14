// Fair random picker: choose among learners who have answered the least this session,
// never the same learner twice in a row (when there is a choice).
export function fairPick<T extends { id: string }>(students: T[], counts: Record<string, number>, lastId: string | null, rnd: () => number = Math.random): T | null {
  if (students.length === 0) return null;
  const min = Math.min(...students.map((s) => counts[s.id] ?? 0));
  let pool = students.filter((s) => (counts[s.id] ?? 0) === min);
  if (pool.length > 1 && lastId) pool = pool.filter((s) => s.id !== lastId);
  if (pool.length === 0) pool = students.filter((s) => s.id !== lastId);
  if (pool.length === 0) pool = students;
  return pool[Math.floor(rnd() * pool.length)];
}
