// Sign-in: choose your class, then your card (learners); join a class with a code; or enter as the teacher.
// Local accounts only (see README → "Adding accounts and cloud storage").
import { TeacherSignIn } from '../components/TeacherSignIn';
import { classInfo, onlineEnabled, onlineError } from '../lib/online';
import { useMemo, useState } from 'react';
import { GraduationCap, Search, Lock, ArrowLeft, KeyRound, Users } from 'lucide-react';
import type { ClassInfo } from '../types';
import { useApp } from '../store';
import { findClassByCode, joinWithCode, nameOf, newClass, studentsIn } from '../lib/classes';
import { LogoMark, APP_NAME, APP_SUBTITLE, APP_TAGLINE, APP_TAGLINE_AR } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { Ar, Button, Modal } from '../components/ui';
import { Monster } from '../components/Monster';

export default function Welcome() {
  const { data, update, replaceAll } = useApp();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<ClassInfo | null>(data.classes.length === 1 ? data.classes[0] : null);
  const [pinOpen, setPinOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [joinErr, setJoinErr] = useState('');

  const list = useMemo(
    () => (picked ? studentsIn(data, picked.id) : []).filter((s) => `${s.firstName} ${s.lastName ?? ''}`.toLowerCase().includes(q.toLowerCase())),
    [data, picked, q],
  );

  const enterTeacher = () => {
    if (data.settings.teacherPin && pin !== data.settings.teacherPin) return setPinErr(true);
    update((d) => { d.session = { role: 'teacher', studentId: null }; });
  };

  const [joining, setJoining] = useState(false);
  const join = async () => {
    const next = structuredClone(data);
    let r = joinWithCode(next, code, fullName);
    // a class this phone has not seen yet (e.g. made in the Staff tab): ask the online class store
    if (!r.student && onlineEnabled && fullName.trim() && !findClassByCode(next, code)) {
      setJoining(true); setJoinErr('');
      try {
        const info = await classInfo(code);
        if (info) {
          next.classes.push({ ...newClass(info.name), code: info.code });
          r = joinWithCode(next, info.code, fullName);
        }
      } catch (e) {
        setJoining(false);
        return setJoinErr(/fetch|network/i.test(String((e as Error)?.message)) ? 'No internet: the class code cannot be checked. Try again when you are online.' : onlineError(e));
      }
      setJoining(false);
    }
    if (r.error || !r.student) return setJoinErr(r.error ?? 'Something went wrong.');
    next.session = { role: 'student', studentId: r.student.id };
    replaceAll(next);
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="relative overflow-hidden bg-navy pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 opacity-20"><Monster seed={77} size={260} /></div>
        <div className="pointer-events-none absolute -bottom-16 left-6 opacity-15"><Monster seed={4242} size={200} /></div>
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
          <div className="rounded-[2rem] bg-white p-4 shadow-lift"><LogoMark size={96} /></div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">{APP_NAME}</h1>
          <p className="mt-1 text-lg font-semibold uppercase tracking-[0.2em] text-sky">{APP_SUBTITLE}</p>
          <p className="mt-3 max-w-xl text-xl text-navy-100">{APP_TAGLINE}</p>
          <p dir="rtl" lang="ar" className="mt-1 font-arabic text-lg text-sky">{APP_TAGLINE_AR}</p>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 pb-16">
        <section className="rounded-3xl bg-white p-5 shadow-lift sm:p-8" aria-labelledby="who">
          {!picked ? (
            <>
              <h2 id="who" className="text-2xl font-bold text-navy">Choose your class</h2>
              <Ar>اختر فصلك</Ar>
              {data.classes.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-navy-50 p-6 text-center text-lg text-navy">No classes yet. Your teacher will add your class.</p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.classes.map((c) => {
                    const st = studentsIn(data, c.id);
                    return (
                      <button key={c.id} onClick={() => { setPicked(c); setQ(''); }}
                        className="flex flex-col items-start gap-2 rounded-3xl border-2 border-navy-100 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card">
                        <span className="flex -space-x-2">{st.slice(0, 5).map((s) => <Avatar key={s.id} student={s} size={36} className="ring-2 ring-white" />)}</span>
                        <span className="text-2xl font-bold text-navy">{c.name}</span>
                        <span className="flex items-center gap-1 text-navy-500"><Users size={16} /> {st.length} learners · {c.level}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  {data.classes.length > 1 && (
                    <button onClick={() => setPicked(null)} className="grid h-11 w-11 place-items-center rounded-2xl bg-navy-50 text-navy hover:bg-navy-100" aria-label="Back to classes"><ArrowLeft /></button>
                  )}
                  <div>
                    <h2 id="who" className="text-2xl font-bold text-navy">{picked.name}: who is learning today?</h2>
                    <Ar>من يتعلم اليوم؟ اختر بطاقتك.</Ar>
                  </div>
                </div>
                <label className="relative w-full sm:w-72">
                  <span className="sr-only">Search your name</span>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" size={20} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your name" className="min-h-[48px] w-full rounded-2xl border-2 border-navy-100 pl-10 pr-3 text-lg outline-none focus:border-navy" />
                </label>
              </div>
              {list.length === 0 ? (
                q ? <p className="rounded-2xl bg-navy-50 p-6 text-center text-lg text-navy">No name found. Try again, or join with the class code below.</p> : (
                  <div className="rounded-2xl bg-sky-50 p-6 text-center">
                    <p className="text-lg font-bold text-navy">First time here? Join your class.</p>
                    <Ar className="text-center">أول مرة؟ انضم إلى فصلك.</Ar>
                    <p className="mt-1 text-navy-500">Your teacher gives you the class code. Then write your name.</p>
                    <Button className="mt-4" size="lg" onClick={() => { setJoinOpen(true); setJoinErr(''); }}><KeyRound size={20} /> Join with the class code</Button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {list.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => update((d) => { d.session = { role: 'student', studentId: s.id }; })}
                      className="group flex flex-col items-center gap-2 rounded-3xl border-2 border-navy-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card focus-visible:border-coral"
                    >
                      <Avatar student={s} size={76} />
                      <span className="text-center text-lg font-bold leading-tight text-navy">{nameOf(s)}</span>
                      <span className="rounded-full bg-navy-50 px-2 text-xs font-bold text-navy">{s.level}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-navy-100 pt-6 sm:flex-row sm:justify-between">
            <Button variant="soft" size="lg" onClick={() => { setJoinOpen(true); setJoinErr(''); }}><KeyRound size={20} /> New here? Join with a class code</Button>
            <Button variant="outline" size="lg" onClick={() => (onlineEnabled ? setSignInOpen(true) : data.settings.teacherPin ? setPinOpen(true) : enterTeacher())}>
              <GraduationCap size={22} /> I’m the teacher
            </Button>
          </div>
          <p className="mt-3 text-center text-sm text-navy-400">Accounts are saved on this device only.</p>
        </section>
      </div>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join a class" labelledBy="join-title">
        <form onSubmit={(e) => { e.preventDefault(); join(); }} className="space-y-3">
          <p className="text-navy-500">Your teacher gives you the class code.</p>
          <Ar>اكتب رمز الفصل من معلمك واسمك.</Ar>
          <label className="block"><span className="font-semibold text-navy">Class code</span>
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setJoinErr(''); }} placeholder="FND68-ABC" autoCapitalize="characters" spellCheck={false}
              className="mt-1 min-h-[52px] w-full rounded-2xl border-2 border-navy-100 px-4 font-mono text-2xl tracking-wider outline-none focus:border-navy" autoFocus />
          </label>
          <label className="block"><span className="font-semibold text-navy">Your name</span>
            <input value={fullName} onChange={(e) => { setFullName(e.target.value); setJoinErr(''); }} placeholder="First name and surname" autoComplete="off"
              className="mt-1 min-h-[52px] w-full rounded-2xl border-2 border-navy-100 px-4 text-xl outline-none focus:border-navy" />
          </label>
          {joinErr && <p className="font-semibold text-coral-700" role="alert">{joinErr}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={joining || !code.trim() || !fullName.trim()}>{joining ? 'Checking the code…' : 'Join and start'}</Button>
        </form>
      </Modal>

      {/* online version: a real teacher sign-in; offline copies: the optional PIN */}
      <TeacherSignIn open={signInOpen} onClose={() => setSignInOpen(false)} />

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Teacher PIN" labelledBy="pin-title">
        <form onSubmit={(e) => { e.preventDefault(); enterTeacher(); }} className="space-y-3">
          <label className="block text-navy" htmlFor="pin">Enter your teacher PIN</label>
          <input id="pin" type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setPinErr(false); }} className="min-h-[52px] w-full rounded-2xl border-2 border-navy-100 px-4 text-2xl tracking-widest outline-none focus:border-navy" autoFocus />
          {pinErr && <p className="font-semibold text-coral-700">That PIN is not right. Try again.</p>}
          <Button type="submit" size="lg" className="w-full"><Lock size={20} /> Enter</Button>
        </form>
      </Modal>
    </div>
  );
}
