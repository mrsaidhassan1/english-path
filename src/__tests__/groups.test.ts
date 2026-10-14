import { describe, expect, it } from 'vitest';
import { groupsOf, partnersOf } from '../lib/groups';
import { fairPick } from '../lib/picker';
import { newStudent } from '../lib/learner';
import { mulberry32 } from '../lib/rng';

const mk = (n: number, group?: string, groupRole?: string, partnerNos?: number[]) =>
  newStudent(`S${n}`, 'A0', { classId: 'c', rosterNo: n, group, groupRole, partnerNos });

describe('groups', () => {
  const st = [mk(1, 'G2', 'Support', [3]), mk(2, 'G10', 'Leader'), mk(3, 'G2', 'Leader', [1]), mk(4, 'G1', 'Middle'), mk(5)];
  it('orders groups G1, G2 … G10 and members Leader first; ungrouped learners are left out', () => {
    const g = groupsOf(st);
    expect(g.map((x) => x.name)).toEqual(['G1', 'G2', 'G10']);
    expect(g[1].members.map((m) => m.rosterNo)).toEqual([3, 1]);
  });
  it('finds pair partners in the same class', () => {
    expect(partnersOf(st[0], st).map((p) => p.rosterNo)).toEqual([3]);
  });
  it('gives every group a turn before any group goes twice', () => {
    const groups = groupsOf(st).map((g) => ({ id: g.name }));
    const counts: Record<string, number> = {};
    let last: string | null = null;
    const rnd = mulberry32(3);
    for (let i = 0; i < 9; i++) {
      const g: { id: string } = fairPick(groups, counts, last, rnd)!;
      counts[g.id] = (counts[g.id] ?? 0) + 1;
      last = g.id;
      expect(Math.max(...Object.values(counts)) - Math.min(...groups.map((x) => counts[x.id] ?? 0))).toBeLessThanOrEqual(1);
    }
  });
});
