// Sends the signed-in learner's progress and writing to the online class store, and brings back
// the teacher's marks. Runs once in <App>; does nothing when the store is not set up.
// One phone = one online learner: the first learner who joins online on a device owns its
// anonymous login, so a second learner on the same phone keeps saving on the phone only.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { ENTRY_GONE, fetchAssignments, fetchMyMarks, fetchMyRestoreCode, joinOnline, myOnlineId, onlineEnabled, onlineError, pushProgress, pushWriting } from '../lib/online';
import { mergeOnlineAssignments, refreshAssignmentDone } from '../lib/assignments';

export type SyncState = { kind: 'off' | 'idle' | 'saving' | 'saved' | 'offline' | 'other' | 'error'; message?: string };
let state: SyncState = { kind: onlineEnabled ? 'idle' : 'off' };
const listeners = new Set<() => void>();
const setState = (s: SyncState) => { state = s; listeners.forEach((l) => l()); };
export const useSyncState = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);

const OWNER_KEY = 'sh-english-path/online-owner';
const owner = () => { try { return localStorage.getItem(OWNER_KEY); } catch { return null; } };
const setOwner = (id: string) => { try { localStorage.setItem(OWNER_KEY, id); } catch { /* private mode */ } };
/** The learner whose work this phone sends online (null = nobody yet). */
export const phoneOwner = owner;
/** This phone now sends this learner's work (after a restore). */
export const claimPhone = setOwner;

export function useOnlineSync() {
  const { data, me, update, updateStudent } = useApp();
  const cls = me ? data.classes.find((c) => c.id === me.classId) : undefined;
  const busy = useRef(false);
  const rejoin = useRef(false);
  const [tick, setTick] = useState(0); // bumped when the connection comes back, to retry
  const marksFetched = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const myWriting = me ? data.writing.filter((w) => w.studentId === me.id && !w.sentOnline) : [];
  const progressKey = me ? JSON.stringify([me.lessons, me.exams, me.streak, me.skillStats, Object.keys(me.vocab).length, me.badges, me.speaking]) : '';

  // 1. join online once (anonymous login + class code)
  useEffect(() => {
    if (!onlineEnabled || !me || !cls || data.session.role !== 'student') return;
    if (owner() && owner() !== me.id) { setState({ kind: 'other', message: 'This phone already sends another learner’s work. Yours is saved on this phone.' }); return; }
    if (me.onlineId || busy.current) return;
    busy.current = true;
    setState({ kind: 'saving' });
    (async () => {
      try {
        const existing = await myOnlineId();
        // rejoin.current: the online entry was removed (e.g. a duplicate), so join the class again
        const id = existing && owner() === me.id && !rejoin.current ? existing : await joinOnline(cls.code, me.firstName, me.lastName);
        rejoin.current = false;
        setOwner(me.id);
        updateStudent((s) => { s.onlineId = id; }, me.id);
        setState({ kind: 'saved' });
      } catch (e) {
        setState({ kind: /internet|fetch|network/i.test(String((e as Error)?.message)) ? 'offline' : 'error', message: onlineError(e) });
      } finally {
        busy.current = false;
      }
    })();
  }, [me?.id, me?.onlineId, cls?.code, data.session.role, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. send progress a few seconds after it changes
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId || owner() !== me.id) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setState({ kind: 'saving' });
      try { await pushProgress(me); setState({ kind: 'saved' }); } catch (e) {
        if ((e as Error)?.message === ENTRY_GONE) { rejoin.current = true; updateStudent((s) => { s.onlineId = undefined; }, me.id); return; } // join again, then resend
        setState({ kind: 'offline', message: onlineError(e) });
      }
    }, 4000);
    return () => window.clearTimeout(timer.current);
  }, [progressKey, me?.onlineId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. send new writing
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId || !cls || owner() !== me.id || myWriting.length === 0) return;
    (async () => {
      for (const w of myWriting) {
        try {
          await pushWriting(w, me.onlineId!, cls.code);
          update((d) => { const x = d.writing.find((y) => y.id === w.id); if (x) x.sentOnline = true; });
        } catch (e) { setState({ kind: 'offline', message: onlineError(e) }); return; }
      }
      setState({ kind: 'saved' });
    })();
  }, [myWriting.length, me?.onlineId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. bring back the teacher's marks (once per visit)
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId || owner() !== me.id || marksFetched.current === me.id) return;
    marksFetched.current = me.id;
    fetchMyMarks().then((rows) => {
      if (!rows.length) return;
      update((d) => {
        for (const r of rows) {
          const w = d.writing.find((x) => x.id === r.id);
          if (w && r.marks) { w.marks = r.marks; w.teacherScore = r.teacher_score ?? undefined; w.teacherNote = r.teacher_note ?? undefined; }
        }
      });
    }).catch(() => { marksFetched.current = null; });
  }, [me?.onlineId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. the teacher's tasks for this learner (when the app opens, every 5 minutes, and when it comes back on screen)
  const [taskTick, setTaskTick] = useState(0);
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId || !cls || owner() !== me.id) return;
    let live = true;
    fetchAssignments(cls.code).then((rows) => {
      if (!live) return;
      update((d) => {
        const self = d.students.find((x) => x.id === me.id);
        if (!self) return;
        mergeOnlineAssignments(d, self.classId, rows, self);
        refreshAssignmentDone(d, self.classId);
      });
    }).catch(() => undefined); // no internet, or no assignments table yet: keep what is on the phone
    return () => { live = false; };
  }, [me?.onlineId, cls?.code, taskTick, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId) return;
    const again = () => { if (document.visibilityState === 'visible') setTaskTick((t) => t + 1); };
    const timer = window.setInterval(again, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', again);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', again); };
  }, [me?.onlineId]);

  // 6. the learner's restore code (to get his record back if this phone forgets him).
  // Checked once per visit, and again after a rejoin: when the online entry is made again the code changes,
  // and a code the phone still showed from before would be refused. A changed code shows its card again.
  const codeChecked = useRef<string | null>(null);
  useEffect(() => {
    if (!onlineEnabled || !me?.onlineId || owner() !== me.id) { codeChecked.current = null; return; }
    if (codeChecked.current === me.onlineId && me.restoreCode) return;
    const had = me.restoreCode;
    codeChecked.current = me.onlineId;
    fetchMyRestoreCode(me.onlineId).then((c) => {
      if (c && c !== had) updateStudent((s) => { s.restoreCode = c; s.restoreCodeSaved = false; }, me.id);
    }).catch(() => { codeChecked.current = null; });
  }, [me?.onlineId, me?.restoreCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // retry when the connection comes back
  useEffect(() => {
    if (!onlineEnabled) return;
    const on = () => { if (state.kind === 'offline' || state.kind === 'error') setTick((t) => t + 1); };
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);
}
