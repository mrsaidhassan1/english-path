// Teacher Dashboard → All classes (online version, any staff member): every class this login can see —
// the Admin sees all — with its teachers, learners, activity this week, writing to mark and tasks.
// The Admin and the class owner can rename a class and open or close joining.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, ArchiveRestore, Check, DoorClosed, DoorOpen, Eraser, FolderOpen, Pencil, RefreshCw, School, X } from 'lucide-react';
import { useApp } from '../store';
import { applyStaffAccess } from '../lib/classes';
import { classesOverview, clearOnlineClass, fetchMyAccess, onlineError, setClassArchived, updateOnlineClass, type ClassOverview } from '../lib/online';
import { ask } from '../components/Confirm';
import { Button, Card, EmptyState, Pill, Stat } from '../components/ui';

const ROLE = { admin: 'Admin', owner: 'Class owner', teacher: 'Teacher', observer: 'Observer' } as const;

export function AllClassesPanel() {
  const { data, update, toast } = useApp();
  const [, setParams] = useSearchParams();
  const [rows, setRows] = useState<ClassOverview[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState<{ code: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try { setRows(await classesOverview()); } catch (e) { setErr(onlineError(e)); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // keep this device's class list in step with the server (new classes, new names)
  const syncAccess = async () => { const a = await fetchMyAccess(); if (a) update((d) => { applyStaffAccess(d, a); }); };

  const change = async (c: ClassOverview, ch: { name?: string; allow_join?: boolean }, done: string) => {
    setBusy(true); setErr('');
    try { await updateOnlineClass(c.code, ch); toast(done, 'good'); await syncAccess(); await load(); }
    catch (e) { setErr(onlineError(e)); setBusy(false); }
  };

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setErr('');
    try { await fn(); toast(done, 'good'); await load(); } catch (e) { setErr(onlineError(e)); setBusy(false); }
  };

  const open = async (c: ClassOverview) => {
    if (!data.classes.some((x) => x.code.toUpperCase() === c.code.toUpperCase())) await syncAccess();
    update((d) => {
      const k = d.classes.find((x) => x.code.toUpperCase() === c.code.toUpperCase());
      if (k) d.activeClassId = k.id;
    });
    setParams({ tab: 'online' });
  };

  const totals = (rows ?? []).reduce((t, c) => ({ students: t.students + c.students, active: t.active + c.active_week, mark: t.mark + c.to_mark }), { students: 0, active: 0, mark: 0 });

  return (
    <div className="space-y-5">
      <Card className="bg-navy-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><School /> All classes</h2>
            <p className="text-navy-500">{data.session.staff?.role === 'admin' ? 'Every class in English Path.' : 'The classes you teach or observe.'} Open a class to load its learners, writing and tasks.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={busy}><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Refresh</Button>
        </div>
        {err && <p className="mt-2 font-semibold text-coral-700" role="alert">{err}</p>}
        {rows && rows.length > 1 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Learners online" value={totals.students} />
            <Stat label="Active this week" value={totals.active} />
            <Stat label="Writing to mark" value={totals.mark} />
          </div>
        )}
      </Card>

      {rows === null ? (busy ? <p className="text-navy-500">Loading…</p> : null) : rows.length === 0 ? (
        <EmptyState icon={<School />} title="No classes yet" text="An Admin can create classes in the Staff tab." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((c) => {
            const canEdit = c.my_role === 'admin' || c.my_role === 'owner';
            const pct = c.students ? Math.round((c.active_week / c.students) * 100) : 0;
            return (
              <Card key={c.code}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {renaming?.code === c.code ? (
                      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const n = renaming.name.trim(); setRenaming(null); if (n && n !== c.name) change(c, { name: n }, `Renamed to ${n}.`); }}>
                        <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ code: c.code, name: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-navy-100 px-2 text-lg font-bold text-navy" aria-label="New class name" />
                        <Button size="sm" type="submit" aria-label="Save name"><Check size={16} /></Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => setRenaming(null)} aria-label="Cancel"><X size={16} /></Button>
                      </form>
                    ) : (
                      <h3 className="flex items-center gap-2 text-xl font-bold text-navy">{c.name}
                        {canEdit && !c.archived && <button type="button" onClick={() => setRenaming({ code: c.code, name: c.name })} className="grid h-9 w-9 place-items-center rounded-lg text-navy-400 hover:bg-navy-50" aria-label={`Rename ${c.name}`}><Pencil size={16} /></button>}
                      </h3>
                    )}
                    <p className="text-navy-500">Join code <b className="font-mono">{c.code}</b>{c.my_role && <> · you: {ROLE[c.my_role]}</>}</p>
                  </div>
                  {c.archived ? <Pill tone="sun"><Archive size={14} className="mr-1 inline" />Archived (read-only)</Pill> : <Pill tone={c.allow_join ? 'mint' : 'grey'}>{c.allow_join ? 'Joining open' : 'Joining closed'}</Pill>}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Learners" value={c.students} />
                  <Stat label="Active this week" value={`${c.active_week}${c.students ? ` (${pct}%)` : ''}`} />
                  <Stat label="Writing to mark" value={`${c.to_mark}/${c.writing_total}`} />
                  <Stat label="Tasks" value={c.assignments} />
                </div>

                <p className="mt-3 text-sm text-navy-500">
                  <b className="text-navy">Teachers:</b>{' '}
                  {c.teachers.length ? c.teachers.map((t) => `${t.email} (${ROLE[t.role]}${t.status === 'suspended' ? ', suspended' : ''})`).join(' · ') : 'none yet (the Admin sees every class)'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => open(c)} disabled={busy}><FolderOpen size={16} /> Open this class</Button>
                  {canEdit && !c.archived && (c.allow_join
                    ? <Button size="sm" variant="outline" disabled={busy} onClick={async () => { if (await ask(`Close joining for ${c.name}? New learners cannot join with ${c.code}; learners who joined already keep working.`, 'Close joining')) change(c, { allow_join: false }, `Joining closed for ${c.name}.`); }}><DoorClosed size={16} /> Close joining</Button>
                    : <Button size="sm" variant="outline" disabled={busy} onClick={() => change(c, { allow_join: true }, `Joining open for ${c.name}.`)}><DoorOpen size={16} /> Open joining</Button>)}
                  {canEdit && !c.archived && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={async () => {
                      if (!(await ask(`Archive ${c.name} at the end of term? It is kept for reference but becomes read-only: no new learners, no marking, no new tasks. You can bring it back later.`, 'Archive'))) return;
                      run(() => setClassArchived(c.code, true), `${c.name} archived.`);
                    }}><Archive size={16} /> Archive</Button>
                  )}
                  {canEdit && c.archived && (
                    <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setClassArchived(c.code, false), `${c.name} is active again (joining is still closed).`)}><ArchiveRestore size={16} /> Bring back</Button>
                      <Button size="sm" variant="ghost" className="text-coral-700" disabled={busy || c.students === 0} onClick={async () => {
                        if (!(await ask(`Remove all ${c.students} learners of ${c.name} from the online class, with their progress and writing? Do this only after exporting (Settings → Export). This cannot be undone.`, 'Continue', true))) return;
                        if (!(await ask(`Last check: remove ${c.students} learners of ${c.name} for good?`, 'Remove all learners', true))) return;
                        run(async () => { const n = await clearOnlineClass(c.code); toast(`${n} learners removed from ${c.name} online. Remove them from this laptop in Classes if you no longer need them.`, 'good'); }, 'Class cleared.');
                      }}><Eraser size={16} /> Clear learners</Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
