// App state: one AppData object, persisted through a DataStore (localStorage today).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, ClassInfo, Student } from './types';
import { localStore, type DataStore } from './lib/storage';
import { BADGES, checkBadges } from './lib/learner';

interface Ctx {
  data: AppData;
  /** Apply a change to a deep copy of the data, then save. */
  update: (fn: (d: AppData) => void) => void;
  /** Change one student (current learner by default). Badges are checked automatically. */
  updateStudent: (fn: (s: Student) => void, id?: string) => void;
  replaceAll: (d: AppData) => void;
  me: Student | null;
  isTeacher: boolean;
  /** Signed in as teacher / admin / observer, even while viewing as a student. */
  isStaff: boolean;
  /** A teacher looking at the app as a student sees it (nothing is saved). */
  viewAsStudent: boolean;
  /** The class in use: the teacher's chosen class, or the learner's own class. */
  cls: ClassInfo | null;
  /** Learners in that class. */
  students: Student[];
  toast: (msg: string, tone?: 'good' | 'info' | 'warn') => void;
  saveError: string | null;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children, store = localStore }: { children: ReactNode; store?: DataStore }) {
  const [data, setData] = useState<AppData>(() => store.load());
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: string }[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const r = store.save(data);
    setSaveError(r.ok ? null : r.error);
  }, [data, store]);

  const toast = useCallback((msg: string, tone: 'good' | 'info' | 'warn' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const update = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const updateStudent = useCallback((fn: (s: Student) => void, id?: string) => {
    setData((prev) => {
      const sid = id ?? prev.session.studentId;
      const i = prev.students.findIndex((s) => s.id === sid);
      if (i < 0) return prev;
      const next = { ...prev, students: [...prev.students] };
      const s = structuredClone(prev.students[i]);
      fn(s);
      checkBadges(s);
      next.students[i] = s;
      return next;
    });
  }, []);

  // Celebrate new badges for the learner who is using the app.
  const seenBadges = useRef<Record<string, number>>({});
  useEffect(() => {
    const sid = data.session.studentId;
    for (const s of data.students) {
      const ids = Object.keys(s.badges);
      const before = seenBadges.current[s.id];
      if (before !== undefined && ids.length > before && s.id === sid && data.session.role === 'student') {
        ids.slice(before).forEach((b) => {
          const def = BADGES.find((x) => x.id === b);
          if (def) toast(`${def.icon} New badge: ${def.title}!`, 'good');
        });
      }
      seenBadges.current[s.id] = ids.length;
    }
  }, [data.students, data.session, toast]);

  const replaceAll = useCallback((d: AppData) => setData(d), []);

  const me = useMemo(() => data.students.find((s) => s.id === data.session.studentId) ?? null, [data.students, data.session.studentId]);

  const cls = useMemo(() => {
    const id = me ? me.classId : data.activeClassId;
    return data.classes.find((c) => c.id === id) ?? data.classes[0] ?? null;
  }, [me, data.activeClassId, data.classes]);
  const students = useMemo(() => (cls ? data.students.filter((s) => s.classId === cls.id) : []), [cls, data.students]);

  const value: Ctx = { data, update, updateStudent, replaceAll, me, isTeacher: data.session.role === 'teacher' && !data.session.viewAsStudent, isStaff: data.session.role === 'teacher', viewAsStudent: data.session.role === 'teacher' && !!data.session.viewAsStudent, cls, students, toast, saveError };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-rise rounded-2xl px-5 py-3 text-base font-semibold shadow-lift ${
              t.tone === 'good' ? 'bg-mint text-white' : t.tone === 'warn' ? 'bg-coral-700 text-white' : 'bg-navy text-white'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}
