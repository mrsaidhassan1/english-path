import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Presentation, Printer, Users, BarChart3, Send, PenLine, Database, Settings as Cog, Download, Upload, Trash2, RotateCcw, Copy, School, Cloud } from 'lucide-react';
import { ClassesPanel } from './Classes';
import { OnlineClassPanel } from './OnlineClass';
import { classPermissions, onlineEnabled, onlineError, saveMarkOnline } from '../lib/online';
import type { Assignment, Skill, WritingSubmission } from '../types';
import { CRITERIA, marksTotal, RUBRIC_SRC, WRITING_MAX, type WritingMarks } from '../data/writingRubric';
import { analyseWriting, GENRE_LABEL, type WritingAnalysis, type WritingIssue } from '../data/writingCheck';
import { SKILLS } from '../types';
import { MODULES, REVIEWS } from '../data/modules';
import { EXAMS } from '../data/exams';
import { IATC, getWord } from '../data/content';
import { GRAMMAR_KEYS, grammarKey } from '../data/grammarKeys';
import { buildContentIndex, type ContentRecord } from '../data/contentIndex';
import { useApp } from '../store';
import { moduleProgress, overallProgress, skillPct, lastExam } from '../lib/progress';
import { recommend } from '../lib/recommend';
import { lastNDays, niceDate, today, addDays } from '../lib/date';
import { demoData, emptyData } from '../lib/demo';
import { exportJson, importJson } from '../lib/storage';
import { Roster } from '../components/Roster';
import { Avatar } from '../components/Avatar';
import { Ar, Button, Card, EmptyState, LinkButton, PageHeader, Pill, ProgressBar, Stat, Tabs } from '../components/ui';
import { nameOf } from '../lib/classes';
import { canDownload, canPrint } from '../lib/env';
import { ask } from '../components/Confirm';

type Tab = 'overview' | 'classes' | 'online' | 'students' | 'assign' | 'writing' | 'content' | 'settings';

export default function Teacher() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'overview';
  const { data, update, cls, students } = useApp();
  const ids = new Set(students.map((s) => s.id));
  const toMark = data.writing.filter((w) => w.teacherScore === undefined && ids.has(w.studentId)).length;
  const shown: Tab = !cls && tab !== 'content' && tab !== 'settings' ? 'classes' : tab;
  return (
    <div>
      <PageHeader title="Teacher Dashboard" ar="لوحة المعلم" sub={cls ? `${cls.name} · ${students.length} students · join code ${cls.code}` : 'No class yet: create or import one'} icon={<LayoutDashboard />}>
        {data.classes.length > 1 && (
          <select value={cls?.id ?? ''} onChange={(e) => update((d) => { d.activeClassId = e.target.value; })} aria-label="Choose class"
            className="min-h-[48px] rounded-2xl border-2 border-navy-100 bg-white px-3 font-bold text-navy print:hidden">
            {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {canPrint && <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer size={18} /> Print report</Button>}
        <LinkButton to="/classroom" variant="accent"><Presentation size={18} /> Launch Classroom Mode</LinkButton>
      </PageHeader>
      <Tabs<Tab> className="mb-6 print:hidden" value={shown} onChange={(t) => setParams({ tab: t })} tabs={[
        { id: 'overview', label: <span className="flex items-center gap-1"><BarChart3 size={16} /> Overview</span> },
        { id: 'classes', label: <span className="flex items-center gap-1"><School size={16} /> Classes ({data.classes.length})</span> },
        ...(onlineEnabled ? [{ id: 'online' as Tab, label: <span className="flex items-center gap-1"><Cloud size={16} /> Online class</span> }] : []),
        { id: 'students', label: <span className="flex items-center gap-1"><Users size={16} /> Students</span> },
        { id: 'assign', label: <span className="flex items-center gap-1"><Send size={16} /> Assign</span> },
        { id: 'writing', label: <span className="flex items-center gap-1"><PenLine size={16} /> Writing {toMark > 0 && <span className="rounded-full bg-coral px-1.5 text-xs text-white">{toMark}</span>}</span> },
        { id: 'content', label: <span className="flex items-center gap-1"><Database size={16} /> Content map</span> },
        { id: 'settings', label: <span className="flex items-center gap-1"><Cog size={16} /> Settings</span> },
      ]} />
      {shown === 'overview' && <Overview />}
      {shown === 'classes' && <ClassesPanel />}
      {shown === 'online' && <OnlineClassPanel />}
      {shown === 'students' && <Roster />}
      {shown === 'assign' && <Assign />}
      {shown === 'writing' && <WritingQueue />}
      {shown === 'content' && <ContentMap />}
      {shown === 'settings' && <SettingsPanel />}
    </div>
  );
}

function Overview() {
  const { data, students } = useApp();
  const st = students;
  const week = lastNDays(7);
  if (st.length === 0) return <EmptyState icon="👥" title="No students yet" text="Add your class in the Students tab." action={<LinkButton to="/teacher?tab=students">Add pupils</LinkButton>} />;
  const avgProgress = Math.round(st.reduce((t, s) => t + overallProgress(s), 0) / st.length);
  const active = st.filter((s) => s.activeDays.some((d) => week.includes(d))).length;
  const exams = st.map(lastExam).filter(Boolean);
  const avgExam = exams.length ? Math.round(exams.reduce((t, e) => t + (e!.score / Math.max(1, e!.total)) * 100, 0) / exams.length) : null;
  const speakers = st.filter((s) => s.speaking.tasks > 0).length;

  const skillAvg = SKILLS.map((k) => {
    const vals = st.map((s) => skillPct(s, k)).filter((v): v is number => v !== null);
    return { k, v: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });
  const grammarErr = GRAMMAR_KEYS.map((g) => ({ g, wrong: st.reduce((t, s) => t + (s.grammarStats[g.key]?.wrong ?? 0), 0), learners: st.filter((s) => (s.grammarStats[g.key]?.wrong ?? 0) >= 2).length }))
    .filter((x) => x.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 6);
  const wordWrong = new Map<string, number>();
  st.forEach((s) => {
    Object.entries(s.vocab).forEach(([w, v]) => v.wrong && wordWrong.set(w, (wordWrong.get(w) ?? 0) + v.wrong));
    s.practiseAgain.forEach((w) => wordWrong.set(w, (wordWrong.get(w) ?? 0) + 1));
  });
  const hardWords = [...wordWrong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const examPerf = EXAMS.map((e) => {
    const rs = st.flatMap((s) => s.exams.filter((r) => r.examId === e.id));
    return { e, n: rs.length, avg: rs.length ? Math.round(rs.reduce((t, r) => t + (r.score / Math.max(1, r.total)) * 100, 0) / rs.length) : null };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Average course progress" value={`${avgProgress}%`} icon={<BarChart3 />} tone="navy" />
        <Stat label="Active this week" value={`${active}/${st.length}`} icon={<Users />} tone="mint" />
        <Stat label="Average last exam" value={avgExam === null ? '—' : `${avgExam}%`} icon={<PenLine />} tone="sky" />
        <Stat label="Speaking participation" value={`${speakers}/${st.length}`} sub="did a speaking task" icon={<Presentation />} tone="coral" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Progress by skill (class average)</h2>
          <ul className="space-y-3">
            {skillAvg.map(({ k, v }) => (
              <li key={k}>
                <div className="mb-1 flex justify-between font-semibold capitalize text-navy"><span>{k}</span><span>{v === null ? '—' : `${v}%`}</span></div>
                <ProgressBar pct={v ?? 0} colour={v === null ? 'bg-navy-100' : v >= 70 ? 'bg-mint' : v >= 50 ? 'bg-sun' : 'bg-coral'} label={k} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Completion rate by unit</h2>
          <ul className="space-y-2">
            {MODULES.map((m) => {
              const done = st.filter((s) => moduleProgress(s, m).done === m.lessons.length).length;
              const started = st.filter((s) => moduleProgress(s, m).done > 0).length;
              return (
                <li key={m.id} className="grid grid-cols-[8rem,1fr,4.5rem] items-center gap-2 text-sm">
                  <span className="truncate font-semibold text-navy">{m.n}. {m.title}</span>
                  <div className="relative h-4 overflow-hidden rounded-full bg-navy-50">
                    <div className="absolute inset-y-0 left-0 bg-sky-300" style={{ width: `${(started / st.length) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-mint" style={{ width: `${(done / st.length) * 100}%` }} />
                  </div>
                  <span className="text-right text-navy-500">{Math.round((done / st.length) * 100)}%</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-navy-400"><span className="inline-block h-2 w-3 bg-mint" /> completed · <span className="inline-block h-2 w-3 bg-sky-300" /> started</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold text-navy">Progress by unit (each student)</h2>
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr><th className="sticky left-0 bg-white px-2 py-2 text-left text-navy-500">Student</th>{MODULES.map((m) => <th key={m.id} className="px-1 py-2 text-navy-500" title={m.title}>M{m.n}</th>)}<th className="px-2 text-navy-500">Total</th></tr></thead>
          <tbody>
            {st.map((s) => (
              <tr key={s.id} className="border-t border-navy-50">
                <td className="sticky left-0 bg-white px-2 py-1.5"><Link to={`/teacher/student/${s.id}`} className="flex items-center gap-2 font-semibold text-navy hover:underline"><Avatar student={s} size={28} /> {nameOf(s)}</Link></td>
                {MODULES.map((m) => {
                  const p = moduleProgress(s, m).pct;
                  return <td key={m.id} className="px-1 py-1.5 text-center"><span className="inline-grid h-8 w-10 place-items-center rounded-lg text-xs font-bold" style={{ background: p === 0 ? '#F1F3F9' : p === 100 ? '#1F9D6B' : `rgba(31,157,107,${0.15 + p / 140})`, color: p >= 60 ? '#fff' : '#161E54' }}>{p ? `${p}` : '·'}</span></td>;
                })}
                <td className="px-2 text-center font-bold text-navy">{overallProgress(s)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-bold text-navy">Common grammar errors</h2>
          <p className="mb-3 text-sm text-navy-400">Total mistakes in lessons and practice.</p>
          {grammarErr.length === 0 ? <p className="text-navy-400">No data yet.</p> : (
            <ul className="space-y-2">
              {grammarErr.map(({ g, wrong, learners }) => (
                <li key={g.key} className="flex items-center gap-3 rounded-2xl bg-navy-50 px-3 py-2">
                  <span className="flex-1"><b className="text-navy">{g.label}</b><span className="block text-sm text-navy-400">{learners} learners with 2+ mistakes</span></span>
                  <Pill tone="coral">{wrong}</Pill>
                  {g.deck && <LinkButton to={`/teacher?tab=assign&kind=grammar&ref=${g.deck}`} variant="soft" size="sm">Assign booster</LinkButton>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-bold text-navy">Difficult vocabulary</h2>
          <p className="mb-3 text-sm text-navy-400">Words most often missed or on “Practise again” lists.</p>
          {hardWords.length === 0 ? <p className="text-navy-400">No data yet.</p> : (
            <div className="flex flex-wrap gap-2">{hardWords.map(([w, n]) => <Pill key={w} tone="coral">{getWord(w)?.word ?? w} · {n}</Pill>)}</div>
          )}
          <h2 className="mb-2 mt-5 text-lg font-bold text-navy">Exam performance</h2>
          {examPerf.length === 0 ? <p className="text-navy-400">No exams taken yet.</p> : (
            <ul className="space-y-2">{examPerf.map(({ e, n, avg }) => <li key={e.id} className="flex justify-between rounded-xl bg-navy-50 px-3 py-2"><span className="text-navy">{e.title} <span className="text-navy-400">({n})</span></span><b className="text-navy">{avg}%</b></li>)}</ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Speaking & participation</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-navy-500"><th className="py-1">Student</th><th>Speaking tasks</th><th>Recordings</th><th>Class answers</th></tr></thead>
            <tbody>{st.map((s) => <tr key={s.id} className="border-t border-navy-50"><td className="py-1.5 font-semibold text-navy">{nameOf(s)}</td><td>{s.speaking.tasks}</td><td>{s.speaking.recordings}</td><td>{s.participation.count} {s.participation.count > 0 && <span className="text-navy-400">({s.participation.correct}✓)</span>}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Learning recommendations</h2>
          <ul className="space-y-2">
            {st.map((s) => {
              const r = recommend(s, data.assignments)[0];
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-navy-50 px-3 py-2">
                  <Avatar student={s} size={34} />
                  <span className="min-w-0 flex-1"><b className="text-navy">{nameOf(s)}</b><span className="block truncate text-sm text-navy-500">{r ? r.title : 'On track'}</span></span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

const KIND_LABELS: Record<Assignment['kind'], string> = { lesson: 'Lesson', module: 'Whole unit', vocab: 'Vocabulary set', review: 'Review lesson', exam: 'Exam', grammar: 'Grammar booster' };

function Assign() {
  const { data, update, toast, cls, students } = useApp();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<Assignment['kind']>((params.get('kind') as Assignment['kind']) ?? 'lesson');
  const [ref, setRef] = useState(params.get('ref') ?? '');
  const [to, setTo] = useState<'class' | string[]>('class');
  const [due, setDue] = useState(addDays(today(), 3));

  const options: { value: string; label: string }[] = useMemo(() => {
    switch (kind) {
      case 'lesson': return MODULES.flatMap((m) => m.lessons.map((l) => ({ value: l.id, label: `M${m.n} ${m.title} — ${l.title}` })));
      case 'module': return MODULES.map((m) => ({ value: m.id, label: `Unit ${m.n}: ${m.title}` }));
      case 'vocab': return [...new Set(IATC.vocab.map((v) => v.topic))].map((t) => ({ value: t, label: t }));
      case 'review': return REVIEWS.map((r) => ({ value: r.id, label: r.title }));
      case 'exam': return EXAMS.map((e) => ({ value: e.id, label: e.title }));
      case 'grammar': return IATC.grammar.map((g) => ({ value: g.id, label: `A1 Grammar ${g.num}: ${g.title}` }));
    }
  }, [kind]);
  const current = ref && options.some((o) => o.value === ref) ? ref : options[0]?.value ?? '';

  const save = () => {
    const label = options.find((o) => o.value === current)?.label ?? current;
    if (!cls) return;
    update((d) => { d.assignments.unshift({ id: `as-${Date.now()}`, classId: cls.id, kind, ref: current, title: `${KIND_LABELS[kind]}: ${label}`, to, due, createdAt: new Date().toISOString(), done: [] }); });
    toast('Task assigned. Students see it on My Learning.', 'good');
  };
  const sel = 'mt-1 block min-h-[48px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-navy';
  const classTasks = data.assignments.filter((a) => a.classId === cls?.id);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,1.2fr]">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-navy">New task</h2>
        <label className="block"><span className="font-semibold text-navy">Type</span>
          <select className={sel} value={kind} onChange={(e) => { setKind(e.target.value as Assignment['kind']); setRef(''); }}>{Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="block"><span className="font-semibold text-navy">What</span>
          <select className={sel} value={current} onChange={(e) => setRef(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </label>
        <fieldset>
          <legend className="font-semibold text-navy">For</legend>
          <div className="mt-1 flex gap-2">
            <Button variant={to === 'class' ? 'primary' : 'outline'} size="sm" onClick={() => setTo('class')}>Whole class</Button>
            <Button variant={to !== 'class' ? 'primary' : 'outline'} size="sm" onClick={() => setTo([])}>Choose students</Button>
          </div>
          {to !== 'class' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {students.map((s) => {
                const on = to.includes(s.id);
                return <button key={s.id} onClick={() => setTo(on ? to.filter((x) => x !== s.id) : [...to, s.id])} aria-pressed={on} className={`flex min-h-[44px] items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 font-semibold ${on ? 'border-coral bg-coral-50 text-coral-700' : 'border-navy-100 text-navy'}`}><Avatar student={s} size={30} /> {nameOf(s)}</button>;
              })}
            </div>
          )}
        </fieldset>
        <label className="block"><span className="font-semibold text-navy">Due date</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={sel} /></label>
        <Button size="lg" className="w-full" onClick={save} disabled={!current || (to !== 'class' && to.length === 0)}><Send size={18} /> Assign</Button>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-bold text-navy">Assigned tasks</h2>
        {classTasks.length === 0 ? <p className="text-navy-400">Nothing assigned yet.</p> : (
          <ul className="space-y-2">
            {classTasks.map((a) => {
              const n = a.to === 'class' ? students.length : a.to.length;
              return (
                <li key={a.id} className="rounded-2xl border border-navy-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><b className="text-navy">{a.title}</b><div className="text-sm text-navy-400">{a.to === 'class' ? 'Whole class' : a.to.map((id) => data.students.find((s) => s.id === id)).filter(Boolean).map((s) => nameOf(s!)).join(', ')}{a.due && ` · due ${niceDate(a.due)}`}</div></div>
                    <button onClick={() => update((d) => { d.assignments = d.assignments.filter((x) => x.id !== a.id); })} className="grid h-11 w-11 place-items-center rounded-xl text-navy-400 hover:bg-coral-50 hover:text-coral-700" aria-label="Remove task"><Trash2 size={18} /></button>
                  </div>
                  <ProgressBar pct={(a.done.length / Math.max(1, n)) * 100} className="mt-2" label="Done" />
                  <div className="mt-1 text-xs text-navy-400">{a.done.length}/{n} done</div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// Marking with the A1 writing rubric (A1 Exam / A1 Writing Exam / "A1 writing rubric.pdf"):
// Content, Organisation and Language, 0–5 each, total /15. The automatic estimate is pre-selected; the teacher decides.
function WritingQueue() {
  const { data, cls, update, updateStudent, students, toast } = useApp();
  // observers (online) read the writing and the app's analysis but cannot mark
  const viewOnly = onlineEnabled && classPermissions(data.session.staff, cls?.code).readOnly;
  const inClass = new Set(students.map((s) => s.id));
  const items = data.writing.filter((w) => inClass.has(w.studentId));
  const [marks, setMarks] = useState<Record<string, WritingMarks>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  if (items.length === 0) return <EmptyState icon="✏️" title="No writing yet" text="Student writing from lessons, practice and exams appears here." />;

  const analysisCache = new Map<string, WritingAnalysis>();
  const analysisOf = (w: WritingSubmission) => {
    let a = analysisCache.get(w.id);
    if (!a) { a = analyseWriting(w.text, { title: w.taskTitle, prompt: w.prompt, bullets: w.bullets }); analysisCache.set(w.id, a); }
    return a;
  };
  const suggestion = (w: WritingSubmission): WritingMarks => w.marks ?? analysisOf(w).marks;
  const save = (w: WritingSubmission) => {
    const m = marks[w.id] ?? suggestion(w);
    const total = marksTotal(m);
    const prev = w.marks ? marksTotal(w.marks) : undefined;
    const note = notes[w.id] ?? w.teacherNote ?? '';
    update((d) => { const x = d.writing.find((y) => y.id === w.id); if (x) { x.marks = m; x.teacherScore = total; x.teacherNote = note; } });
    // writing that came from a learner's phone: send the mark back online
    if (w.online) saveMarkOnline(w.id, m, total, note).catch((e) => toast(`Mark saved here, but not online: ${onlineError(e)}`, 'warn'));
    updateStudent((s) => {
      const st = s.skillStats.writing ?? { correct: 0, total: 0 };
      const exam = s.exams.find((r) => r.writingId === w.id);
      if (exam) {
        // replace the provisional exam mark with the teacher's mark (the /15 total was already counted)
        const ws = exam.bySkill.writing ?? { score: 0, total: WRITING_MAX };
        const delta = total - ws.score;
        exam.bySkill.writing = { score: total, total: ws.total };
        exam.score += delta;
        s.skillStats.writing = { correct: st.correct + delta, total: st.total };
      } else if (prev !== undefined) {
        s.skillStats.writing = { correct: st.correct + total - prev, total: st.total }; // changed mark
      } else if (w.teacherScore !== undefined) {
        s.skillStats.writing = { correct: st.correct + total - w.teacherScore, total: st.total + WRITING_MAX - 5 }; // old /5 mark → /15
      } else {
        s.skillStats.writing = { correct: st.correct + total, total: st.total + WRITING_MAX };
      }
    }, w.studentId);
    setEditing((e) => ({ ...e, [w.id]: false }));
  };

  return (
    <div className="space-y-4">
      {viewOnly && <Card className="bg-sun-100"><p className="font-semibold text-navy">You are an observer in this class: you can read the writing and marks, but not change them.</p></Card>}
      <Card className="bg-navy-50">
        <p className="text-navy"><b>A1 writing rubric, /15:</b> Content 0–5 · Organisation 0–5 · Language 0–5. The app suggests a mark (shown selected); check it and change any band before you save. Weekly tasks are checked against their New Headway Plus Beginner unit: linking words only once the book has used them (and → Unit 1, but → 3, because → 7, so → 8), what he / she / it / they refer to, the kind of writing (postcard, place, routine …) and the unit’s language. Tasks that do not match a unit get a general A1 check.</p>
        <p className="mt-1 text-sm text-navy-400">Source: {RUBRIC_SRC.label} — {RUBRIC_SRC.file}</p>
      </Card>
      {items.map((w) => {
        const s = data.students.find((x) => x.id === w.studentId);
        const m = marks[w.id] ?? suggestion(w);
        const open = !viewOnly && (w.teacherScore === undefined || editing[w.id]);
        const oldScale = w.teacherScore !== undefined && !w.marks;
        const a = analysisOf(w);
        return (
          <Card key={w.id}>
            <div className="flex flex-wrap items-start gap-3">
              {s && <Avatar student={s} size={44} />}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-navy">{s ? nameOf(s) : 'Removed student'} · ‘{w.taskTitle}’</div>
                <div className="text-sm text-navy-400">{niceDate(w.createdAt)} · {w.words} words · {w.source}{w.selfCheck ? ` · self-check ${w.selfCheck}/5` : ''}</div>
              </div>
              {w.teacherScore !== undefined
                ? <Pill tone="mint">Marked: {w.teacherScore}/{oldScale ? 5 : WRITING_MAX}{w.marks ? ` (C${w.marks.content} O${w.marks.organisation} L${w.marks.language})` : ''}</Pill>
                : <Pill tone="sun">To mark</Pill>}
            </div>
            <p className="mt-2 text-sm text-navy-500">{w.prompt} {w.bullets.length > 0 && `(${w.bullets.join(' · ')})`}</p>
            <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-navy-50 p-4 text-lg text-navy"><Highlighted text={w.text} issues={a.issues} /></p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {a.bullets.map((b) => <Pill key={b.text} tone={b.covered ? 'mint' : 'coral'}>{b.covered ? '✔' : '✘'} {b.text}</Pill>)}
              <Pill tone="sky">{a.unit ? `Headway Unit ${a.unit}` : 'General check (no unit match)'} · {GENRE_LABEL[a.genre]}</Pill>
              <Pill tone="grey">{a.words} words · {a.sentences} sentences</Pill>
              {a.references.unclear.length > 0 && <Pill tone="sun">Unclear: {a.references.unclear.map((r) => `“${r.word}”`).join(', ')}</Pill>}
              {a.offTopic && <Pill tone="coral">Mostly off the task</Pill>}
              {a.timeMismatch && <Pill tone="sun">{a.timeMismatch === 'past-for-future' ? 'Past instead of future' : 'No past verbs'}</Pill>}
            </div>
            {open ? (
              <div className="mt-3 space-y-3">
                {a.issues.some((i) => i.kind !== 'punctuation') && (
                  <ul className="space-y-0.5 text-sm text-navy">
                    {a.issues.filter((i) => i.kind === 'grammar').map((i) => <li key={i.text}><mark className="rounded bg-coral-100 px-1">{i.text}</mark>{i.fix && <> → <b>{i.fix}</b></>} <span className="text-navy-400">({i.why})</span></li>)}
                    {a.issues.some((i) => i.kind === 'spelling') && <li>Spelling to check: {a.issues.filter((i) => i.kind === 'spelling').map((i) => <mark key={i.text} className="mr-1 rounded bg-sun-100 px-1">{i.text}</mark>)}</li>}
                  </ul>
                )}
                {CRITERIA.map((c) => (
                  <div key={c.key} className="rounded-2xl border-2 border-navy-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="w-32 text-navy">{c.label}</b>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${c.label} band`}>
                        {[0, 1, 2, 3, 4, 5].map((b) => (
                          <button key={b} type="button" role="radio" aria-checked={m[c.key] === b}
                            onClick={() => setMarks((ms) => ({ ...ms, [w.id]: { ...(ms[w.id] ?? suggestion(w)), [c.key]: b } }))}
                            className={`grid h-11 w-11 place-items-center rounded-xl border-2 text-lg font-bold ${m[c.key] === b ? 'border-navy bg-navy text-white' : 'border-navy-100 bg-white text-navy hover:border-navy-300'}`}>{b}</button>
                        ))}
                      </div>
                      {!w.marks && <span className="text-xs text-navy-400">suggested {suggestion(w)[c.key]}</span>}
                    </div>
                    <p className="mt-1 text-sm text-navy-500">Band {m[c.key]}: {c.bands[m[c.key] as 0 | 1 | 2 | 3 | 4 | 5]}</p>
                    {!w.marks && a.reasons[c.key].length > 0 && <p className="mt-0.5 text-sm text-navy-400">Why the app suggests {a.marks[c.key]}: {a.reasons[c.key].join(' ')}</p>}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <input value={notes[w.id] ?? w.teacherNote ?? ''} onChange={(e) => setNotes({ ...notes, [w.id]: e.target.value })} placeholder="Short, kind feedback (optional)" className="min-h-[44px] min-w-0 flex-1 rounded-xl border-2 border-navy-100 px-3" aria-label="Feedback" />
                  <Button type="button" variant="soft" size="sm" onClick={() => setNotes({ ...notes, [w.id]: a.comment })}>Use suggested comment</Button>
                </div>
                <Button variant="success" onClick={() => save(w)}>Save mark: {marksTotal(m)}/{WRITING_MAX}</Button>
              </div>
            ) : viewOnly ? null : (
              <Button className="mt-3" variant="soft" size="sm" onClick={() => setEditing((e) => ({ ...e, [w.id]: true }))}>{oldScale ? 'Re-mark with the /15 rubric' : 'Change mark'}</Button>
            )}
            {w.teacherNote && !open && <p className="mt-2 text-navy">💬 {w.teacherNote}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function ContentMap() {
  const all = useMemo(() => buildContentIndex(), []);
  const [type, setType] = useState('all');
  const [mod, setMod] = useState('all');
  const [skill, setSkill] = useState<'all' | Skill>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const types = [...new Set(all.map((r) => r.type))];
  const rows = all.filter((r: ContentRecord) => (type === 'all' || r.type === type) && (mod === 'all' || String(r.module) === mod) && (skill === 'all' || r.skill === skill) && (!q || `${r.title} ${r.topic} ${r.src.label}`.toLowerCase().includes(q.toLowerCase())));
  const PER = 50;
  const counts = Object.entries(IATC.counts);
  const sel = 'min-h-[44px] rounded-xl border-2 border-navy-100 bg-white px-3 text-navy';
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-navy">Imported IATC English resources</h2>
        <p className="text-navy-500">Imported on {IATC.generatedAt} by <code>scripts/import_iatc_content.py</code> from the IATC English <code>tools/*/content</code> sources (the files that build the FND 68 word lists, grammar decks, readings, conversations, listening and mocks). The teacher’s personal name was removed from {IATC.report.nameReplacements} places.</p>
        <div className="mt-3 flex flex-wrap gap-2">{counts.map(([k, v]) => <Pill key={k} tone="navy">{k}: {v}</Pill>)}</div>
        {IATC.report.skipped.length > 0 && <p className="mt-3 text-sm text-navy-500">Skipped for cultural-sensitivity rules: {IATC.report.skipped.map((s) => `${s.item} (${s.reason})`).join('; ')}.</p>}
        <p className="mt-2 text-sm text-navy-400">Not imported: scanned coursebook PDFs (copyright) and Word/PowerPoint files that have no structured source. Original app dialogues are marked “Original”.</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search title, topic or source" className="min-h-[44px] flex-1 rounded-xl border-2 border-navy-100 px-3" aria-label="Search content" />
        <select className={sel} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} aria-label="Type"><option value="all">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select className={sel} value={mod} onChange={(e) => { setMod(e.target.value); setPage(0); }} aria-label="Unit"><option value="all">All units</option>{MODULES.map((m) => <option key={m.n} value={m.n}>Unit {m.n}</option>)}</select>
        <select className={sel} value={skill} onChange={(e) => { setSkill(e.target.value as 'all' | Skill); setPage(0); }} aria-label="Skill"><option value="all">All skills</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-navy-50 text-navy-500"><tr>{['Type', 'Title', 'CEFR', 'Topic', 'Grammar', 'Vocab theme', 'Skill', 'Unit', 'Status', 'Source'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.slice(page * PER, page * PER + PER).map((r) => (
              <tr key={r.id} className="border-t border-navy-50 align-top">
                <td className="px-3 py-2"><Pill tone="grey">{r.type}</Pill></td>
                <td className="px-3 py-2 font-semibold text-navy">{r.title}</td>
                <td className="px-3 py-2">{r.cefr}</td>
                <td className="px-3 py-2 text-navy-500">{r.topic}</td>
                <td className="px-3 py-2 text-navy-500">{grammarKey(r.grammar)?.label ?? r.grammar}</td>
                <td className="px-3 py-2 text-navy-500">{r.vocabTheme}</td>
                <td className="px-3 py-2 capitalize">{r.skill}</td>
                <td className="px-3 py-2">{r.module}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="max-w-[320px] px-3 py-2 text-xs text-navy-500"><b className="text-navy">{r.src.label}</b><br /><span className="break-all">{r.src.file}{r.src.at ? ` › ${r.src.at}` : ''}</span>{r.src.doc && <><br /><span className="break-all text-navy-400">Doc: {r.src.doc}</span></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-navy">{rows.length} items · page {page + 1}/{Math.max(1, Math.ceil(rows.length / PER))}</span>
        <Button variant="outline" size="sm" disabled={(page + 1) * PER >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { data, update, replaceAll, toast, saveError, cls, students } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState(data.settings.teacherPin);
  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sh-a1-english-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copySummary = async () => {
    const lines = students.map((s) => `${nameOf(s)} (${s.level}) — course ${overallProgress(s)}%, streak ${s.streak.count}, last exam ${lastExam(s) ? `${lastExam(s)!.score}/${lastExam(s)!.total}` : '—'}`);
    try { await navigator.clipboard.writeText(`${cls?.name ?? ''}\n${lines.join('\n')}`); toast('Class summary copied.', 'good'); } catch { toast('Copy is not available here.', 'warn'); }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-navy">App settings</h2>
        <p className="text-sm text-navy-400">Class names, join codes and class files are in the Classes tab.</p>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-6 w-6" checked={data.settings.unlockAll} onChange={(e) => update((d) => { d.settings.unlockAll = e.target.checked; })} /> <span className="text-navy">Unlock all units for students</span></label>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-6 w-6" checked={data.settings.examReadAloud} onChange={(e) => update((d) => { d.settings.examReadAloud = e.target.checked; })} /> <span className="text-navy">Listen buttons on exam reading texts <span className="block text-sm text-navy-400">Helps weaker readers. Switch off for real exam conditions (the ELEM exam is read silently).</span></span></label>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-6 w-6" checked={data.settings.arabic} onChange={(e) => update((d) => { d.settings.arabic = e.target.checked; })} /> <span className="text-navy">Arabic support on <Ar className="inline">الدعم بالعربية</Ar></span></label>
        <label className="block"><span className="font-semibold text-navy">Normal audio speed: {data.settings.speechRate.toFixed(2)}</span>
          <input type="range" min={0.6} max={1.1} step={0.05} value={data.settings.speechRate} onChange={(e) => update((d) => { d.settings.speechRate = Number(e.target.value); })} className="mt-1 w-full" />
        </label>
        <form onSubmit={(e) => { e.preventDefault(); update((d) => { d.settings.teacherPin = pin.trim(); }); toast(pin ? 'Teacher PIN saved.' : 'Teacher PIN removed.', 'good'); }}>
          <label className="block"><span className="font-semibold text-navy">Teacher PIN (optional)</span>
            <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-3" />
          </label>
          <p className="mt-1 text-xs text-navy-400">Stops students opening the teacher area on a shared device. It is not real security.</p>
          <Button className="mt-2" size="sm">Save PIN</Button>
        </form>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Data on this device</h2>
        {saveError && <p className="rounded-xl bg-coral-50 p-3 font-semibold text-coral-800">{saveError}</p>}
        <p className="text-navy-500">Everything is saved in this browser only (localStorage). Download a backup to move it to another device.</p>
        <div className="flex flex-wrap gap-2">
          {canDownload && <Button variant="outline" onClick={download}><Download size={18} /> Download backup</Button>}
          <Button variant="outline" onClick={() => file.current?.click()}><Upload size={18} /> Restore backup</Button>
          <Button variant="outline" onClick={copySummary}><Copy size={18} /> Copy class summary</Button>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { replaceAll(importJson(await f.text())); toast('Backup restored.', 'good'); } catch (err) { toast(err instanceof Error ? err.message : 'Could not read the file.', 'warn'); }
            e.target.value = '';
          }} />
        </div>
        <hr className="border-navy-100" />
        <h3 className="font-bold text-navy">Demo and class data</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" disabled={!data.classes.some((c) => c.demo)} onClick={async () => { if (await ask('Remove the demo class and its made-up learners? Your real classes stay.', 'Remove', true)) update((d) => { const demoClasses = new Set(d.classes.filter((c) => c.demo).map((c) => c.id)); const gone = new Set(d.students.filter((x) => x.demo || demoClasses.has(x.classId)).map((x) => x.id)); d.students = d.students.filter((x) => !gone.has(x.id)); d.writing = d.writing.filter((w) => !gone.has(w.studentId)); d.assignments = d.assignments.filter((a) => !demoClasses.has(a.classId)); d.classes = d.classes.filter((c) => !c.demo); if (demoClasses.has(d.activeClassId)) d.activeClassId = d.classes[0]?.id ?? ''; }); }}><Trash2 size={18} /> Remove demo class</Button>
          <Button variant="soft" onClick={async () => { if (await ask('Delete ALL classes, learners and results on this device?', 'Delete everything', true)) replaceAll({ ...emptyData(), session: { role: 'teacher', studentId: null } }); }}><RotateCcw size={18} /> Delete everything</Button>
          <Button variant="soft" onClick={async () => { if (await ask('Reset to the demo class? This replaces all data on this device.', 'Reset', true)) replaceAll({ ...demoData(), session: { role: 'teacher', studentId: null } }); }}><RotateCcw size={18} /> Reset demo class</Button>
        </div>
        <p className="text-xs text-navy-400">The app is built so secure accounts and cloud storage can be added later (see README: “Adding accounts and cloud storage”).</p>
      </Card>
    </div>
  );
}

/** The student's text with the words the app flagged (grammar in coral, spelling in yellow). */
function Highlighted({ text, issues }: { text: string; issues: WritingIssue[] }) {
  const marks = issues.filter((i) => i.text && i.kind !== 'punctuation').map((i) => ({ t: i.text, spelling: i.kind === 'spelling' }));
  if (!marks.length) return <>{text}</>;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${marks.map((m) => (m.spelling ? `\\b${esc(m.t)}\\b` : esc(m.t))).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, k) => {
        const hit = marks.find((m) => m.t.toLowerCase() === part.toLowerCase());
        return hit ? <mark key={k} className={`rounded px-0.5 ${hit.spelling ? 'bg-sun-100' : 'bg-coral-100'}`} title={hit.spelling ? 'Check the spelling' : 'Grammar'}>{part}</mark> : <span key={k}>{part}</span>;
      })}
    </>
  );
}
