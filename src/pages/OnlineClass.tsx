// Teacher Dashboard → Online class: sign in to the online class store and load every learner's
// progress and writing into this device (lib/online.ts, supabase/setup.sql).
import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, Mail } from 'lucide-react';
import { useApp } from '../store';
import { mergeOnlineClass } from '../lib/classes';
import { fetchClass, onlineEnabled, onlineError, teacherEmail, teacherResetPassword, teacherSignIn, teacherSignOut } from '../lib/online';
import { Ar, Button, Card, EmptyState, Pill } from '../components/ui';
import { niceDate } from '../lib/date';

export function OnlineClassPanel() {
  const { data, cls, update, toast, students } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [who, setWho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [last, setLast] = useState<{ at: string; added: number; updated: number; writing: number; total: number } | null>(null);

  useEffect(() => { teacherEmail().then(setWho); }, []);

  if (!onlineEnabled) {
    return (
      <EmptyState icon={<CloudOff />} title="Online class is not set up"
        text="This copy of the app saves on each device only. The online version (GitHub Pages + Supabase) sends every learner's progress and writing to you. See README → Online class." />
    );
  }

  const load = async () => {
    if (!cls) return;
    setBusy(true); setErr('');
    try {
      const { students: rows, writing } = await fetchClass(cls.code);
      const r = mergeOnlineClass(structuredClone(data), cls.id, rows, writing); // counts for the summary
      update((d) => { mergeOnlineClass(d, cls.id, rows, writing); });
      setLast({ at: new Date().toISOString(), ...r, total: rows.length });
      toast(`Loaded ${rows.length} learners and ${writing.length} pieces of writing.`, 'good');
    } catch (e) { setErr(onlineError(e)); } finally { setBusy(false); }
  };

  const signIn = async () => {
    setBusy(true); setErr('');
    try { await teacherSignIn(email, password); setPassword(''); setWho(await teacherEmail()); }
    catch (e) { setErr(onlineError(e)); } finally { setBusy(false); }
  };

  if (!who) {
    return (
      <Card className="max-w-lg">
        <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Cloud /> Online class: teacher sign-in</h2>
        <Ar>تسجيل دخول المعلم</Ar>
        <p className="mt-1 text-navy-500">Sign in to see every learner's progress and writing from their own phones.</p>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
          <label className="block"><span className="font-semibold text-navy">Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
          <label className="block"><span className="font-semibold text-navy">Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
          {err && <p className="font-semibold text-coral-700" role="alert">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !email || !password}><LogIn size={18} /> Sign in</Button>
            <Button type="button" variant="soft" disabled={busy || !email} onClick={async () => {
              setErr('');
              try { await teacherResetPassword(email); toast('Check your email for a link to set your password.', 'good'); } catch (e) { setErr(onlineError(e)); }
            }}><Mail size={18} /> Set / reset my password</Button>
          </div>
        </form>
      </Card>
    );
  }

  const linked = students.filter((s) => s.onlineId).length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Cloud className="text-mint" /> Online class: {cls?.name}</h2>
            <p className="text-navy-500">Signed in as {who} · join code <b>{cls?.code}</b> · {linked} of {students.length} learners linked online</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={load} disabled={busy || !cls}><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Load the class now</Button>
            <Button variant="outline" onClick={async () => { await teacherSignOut(); setWho(null); setLast(null); }}><LogOut size={18} /> Sign out</Button>
          </div>
        </div>
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
      <Card className="bg-navy-50">
        <ul className="list-disc space-y-1 pl-5 text-navy">
          <li>Learners join on their own phones with the code <b>{cls?.code}</b> and their name. No passwords.</li>
          <li>Their progress and writing are sent online automatically. Press <b>Load the class now</b> to bring them into this dashboard; then use Writing, Students and Overview as usual.</li>
          <li>Marks you save in <b>Writing</b> are sent back to the learner's phone.</li>
          <li>Learners from your class file are linked by name. Check the Students list after the first load.</li>
        </ul>
      </Card>
    </div>
  );
}
