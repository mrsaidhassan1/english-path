// Classroom Mode: large-screen, teacher-led questions with timers, reveal and a fair student picker.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronLeft, ChevronRight, Eye, Dices, Maximize, Minimize, X, Volume2, Presentation, Timer, Users } from 'lucide-react';
import type { Student } from '../types';
import { MODULES } from '../data/modules';
import { getWord } from '../data/content';
import { wordImage } from '../data/images';
import { optionsWith } from '../data/modules/builder';
import { useApp } from '../store';
import { speak, stopSpeaking } from '../lib/speech';
import { hashString, optionOrder, rngFrom, shuffle } from '../lib/rng';
import { stripMarkup } from '../lib/text';
import { StudentPicker } from '../components/StudentPicker';
import { groupsOf, type Group } from '../lib/groups';
import { Avatar } from '../components/Avatar';
import { LogoMark } from '../components/Logo';
import { Button, Card, PageHeader, Tabs } from '../components/ui';
import { nameOf } from '../lib/classes';

interface ClassQ { q: string; options: string[]; answer: number; say?: string; img?: string; kind: string }
type Set_ = 'quiz' | 'vocab' | 'grammar' | 'mixed';

function buildQuestions(moduleN: number, set: Set_): ClassQ[] {
  const m = MODULES[moduleN - 1];
  const quiz: ClassQ[] = (() => {
    const a = m.lessons.find((l) => l.type === 'quiz')!.activities[0];
    return a.kind === 'mcq' ? a.items.map((x) => ({ q: x.q, options: x.options, answer: x.answer, say: x.say, kind: 'Check yourself' })) : [];
  })();
  const pics = m.vocab.filter((w) => wordImage(w));
  const vocab: ClassQ[] = (pics.length >= 3 ? pics : m.vocab).slice(0, 10).map((w, k) => {
    const word = getWord(w)!;
    const options = optionsWith(word.word, (pics.length >= 3 ? pics : m.vocab).map((x) => getWord(x)!.word), 3, k + moduleN * 13);
    return wordImage(w)
      ? { q: 'What is this?', img: wordImage(w), options, answer: options.indexOf(word.word), kind: 'Vocabulary' }
      : { q: `“${word.meaning}”`, options, answer: options.indexOf(word.word), kind: 'Vocabulary' };
  });
  // grammar gaps from every day of the unit that come with choices
  const grammar: ClassQ[] = m.lessons.flatMap((l) => l.activities).flatMap((a) => (a.kind === 'gap' ? a.items : []))
    .filter((g) => g.options && g.options.some((o) => o.toLowerCase() === g.answer.toLowerCase()))
    .map((g) => ({ q: g.text, options: g.options!, answer: g.options!.findIndex((o) => o.toLowerCase() === g.answer.toLowerCase()), kind: 'Grammar' }));
  const mixed = (qs: ClassQ[]) => qs.map((x) => {
    const order = optionOrder(x.options, x.q + x.options.join('|'));
    return { ...x, options: order.map((k) => x.options[k]), answer: order.indexOf(x.answer) };
  });
  if (set === 'quiz') return mixed(quiz);
  if (set === 'vocab') return mixed(vocab);
  if (set === 'grammar') return mixed(grammar);
  return mixed(shuffle([...quiz.slice(0, 5), ...vocab.slice(0, 4), ...grammar.slice(0, 4)], rngFrom(hashString(`mix${moduleN}`))));
}

const fmt = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;

export default function Classroom() {
  const { students, cls } = useApp();
  const [running, setRunning] = useState(false);
  const [cfg, setCfg] = useState({ module: 1, set: 'mixed' as Set_, mode: 'teacher' as 'teacher' | 'auto', qSecs: 30, lessonMins: 50 });

  if (running) return <ClassroomRun cfg={cfg} onExit={() => setRunning(false)} />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Classroom Mode" ar="وضع الفصل" sub="Big, clear questions for the projector. You control the pace." icon={<Presentation />} />
      <Card className="space-y-5">
        <label className="block">
          <span className="font-bold text-navy">Unit</span>
          <select value={cfg.module} onChange={(e) => setCfg({ ...cfg, module: Number(e.target.value) })} className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-lg text-navy">
            {MODULES.map((m) => <option key={m.n} value={m.n}>Unit {m.n}: {m.title}</option>)}
          </select>
        </label>
        <div>
          <span className="font-bold text-navy">Questions</span>
          <Tabs<Set_> className="mt-1" value={cfg.set} onChange={(v) => setCfg({ ...cfg, set: v })} tabs={[{ id: 'mixed', label: 'Mixed' }, { id: 'quiz', label: 'Check yourself' }, { id: 'vocab', label: 'Vocabulary' }, { id: 'grammar', label: 'Grammar' }]} />
          <p className="mt-1 text-sm text-navy-400">{buildQuestions(cfg.module, cfg.set).length} questions</p>
        </div>
        <div>
          <span className="font-bold text-navy">Mode</span>
          <Tabs className="mt-1" value={cfg.mode} onChange={(v) => setCfg({ ...cfg, mode: v })} tabs={[{ id: 'teacher', label: '👩‍🏫 Teacher-paced' }, { id: 'auto', label: '⏱️ Automatic' }]} />
          <p className="mt-1 text-sm text-navy-400">{cfg.mode === 'auto' ? 'The answer shows when the timer ends, then the next question starts.' : 'You choose when to reveal and move on.'}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-bold text-navy">Question timer</span>
            <select value={cfg.qSecs} onChange={(e) => setCfg({ ...cfg, qSecs: Number(e.target.value) })} className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-lg text-navy">
              {[15, 20, 30, 45, 60, 90].map((s) => <option key={s} value={s}>{s} seconds</option>)}
            </select>
          </label>
          <label className="block"><span className="font-bold text-navy">Lesson timer</span>
            <select value={cfg.lessonMins} onChange={(e) => setCfg({ ...cfg, lessonMins: Number(e.target.value) })} className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-lg text-navy">
              {[10, 15, 20, 30, 45, 50, 60].map((s) => <option key={s} value={s}>{s} minutes</option>)}
            </select>
          </label>
        </div>
        <p className="text-navy-500"><Users size={18} className="inline" /> {students.length} students in {cls?.name ?? 'no class'}</p>
        <Button size="xl" variant="accent" className="w-full" onClick={() => setRunning(true)} disabled={buildQuestions(cfg.module, cfg.set).length === 0}><Play size={28} /> Start class</Button>
      </Card>
    </div>
  );
}

function ClassroomRun({ cfg, onExit }: { cfg: { module: number; set: Set_; mode: 'teacher' | 'auto'; qSecs: number; lessonMins: number }; onExit: () => void }) {
  const { data, updateStudent, students } = useApp();
  const nav = useNavigate();
  const m = MODULES[cfg.module - 1];
  const questions = useMemo(() => buildQuestions(cfg.module, cfg.set), [cfg.module, cfg.set]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [qLeft, setQLeft] = useState(cfg.qSecs);
  const [lessonLeft, setLessonLeft] = useState(cfg.lessonMins * 60);
  const [picker, setPicker] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, { c: number; w: number }>>({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [points, setPoints] = useState<Record<string, number>>({});
  const [full, setFull] = useState(false);
  const [ended, setEnded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const q = questions[i];

  const go = useCallback((n: number) => {
    stopSpeaking();
    setI(Math.max(0, Math.min(questions.length - 1, n)));
    setRevealed(false);
    setChosen(null);
    setQLeft(cfg.qSecs);
  }, [questions.length, cfg.qSecs]);

  // timers
  useEffect(() => {
    if (paused || ended || picker) return;
    const t = setInterval(() => {
      setLessonLeft((l) => l - 1);
      setQLeft((s) => (revealed ? s : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [paused, ended, picker, revealed]);
  useEffect(() => {
    if (qLeft <= 0 && !revealed) setRevealed(true);
  }, [qLeft, revealed]);
  useEffect(() => {
    if (cfg.mode !== 'auto' || !revealed || paused || picker) return;
    const t = setTimeout(() => (i + 1 < questions.length ? go(i + 1) : setEnded(true)), 5000);
    return () => clearTimeout(t);
  }, [cfg.mode, revealed, paused, picker, i, questions.length, go]);
  useEffect(() => {
    if (q?.say && !paused) speak(q.say, { rate: data.settings.speechRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // keyboard: ← → navigate, space reveal, S student, P pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picker || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
      else if (e.key === ' ') { e.preventDefault(); setRevealed(true); }
      else if (e.key.toLowerCase() === 's') setPicker(true);
      else if (e.key.toLowerCase() === 'p') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, i, picker]);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); stopSpeaking(); };
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else root.current?.requestFullscreen?.().catch(() => undefined);
  };

  const onPicked = (s: Student) => {
    setCounts((c) => ({ ...c, [s.id]: (c[s.id] ?? 0) + 1 }));
    updateStudent((x) => { x.participation = { ...x.participation, count: x.participation.count + 1, last: new Date().toISOString() }; }, s.id);
  };
  const onMark = (s: Student, ok: boolean) => {
    setResults((r) => ({ ...r, [s.id]: { c: (r[s.id]?.c ?? 0) + (ok ? 1 : 0), w: (r[s.id]?.w ?? 0) + (ok ? 0 : 1) } }));
    if (ok && s.group) setPoints((p) => ({ ...p, [s.group!]: (p[s.group!] ?? 0) + 1 }));
    updateStudent((x) => { x.participation = { ...x.participation, correct: x.participation.correct + (ok ? 1 : 0), incorrect: x.participation.incorrect + (ok ? 0 : 1) }; }, s.id);
  };
  // Groups: a group turn counts once for the group; a correct group answer gives the team a point.
  const onGroupPicked = (g: Group) => setGroupCounts((c) => ({ ...c, [g.name]: (c[g.name] ?? 0) + 1 }));
  const onGroupMark = (g: Group, ok: boolean) => { if (ok) setPoints((p) => ({ ...p, [g.name]: (p[g.name] ?? 0) + 1 })); };
  const groups = useMemo(() => groupsOf(students), [students]);
  const ordered = groups.length > 1 ? [...groups.flatMap((g) => g.members), ...students.filter((s) => !s.group)] : students;
  const topPoints = Math.max(0, ...Object.values(points));

  const answeredCount = Object.keys(counts).length;
  const qPct = (qLeft / cfg.qSecs) * 100;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div ref={root} className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-navy text-white">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <LogoMark size={40} white />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sky">Unit {m.n}: {m.title}</div>
          <div className="text-lg font-bold">Question {i + 1} / {questions.length} <span className="ml-2 rounded-full bg-white/10 px-2 text-sm">{q?.kind}</span> <span className="ml-1 rounded-full bg-white/10 px-2 text-sm">{cfg.mode === 'auto' ? 'Automatic' : 'Teacher-paced'}</span></div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 font-mono text-xl font-bold" role="timer" aria-label="Lesson time left"><Timer size={20} /> {fmt(lessonLeft)}</div>
        <button onClick={toggleFull} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 hover:bg-white/20" aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize /> : <Maximize />}</button>
        <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); onExit(); }} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 hover:bg-coral" aria-label="Exit classroom mode"><X /></button>
      </div>
      <div className="h-2 bg-white/10"><div className="h-full bg-sky transition-all" style={{ width: `${((i + (revealed ? 1 : 0)) / questions.length) * 100}%` }} /></div>

      {ended ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <h2 className="text-5xl font-bold">Great class! 🎉</h2>
          <p className="text-2xl text-navy-100">{questions.length} questions · {answeredCount} of {students.length} students answered</p>
          {groups.length > 1 && (
            <div className="flex flex-wrap justify-center gap-3" aria-label="Team points">
              {groups.map((g) => (
                <div key={g.name} className={`rounded-3xl px-6 py-3 text-center ${topPoints > 0 && (points[g.name] ?? 0) === topPoints ? 'bg-sun text-navy' : 'bg-white/10'}`}>
                  <div className="text-xl font-bold">{topPoints > 0 && (points[g.name] ?? 0) === topPoints ? '🏆 ' : ''}{g.name}</div>
                  <div className="text-4xl font-bold">{points[g.name] ?? 0}</div>
                  <div className="text-sm">team points</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex max-w-4xl flex-wrap justify-center gap-3">
            {ordered.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-4 text-lg ${counts[s.id] ? 'bg-mint' : 'bg-white/10'}`}><Avatar student={s} size={40} /> {nameOf(s)}{results[s.id] ? ` ✓${results[s.id].c}` : ''}</div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button size="lg" variant="outline" onClick={() => { setEnded(false); go(0); }}>Play again</Button>
            <Button size="lg" variant="accent" onClick={() => { onExit(); nav('/teacher'); }}>Teacher Dashboard</Button>
          </div>
        </div>
      ) : q ? (
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-10">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              {q.img && <div className="mb-2 text-[7rem] leading-none sm:text-[9rem]" aria-hidden="true">{q.img}</div>}
              <p className="text-4xl font-bold leading-tight sm:text-6xl">{stripMarkup(q.q)}</p>
              {q.say && <button onClick={() => speak(q.say!, { rate: data.settings.speechRate })} className="mt-4 flex min-h-[56px] items-center gap-2 rounded-2xl bg-coral px-5 text-xl font-bold"><Volume2 /> Listen</button>}
            </div>
            {/* question timer ring */}
            <div className="relative grid h-28 w-28 shrink-0 place-items-center" role="timer" aria-label={`${qLeft} seconds`}>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,.15)" strokeWidth="9" fill="none" /><circle cx="50" cy="50" r="44" stroke={qLeft <= 5 ? '#FF5151' : '#88E0EF'} strokeWidth="9" fill="none" strokeDasharray={276} strokeDashoffset={276 - (276 * qPct) / 100} strokeLinecap="round" /></svg>
              <span className="text-4xl font-bold">{revealed ? '✓' : qLeft}</span>
            </div>
          </div>
          <div className={`mt-8 grid gap-4 ${q.options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {q.options.map((o, k) => {
              const isAns = k === q.answer;
              const state = revealed ? (isAns ? 'bg-mint text-white ring-4 ring-white' : chosen === k ? 'bg-coral/80 text-white' : 'bg-white/10 text-white/60') : chosen === k ? 'bg-white text-navy ring-4 ring-sky' : 'bg-white text-navy hover:ring-4 hover:ring-sky';
              return (
                <button key={k} onClick={() => { if (!revealed) { setChosen(k); setRevealed(true); } }} className={`flex min-h-[96px] items-center gap-4 rounded-3xl px-6 text-left text-3xl font-bold transition sm:text-4xl ${state}`}>
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl ${revealed && isAns ? 'bg-white text-mint' : 'bg-navy text-white'}`}>{letters[k]}</span>
                  {o}
                </button>
              );
            })}
          </div>
          {revealed && chosen !== null && (
            <p className={`mt-6 text-center text-3xl font-bold ${chosen === q.answer ? 'text-mint-100' : 'text-sun'}`}>{chosen === q.answer ? '✅ Correct! Great job!' : `💪 Good try! The answer is ${letters[q.answer]}: ${q.options[q.answer]}`}</p>
          )}
          {revealed && chosen === null && <p className="mt-6 text-center text-3xl font-bold text-mint-100">The answer is {letters[q.answer]}: {q.options[q.answer]}</p>}
        </div>
      ) : null}

      {/* participation strip */}
      {!ended && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-2" aria-label="Participation tracker">
          <span className="shrink-0 text-sm font-semibold text-sky">Answered {answeredCount}/{students.length}</span>
          {ordered.map((s, k) => (
            <span key={s.id} className="flex shrink-0 items-center gap-2">
              {groups.length > 1 && s.group && s.group !== ordered[k - 1]?.group && (
                <span className={`ml-2 shrink-0 rounded-xl px-2 py-1 text-sm font-bold ${groupCounts[s.group] ? 'bg-mint text-white' : 'bg-white/15 text-white'}`} title={`${s.group}: ${points[s.group] ?? 0} team points`}>
                  {s.group} · {points[s.group] ?? 0}★
                </span>
              )}
              <span className={`relative shrink-0 rounded-full ${counts[s.id] ? 'ring-4 ring-mint' : 'opacity-60'}`} title={`${nameOf(s)}${s.groupRole ? ` (${s.groupRole})` : ''}${counts[s.id] ? ` — ${counts[s.id]}` : ''}`}>
                <Avatar student={s} size={40} />
                {counts[s.id] ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-mint text-xs font-bold">{counts[s.id]}</span> : null}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* controls */}
      {!ended && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-navy-700 px-4 py-3">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="flex min-h-[60px] items-center gap-2 rounded-2xl bg-white/10 px-5 text-xl font-bold disabled:opacity-40"><ChevronLeft /> Previous</button>
          <button onClick={() => setPaused(!paused)} className="flex min-h-[60px] items-center gap-2 rounded-2xl bg-white/10 px-5 text-xl font-bold">{paused ? <><Play /> Resume</> : <><Pause /> Pause</>}</button>
          <button onClick={() => setRevealed(true)} disabled={revealed} className="flex min-h-[60px] items-center gap-2 rounded-2xl bg-sky px-5 text-xl font-bold text-navy disabled:opacity-40"><Eye /> Reveal answer</button>
          <button onClick={() => setPicker(true)} className="flex min-h-[60px] items-center gap-2 rounded-2xl bg-coral px-6 text-xl font-bold"><Dices /> {groups.length > 1 ? 'Student / Group' : 'Student'}</button>
          <button onClick={() => (i + 1 < questions.length ? go(i + 1) : setEnded(true))} className="flex min-h-[60px] items-center gap-2 rounded-2xl bg-white px-5 text-xl font-bold text-navy">{i + 1 < questions.length ? <>Next <ChevronRight /></> : 'Finish'}</button>
        </div>
      )}
      {paused && !ended && <div className="pointer-events-none absolute inset-x-0 top-24 text-center"><span className="rounded-2xl bg-sun px-6 py-2 text-2xl font-bold text-navy">⏸ Paused</span></div>}

      <StudentPicker open={picker} onClose={() => setPicker(false)} students={students} counts={counts} onPicked={onPicked} onMark={onMark}
        groupCounts={groupCounts} onGroupPicked={onGroupPicked} onGroupMark={onGroupMark} />
    </div>
  );
}
