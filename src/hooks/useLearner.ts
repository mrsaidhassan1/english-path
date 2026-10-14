import { useMemo } from 'react';
import { useApp } from '../store';
import { newStudent } from '../lib/learner';

/** The signed-in learner, or a temporary preview learner for the teacher (nothing is saved). */
export function useLearner() {
  const { me, data } = useApp();
  const preview = useMemo(() => {
    const s = newStudent('Teacher', 'A1');
    s.id = 'preview';
    s.avatar = { kind: 'monster', seed: 2026 };
    return s;
  }, []);
  const assigned = useMemo(() => {
    const set = new Set<string>();
    if (me) data.assignments.filter((a) => (a.to === 'class' ? a.classId === me.classId : a.to.includes(me.id))).forEach((a) => set.add(a.ref));
    return set;
  }, [data.assignments, me]);
  return { learner: me ?? preview, preview: !me, unlockAll: data.settings.unlockAll || !me, assigned };
}
