// Teacher Dashboard → Staff (Admin only, online version): add teachers, give them classes and roles,
// suspend or remove them, give a new temporary password, and create classes.
// New logins get a temporary password shown once to the Admin (the free email service cannot reach
// other teachers); the teacher changes it in Online class → Change my password.
import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, PauseCircle, PlayCircle, Plus, RefreshCw, School, Trash2, UserPlus, Users } from 'lucide-react';
import { useApp } from '../store';
import { applyStaffAccess, makeCode } from '../lib/classes';
import {
  classStaffSet, createOnlineClass, fetchMyAccess, onlineClasses, onlineError, staffCreate, staffList, staffRemove, staffResetPassword, staffSet,
  type OnlineClassRow, type StaffMember,
} from '../lib/online';
import type { StaffRole } from '../types';
import { ask } from '../components/Confirm';
import { Button, Card, EmptyState, Pill } from '../components/ui';
import { niceDate } from '../lib/date';

const ROLE_LABEL: Record<StaffRole, string> = { admin: 'Admin', teacher: 'Teacher', observer: 'Observer (view only)' };
const CLASS_ROLE_LABEL = { owner: 'Class owner', teacher: 'Teacher', observer: 'Observer' } as const;
type ClassRole = keyof typeof CLASS_ROLE_LABEL;
const sel = 'min-h-[44px] rounded-xl border-2 border-navy-100 bg-white px-2 text-navy';
const appUrl = () => (typeof window === 'undefined' ? 'https://mrsaidhassan1.github.io/english-path/' : window.location.origin + window.location.pathname);

/** The message to send a teacher with their sign-in details (the password goes separately if possible). */
export function welcomeMessage(email: string, password: string, classes: string[]): string {
  return [
    'Your English Path teacher account is ready.',
    `1. Open ${appUrl()} and choose “I'm the teacher”.`,
    `2. Sign in with ${email} and this temporary password: ${password}`,
    '3. Then change it: Teacher Dashboard → Online class → Change my password.',
    classes.length ? `Your class${classes.length > 1 ? 'es' : ''}: ${classes.join(', ')}.` : '',
  ].filter(Boolean).join('\n');
}

export function StaffPanel() {
  const { data, update, toast } = useApp();
  const me = data.session.staff;
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [classes, setClasses] = useState<OnlineClassRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [secret, setSecret] = useState<{ email: string; password: string; classes: string[] } | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try { const [s, c] = await Promise.all([staffList(), onlineClasses()]); setStaff(s); setClasses(c); }
    catch (e) { setErr(onlineError(e)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (me?.role !== 'admin') return <EmptyState icon={<Users />} title="Admins only" text="Only an Admin can manage staff." />;

  // run an action, report it, reload the list (and this device's class list)
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setErr('');
    try {
      await fn();
      toast(done, 'good');
      const a = await fetchMyAccess();
      if (a) update((d) => { applyStaffAccess(d, a); });
      await load();
    } catch (e) { setErr(onlineError(e)); setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="bg-navy-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Users /> Staff</h2>
            <p className="text-navy-500">Admins manage everything · Teachers mark their own classes · Observers can read, not change.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={busy}><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Refresh</Button>
        </div>
        {err && <p className="mt-2 font-semibold text-coral-700" role="alert">{err}</p>}
      </Card>

      {secret && <PasswordCard {...secret} onClose={() => setSecret(null)} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <AddTeacher classes={classes} busy={busy} onAdd={(email, role, code, classRole) => act(async () => {
          const r = await staffCreate(email, role, code, classRole);
          if (r.password) setSecret({ email, password: r.password, classes: code ? [classes.find((c) => c.code === code)?.name ?? code] : [] });
          else toast('This login already existed: access added, password unchanged.', 'info');
        }, `${email} added.`)} />
        <NewClass busy={busy} taken={classes.map((c) => c.code)} onCreate={(name, code) => act(() => createOnlineClass(code, name), `Class ${name} created. Join code ${code}.`)} />
      </div>

      <Card>
        <h3 className="mb-3 text-lg font-bold text-navy">Staff members ({staff?.length ?? '…'})</h3>
        {staff === null ? <p className="text-navy-500">Loading…</p> : (
          <ul className="space-y-3">
            {staff.map((m) => (
              <StaffRow key={m.user_id} m={m} self={m.email?.toLowerCase() === me.email.toLowerCase()} classes={classes} busy={busy}
                onRole={(role) => act(() => staffSet(m.user_id, { role }), `${m.email} is now ${ROLE_LABEL[role]}.`)}
                onStatus={async (status) => {
                  if (status === 'suspended' && !(await ask(`Suspend ${m.email}? They keep their classes but cannot see anything until you reactivate them.`, 'Suspend', true))) return;
                  act(() => staffSet(m.user_id, { status }), status === 'active' ? `${m.email} is active again.` : `${m.email} is suspended.`);
                }}
                onRemove={async () => {
                  if (!(await ask(`Remove ${m.email} from the staff? Their classes are taken away and their login can no longer see anything. (The login itself is kept; you can add them again later.)`, 'Remove access', true))) return;
                  act(() => staffRemove(m.user_id), `${m.email} no longer has access.`);
                }}
                onReset={async () => {
                  if (!(await ask(`Give ${m.email} a new temporary password? Their old password stops working.`, 'New password'))) return;
                  act(async () => { const r = await staffResetPassword(m.user_id); setSecret({ email: m.email, password: r.password, classes: m.classes.map((c) => c.name) }); }, 'New temporary password made.');
                }}
                onClass={(code, role) => act(() => classStaffSet(m.user_id, code, role), role ? `Class updated for ${m.email}.` : `${m.email} removed from the class.`)}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PasswordCard({ email, password, classes, onClose }: { email: string; password: string; classes: string[]; onClose: () => void }) {
  const { toast } = useApp();
  const copy = (t: string, what: string) => navigator.clipboard?.writeText(t).then(() => toast(`${what} copied.`, 'good'), () => toast('Copy did not work: select the text instead.', 'warn'));
  return (
    <Card className="border-2 border-sun bg-sun-50">
      <h3 className="flex items-center gap-2 text-lg font-bold text-navy"><KeyRound /> Temporary password for {email}</h3>
      <p className="mt-2 select-all rounded-2xl bg-white px-4 py-3 font-mono text-2xl font-bold tracking-wider text-navy">{password}</p>
      <p className="mt-2 text-navy">It is shown only now. Give it to the teacher (ideally not in the same message as the email), and ask them to change it in Online class → Change my password.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => copy(password, 'Password')}><Copy size={16} /> Copy password</Button>
        <Button size="sm" variant="soft" onClick={() => copy(welcomeMessage(email, password, classes), 'Message')}><Copy size={16} /> Copy a message for the teacher</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Done</Button>
      </div>
    </Card>
  );
}

function AddTeacher({ classes, busy, onAdd }: { classes: OnlineClassRow[]; busy: boolean; onAdd: (email: string, role: StaffRole, code: string, classRole: ClassRole) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('teacher');
  const [code, setCode] = useState('');
  const [classRole, setClassRole] = useState<ClassRole>('owner');
  return (
    <Card>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onAdd(email.trim(), role, code, role === 'observer' ? 'observer' : classRole); setEmail(''); }}>
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy"><UserPlus /> Add a teacher</h3>
        <label className="block"><span className="font-semibold text-navy">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" autoComplete="off" /></label>
        <div className="flex flex-wrap gap-3">
          <label><span className="block font-semibold text-navy">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={sel}>
              {(['teacher', 'observer', 'admin'] as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select></label>
          <label><span className="block font-semibold text-navy">Class</span>
            <select value={code} onChange={(e) => setCode(e.target.value)} className={sel}>
              <option value="">(no class yet)</option>
              {classes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select></label>
          {code && role !== 'observer' && (
            <label><span className="block font-semibold text-navy">In that class</span>
              <select value={classRole} onChange={(e) => setClassRole(e.target.value as ClassRole)} className={sel}>
                {(['owner', 'teacher', 'observer'] as ClassRole[]).map((r) => <option key={r} value={r}>{CLASS_ROLE_LABEL[r]}</option>)}
              </select></label>
          )}
        </div>
        <p className="text-sm text-navy-400">A new login gets a temporary password, shown once. An existing login keeps its password.</p>
        <Button type="submit" disabled={busy || !email}><UserPlus size={18} /> Add teacher</Button>
      </form>
    </Card>
  );
}

function NewClass({ busy, taken, onCreate }: { busy: boolean; taken: string[]; onCreate: (name: string, code: string) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const suggest = (n: string) => { let c = makeCode(n); while (taken.includes(c)) c = makeCode(n); return c; };
  return (
    <Card>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onCreate(name.trim(), (code || suggest(name)).toUpperCase()); setName(''); setCode(''); }}>
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy"><School /> New class</h3>
        <label className="block"><span className="font-semibold text-navy">Class name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setCode(e.target.value.trim() ? suggest(e.target.value) : ''); }} placeholder="e.g. FND 41" className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
        <label className="block"><span className="font-semibold text-navy">Join code (students type this)</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3 font-mono" /></label>
        <p className="text-sm text-navy-400">Then add a teacher to it (left), or give it to an existing teacher below.</p>
        <Button type="submit" disabled={busy || !name.trim()}><Plus size={18} /> Create class</Button>
      </form>
    </Card>
  );
}

function StaffRow({ m, self, classes, busy, onRole, onStatus, onRemove, onReset, onClass }: {
  m: StaffMember; self: boolean; classes: OnlineClassRow[]; busy: boolean;
  onRole: (r: StaffRole) => void; onStatus: (s: 'active' | 'suspended') => void; onRemove: () => void; onReset: () => void; onClass: (code: string, role: ClassRole | null) => void;
}) {
  const [addCode, setAddCode] = useState('');
  const [addRole, setAddRole] = useState<ClassRole>('teacher');
  const free = classes.filter((c) => !m.classes.some((x) => x.code === c.code));
  return (
    <li className={`rounded-2xl border-2 p-3 ${m.status === 'suspended' ? 'border-dashed border-slate-300 bg-slate-50' : 'border-navy-100'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <b className="break-all text-navy">{m.email}</b>
        {self && <Pill tone="sky">you</Pill>}
        <Pill tone={m.role === 'admin' ? 'coral' : m.role === 'observer' ? 'sun' : 'mint'}>{ROLE_LABEL[m.role]}</Pill>
        {m.status === 'suspended' && <Pill tone="grey">Suspended</Pill>}
        <span className="text-sm text-navy-400">{m.last_sign_in_at ? `last signed in ${niceDate(m.last_sign_in_at)}` : 'not signed in yet'}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {m.role === 'admin' && <span className="text-sm text-navy-500">Admins see every class.</span>}
        {m.classes.map((c) => (
          <span key={c.code} className="flex items-center gap-1 rounded-xl bg-navy-50 py-0.5 pl-2 pr-1 text-sm text-navy">
            {c.name} · {CLASS_ROLE_LABEL[c.role]}
            <button type="button" disabled={busy} onClick={() => onClass(c.code, null)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-navy-100" aria-label={`Remove ${m.email} from ${c.name}`}>×</button>
          </span>
        ))}
        {m.role !== 'admin' && free.length > 0 && (
          <span className="flex items-center gap-1">
            <select value={addCode} onChange={(e) => setAddCode(e.target.value)} className={`${sel} min-h-[36px] text-sm`} aria-label="Add to class">
              <option value="">+ class…</option>
              {free.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            {addCode && (
              <>
                <select value={addRole} onChange={(e) => setAddRole(e.target.value as ClassRole)} className={`${sel} min-h-[36px] text-sm`} aria-label="Role in that class">
                  {(['owner', 'teacher', 'observer'] as ClassRole[]).map((r) => <option key={r} value={r}>{CLASS_ROLE_LABEL[r]}</option>)}
                </select>
                <Button size="sm" disabled={busy} onClick={() => { onClass(addCode, m.role === 'observer' ? 'observer' : addRole); setAddCode(''); }}>Add</Button>
              </>
            )}
          </span>
        )}
      </div>
      {!self && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={m.role} disabled={busy} onChange={(e) => onRole(e.target.value as StaffRole)} className={`${sel} min-h-[36px] text-sm`} aria-label={`Role of ${m.email}`}>
            {(['teacher', 'observer', 'admin'] as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          {m.status === 'active'
            ? <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus('suspended')}><PauseCircle size={16} /> Suspend</Button>
            : <Button size="sm" variant="success" disabled={busy} onClick={() => onStatus('active')}><PlayCircle size={16} /> Reactivate</Button>}
          <Button size="sm" variant="soft" disabled={busy} onClick={onReset}><KeyRound size={16} /> New password</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}><Trash2 size={16} /> Remove access</Button>
        </div>
      )}
    </li>
  );
}
