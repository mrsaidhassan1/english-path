// Teacher Dashboard → Online class: load every learner's progress and writing from the online class
// store into this device (lib/online.ts, supabase/setup.sql + phase1_roles.sql). The teacher is already
// signed in (Welcome → I'm the teacher); what they can see depends on their staff role.
import { useState } from 'react';
import { Cloud, CloudOff, Eye, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../store';
import { applyStaffAccess, mergeOnlineClass } from '../lib/classes';
import { classPermissions, fetchClass, fetchMyAccess, onlineEnabled, onlineError, setTeacherPassword } from '../lib/online';
import { Button, Card, EmptyState, Pill } from '../components/ui';
import { niceDate } from '../lib/date';

const ROLE_LABEL = { admin: 'Admin', owner: 'Class owner', teacher: 'Teacher', observer: 'Observer (view only)' } as const;

export function OnlineClassPanel() {
  const { data, cls, update, toast, students } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [last, setLast] = useState<{ at: string; added: number; updated: number; writing: number; total: number } | null>(null);
  const staff = data.session.staff;

  if (!onlineEnabled) {
    return (
      <EmptyState icon={<CloudOff />} title="Online class is not set up"
        text="This copy of the app saves on each device only. The online version (GitHub Pages + Supabase) sends every learner's progress and writing to you. See README → Online class." />
    );
  }
  if (!staff) {
    return <EmptyState icon={<CloudOff />} title="Not signed in online" text="Sign out (top right), then choose I'm the teacher and sign in with your teacher email." />;
  }

  const perms = classPermissions(staff, cls?.code);

  const recheck = async () => {
    setBusy(true); setErr('');
    try {
      const a = await fetchMyAccess();
      if (a) { update((d) => { applyStaffAccess(d, a); }); toast('Access checked.', 'good'); }
      else setErr('This login has no teacher access any more. Sign out and ask the admin.');
    } catch (e) { setErr(onlineError(e)); } finally { setBusy(false); }
  };

  const load = async () => {
    if (!cls || !perms.canRead) return;
    setBusy(true); setErr('');
    try {
      const { students: rows, writing } = await fetchClass(cls.code);
      const r = mergeOnlineClass(structuredClone(data), cls.id, rows, writing); // counts for the summary
      update((d) => { mergeOnlineClass(d, cls.id, rows, writing); });
      setLast({ at: new Date().toISOString(), ...r, total: rows.length });
      toast(`Loaded ${rows.length} learners and ${writing.length} pieces of writing.`, 'good');
    } catch (e) { setErr(onlineError(e)); } finally { setBusy(false); }
  };

  const linked = students.filter((s) => s.onlineId).length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Cloud className="text-mint" /> Online class: {cls?.name}</h2>
            <p className="text-navy-500">Signed in as {staff.email} · join code <b>{cls?.code}</b> · {linked} of {students.length} learners linked online</p>
            <p className="mt-1 flex flex-wrap gap-2">
              <Pill tone={staff.role === 'admin' ? 'coral' : 'sky'}><ShieldCheck size={14} className="mr-1 inline" />{staff.role === 'admin' ? 'Admin' : staff.role === 'observer' ? 'Observer' : 'Teacher'}</Pill>
              {perms.role && <Pill tone={perms.readOnly ? 'sun' : 'mint'}>{perms.readOnly && <Eye size={14} className="mr-1 inline" />}This class: {ROLE_LABEL[perms.role]}</Pill>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={load} disabled={busy || !cls || !perms.canRead}><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Load the class now</Button>
            <Button variant="outline" onClick={recheck} disabled={busy}><ShieldCheck size={18} /> Check my access</Button>
            <Button variant="soft" onClick={() => setPwOpen(!pwOpen)} aria-expanded={pwOpen}><KeyRound size={18} /> Change my password</Button>
          </div>
        </div>
        {pwOpen && (
          <form className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-navy-50 p-3" onSubmit={async (e) => {
            e.preventDefault(); setErr('');
            if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
            setBusy(true);
            try { await setTeacherPassword(pw); setPw(''); setPwOpen(false); toast('Password changed. Use it next time you sign in.', 'good'); }
            catch (x) { setErr(onlineError(x)); } finally { setBusy(false); }
          }}>
            <label className="block flex-1"><span className="font-semibold text-navy">New password (8+ characters)</span>
              <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
            <Button type="submit" disabled={busy || !pw}>Save password</Button>
          </form>
        )}
        {!perms.canRead && <p className="mt-2 font-semibold text-coral-700">You don't have online access to this class. Choose one of your classes below, or ask the admin.</p>}
        {err && <p className="mt-2 font-semibold text-coral-700" role="alert">{err}</p>}
        {last && (
          <p className="mt-3 flex flex-wrap gap-2">
            <Pill tone="mint">{last.total} learners online</Pill>
            <Pill tone="sky">{last.added} new · {last.updated} updated</Pill>
            <Pill tone="sun">{last.writing} new writing</Pill>
            <Pill tone="grey">loaded {niceDate(last.at)}</Pill>
          </p>
        )}
      </Card>
      <Card>
        <h3 className="font-bold text-navy">Your classes online</h3>
        {staff.classes.length === 0
          ? <p className="text-navy-500">No classes yet. Ask the admin to add you to a class.</p>
          : <ul className="mt-2 flex flex-wrap gap-2">
              {staff.classes.map((c) => {
                const local = data.classes.find((x) => x.code === c.code);
                const active = local?.id === data.activeClassId;
                return (
                  <li key={c.code}>
                    <Button size="sm" variant={active ? 'primary' : 'soft'} disabled={!local || active}
                      onClick={() => update((d) => { if (local) d.activeClassId = local.id; })}>
                      {c.name} · {ROLE_LABEL[c.role]}
                    </Button>
                  </li>
                );
              })}
            </ul>}
      </Card>
      <Card className="bg-navy-50">
        <ul className="list-disc space-y-1 pl-5 text-navy">
          <li>Learners join on their own phones with the code <b>{cls?.code}</b> and their name. No passwords.</li>
          <li>Their progress and writing are sent online automatically. Press <b>Load the class now</b> to bring them into this dashboard; then use Writing, Students and Overview as usual.</li>
          <li>Marks saved in <b>Writing</b> are sent back to the learner's phone; the server records which teacher marked each piece. Observers can read but not mark.</li>
          <li>Learners from your class file are linked by name. Check the Students list after the first load.</li>
        </ul>
      </Card>
    </div>
  );
}
