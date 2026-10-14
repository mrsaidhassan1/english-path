// Shown once after the teacher opens the invitation (or password reset) email: choose a password.
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { needsPassword, onlineError, setTeacherPassword } from '../lib/online';
import { Button, Modal } from './ui';

export function SetPasswordGate({ ready }: { ready: Promise<boolean> | null }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { ready?.then((ok) => setOpen(ok && needsPassword())); }, [ready]);
  const save = async () => {
    setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords are different.');
    try { await setTeacherPassword(pw); setDone(true); } catch (e) { setErr(onlineError(e)); }
  };
  return (
    <Modal open={open} onClose={() => setOpen(false)} title={done ? 'Password saved' : 'Choose your teacher password'} labelledBy="setpw">
      {done ? (
        <div className="space-y-3">
          <p className="text-lg text-navy">You are signed in to the online class. Next time, sign in with your email and this password in <b>Teacher Dashboard → Online class</b>.</p>
          <Button onClick={() => setOpen(false)}>OK</Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <p className="text-navy-500">This password is only for you, the teacher. Students never need one.</p>
          <label className="block"><span className="font-semibold text-navy">New password</span>
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
          <label className="block"><span className="font-semibold text-navy">Type it again</span>
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
          {err && <p className="font-semibold text-coral-700" role="alert">{err}</p>}
          <Button type="submit"><KeyRound size={18} /> Save password</Button>
        </form>
      )}
    </Modal>
  );
}
