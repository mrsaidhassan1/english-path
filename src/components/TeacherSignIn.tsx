// "I'm the teacher" on the online version: a real sign-in (email + password) with staff access.
// Offline copies (no online class store) keep the optional PIN instead (Welcome.tsx).
import { useEffect, useState } from 'react';
import { LogIn, Mail } from 'lucide-react';
import { useApp } from '../store';
import { applyStaffAccess } from '../lib/classes';
import { fetchMyAccess, onlineError, staffSignIn, teacherResetPassword } from '../lib/online';
import type { StaffAccess } from '../types';
import { Ar, Button, Modal } from './ui';

export function TeacherSignIn({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update, toast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const enter = (access: StaffAccess) => {
    update((d) => { applyStaffAccess(d, access); d.session.role = 'teacher'; d.session.studentId = null; });
    onClose();
  };

  // already signed in on this device (e.g. just after setting the password): go straight in
  useEffect(() => {
    if (!open) return;
    setErr('');
    fetchMyAccess().then((a) => { if (a) enter(a); }).catch(() => undefined);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async () => {
    setBusy(true); setErr('');
    try { const a = await staffSignIn(email, password); setPassword(''); enter(a); }
    catch (e) { setErr(onlineError(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Teacher sign-in" labelledBy="teacher-signin">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
        <p className="text-navy-500">For teachers and staff only. Students join with the class code.</p>
        <Ar>لدخول المعلمين فقط. الطلاب ينضمون برمز الفصل.</Ar>
        <label className="block"><span className="font-semibold text-navy">Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
        <label className="block"><span className="font-semibold text-navy">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" /></label>
        {err && <p className="font-semibold text-coral-700" role="alert">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={busy || !email || !password}><LogIn size={18} /> Sign in</Button>
          <Button type="button" variant="soft" disabled={busy || !email} onClick={async () => {
            setErr('');
            try { await teacherResetPassword(email); toast('Check your email for a link to set your password.', 'good'); } catch (e) { setErr(onlineError(e)); }
          }}><Mail size={18} /> Set / reset my password</Button>
        </div>
      </form>
    </Modal>
  );
}
