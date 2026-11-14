// Creating and removing assignments. On the online version they are also saved in the online class store,
// so they reach learners' own phones (Phase 4); offline copies keep them on this device only.
import { useApp } from '../store';
import type { Assignment } from '../types';
import { assignmentRow } from '../lib/assignments';
import { classPermissions, deleteAssignmentOnline, onlineEnabled, onlineError, pushAssignment } from '../lib/online';

export function useAssignments() {
  const { data, update, toast, cls } = useApp();
  const online = onlineEnabled && !!cls && classPermissions(data.session.staff, cls.code).canMark;

  const create = async (a: Omit<Assignment, 'id' | 'createdAt' | 'done' | 'classId'>) => {
    if (!cls) return;
    const full: Assignment = { ...a, id: `as-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, classId: cls.id, createdAt: new Date().toISOString(), done: [] };
    update((d) => { d.assignments.unshift(full); });
    if (!online) { toast('Task assigned. Students see it on My Learning.', 'good'); return; }
    try {
      const { row, missing } = assignmentRow(full, cls.code, data.students);
      if (full.to !== 'class' && row.to_students.length === 0) {
        toast('Saved on this device only: none of the chosen students has joined online yet.', 'warn');
        return;
      }
      await pushAssignment(row);
      update((d) => { const x = d.assignments.find((y) => y.id === full.id); if (x) x.online = true; });
      toast(missing ? `Task sent to students' phones (${missing} chosen ${missing === 1 ? 'student has' : 'students have'} not joined online yet).` : "Task sent to students' phones. They see it on My Learning.", missing ? 'warn' : 'good');
    } catch (e) {
      toast(`Task saved on this device, but not online: ${onlineError(e)}`, 'warn');
    }
  };

  const remove = async (a: Assignment) => {
    update((d) => { d.assignments = d.assignments.filter((x) => x.id !== a.id); });
    if (a.online && onlineEnabled) {
      try { await deleteAssignmentOnline(a.id); } catch (e) { toast(`Removed here, but not online: ${onlineError(e)}`, 'warn'); }
    }
  };

  return { create, remove, online };
}
