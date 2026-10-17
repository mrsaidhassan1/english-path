// Online version: each time the app opens in teacher mode, ask the server who this teacher is.
// No staff access any more (removed, suspended, or never signed in) → back to the welcome screen.
// No internet → stay in teacher mode with the access from the last check.
import { useEffect } from 'react';
import { useApp } from '../store';
import { applyStaffAccess } from '../lib/classes';
import { fetchMyAccess, onlineEnabled } from '../lib/online';

export function useStaffCheck() {
  const { data, update, toast } = useApp();
  const role = data.session.role;
  useEffect(() => {
    if (!onlineEnabled || role !== 'teacher') return;
    let live = true;
    fetchMyAccess()
      .then((access) => {
        if (!live) return;
        if (access) update((d) => { applyStaffAccess(d, access); });
        else {
          update((d) => { d.session = { role: null, studentId: null }; });
          toast('Please sign in as a teacher again.', 'warn');
        }
      })
      .catch(() => undefined); // offline: keep the last access
    return () => { live = false; };
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
}
