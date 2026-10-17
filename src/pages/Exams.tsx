import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, Clock, Headphones, Mic, BookOpen, ArrowLeft, Award, Play } from 'lucide-react';
import type { ExamResult, Skill } from '../types';
import { EXAMS, examTotal, getExam, type Exam, type ExamSection } from '../data/exams';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recordExam } from '../lib/learner';
import { speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { normalise, wordCount } from '../lib/text';
import { marksTotal, WRITING_MAX } from '../data/writingRubric';
import { analyseWriting } from '../data/writingCheck';
import { niceDate } from '../lib/date';
import { Recorder } from '../components/Recorder';
import { AudioButton } from '../components/AudioButton';
import { Ar, Button, Card, EmptyState, LinkButton, PageHeader, Pill, ProgressBar, Tabs } from '../components/ui';
import { ask } from '../components/Confirm';
import { useAssignHere, useCanEdit, useShowAnswers } from '../components/StaffPreview';
import { Eye, EyeOff, KeyRound, Send } from 'lucide-react';

/** The right answer to an exam question, as text. */
const examAnswer = (s: ExamSection, q: ExamSection['items'][number]) => (s.kind === 'typed' ? String(q.answer) : s.kind === 'choice' ? String(q.options?.[q.answer as number] ?? q.answer) : '');

/** Teacher / Admin / Observer: the whole answer key, with the recordings written out. */
function ExamKey({ exam }: { exam: Exam }) {
  return (
    <Card className="mt-4 border-2 border-dashed border-mint bg-mint-50">
      <h2 className="flex items-center gap-2 text-xl font-bold text-mint-700"><KeyRound /> Answer key</h2>
      {exam.sections.map((s) => (
        <section key={s.id} className="mt-4">
          <h3 className="font-bold text-navy">{s.title}</h3>
          {s.audio && <p className="mt-1 text-sm text-navy-500"><b>Recording:</b> {s.audio.map(([who, t]) => `${who}: ${t}`).join(' / ')}</p>}
          {s.kind === 'write' && s.write && <p className="mt-1 text-navy"><b>Model answer ({WRITING_MAX} marks, A1 writing rubric):</b> {s.write.model}</p>}
          {s.kind === 'speak' && <p className="mt-1 text-navy-500">Speaking: 1 mark for answering in a full sentence, 1 for one more idea, per question.</p>}
          {(s.kind === 'choice' || s.kind === 'typed') && (
            <ol className="mt-1 space-y-1">
              {s.items.map((q, k) => (
                <li key={k} className="text-navy">
                  {k + 1}. <span className="text-navy-500">{q.q.replace(/\[|\]/g, '')}</span> → <b className="text-mint-700">{examAnswer(s, q)}</b>
                  {q.say && <span className="block text-sm text-navy-400">{q.say.map(([who, t]) => `${who}: ${t}`).join(' / ')}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </Card>
  );
}


const KIND_META: Record<Exam['kind'], { label: string; icon: ReactNode; tone: string }> = {
  diagnostic: { label: 'Diagnostic', icon: <ClipboardCheck />, tone: 'bg-sun-50 text-sun-700' },
  mock: { label: 'Reading & Writing', icon: <BookOpen />, tone: 'bg-navy-50 text-navy' },
  listening: { label: 'Listening', icon: <Headphones />, tone: 'bg-sky-100 text-sky-800' },
  speaking: { label: 'Speaking', icon: <Mic />, tone: 'bg-coral-50 text-coral-700' },
};

const SKILL_NEXT: Record<Skill, { tip: string; to: string }> = {
  reading: { tip: 'Read the questions first, then find the words in the text.', to: '/exams' },
  writing: { tip: 'Write 25 words: answer all 3 points, capital letters and full stops.', to: '/practice' },
  grammar: { tip: 'Do a grammar booster: am / is / are, plurals and the past.', to: '/practice' },
  vocabulary: { tip: 'Review your words for 5 minutes every day.', to: '/vocabulary?list=due' },
  listening: { tip: 'Listen to dialogues slowly, then at normal speed.', to: '/speaking' },
  speaking: { tip: 'Answer in a full sentence and add one more idea.', to: '/speaking' },
};

// Listening practice exams come five a week (Sun–Thu): show one week at a time.
const examWeek = (e: Exam) => Number(e.id.match(/^lx-w(\d+)d/)?.[1] ?? 0);
const LISTENING_WEEKS = [...new Set(EXAMS.filter((e) => e.kind === 'listening').map(examWeek))].filter(Boolean).sort((a, b) => a - b);
/** Class Week 1 = Sun 6 Sep 2026 (FND 68). */
function currentClassWeek(): number {
  const w = Math.floor((Date.now() - new Date('2026-09-06T00:00:00+03:00').getTime()) / (7 * 864e5)) + 1;
  const fit = LISTENING_WEEKS.filter((x) => x <= w);
  return fit.length ? fit[fit.length - 1] : LISTENING_WEEKS[0] ?? 0;
}

export function ExamsPage() {
  const { learner: s } = useLearner();
  const [week, setWeek] = useState(currentClassWeek);
  const groups: Exam['kind'][] = ['diagnostic', 'mock', 'listening', 'speaking'];
  return (
    <div className="space-y-7">
      <PageHeader title="Exams" ar="الاختبارات" sub="Timed A1 practice in the ELEM exam format. Results by skill." icon={<ClipboardCheck />} />
      {groups.map((g) => (
        <section key={g}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy">{KIND_META[g].icon} {KIND_META[g].label}</h2>
            {g === 'listening' && LISTENING_WEEKS.length > 1 && (
              <label className="flex items-center gap-2 font-semibold text-navy">Week
                <select value={week} onChange={(e) => setWeek(Number(e.target.value))} aria-label="Choose the week"
                  className="min-h-[44px] rounded-2xl border-2 border-navy-100 bg-white px-3 font-bold text-navy">
                  {LISTENING_WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMS.filter((e) => e.kind === g && (g !== 'listening' || examWeek(e) === week)).map((e) => {
              const last = [...s.exams].reverse().find((r) => r.examId === e.id);
              return (
                <Link key={e.id} to={`/exams/${e.id}`} className="flex flex-col gap-2 rounded-3xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-coral">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${KIND_META[e.kind].tone}`}>{KIND_META[e.kind].icon}</span>
                  <span className="text-lg font-bold text-navy">{e.title}</span>
                  <span className="text-navy-500">{e.description}</span>
                  <span className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Pill tone="grey"><Clock size={14} /> {e.minutes} min</Pill>
                    <Pill tone="grey">{examTotal(e)} marks</Pill>
                    {last && <Pill tone="mint">Last: {last.score}/{last.total}</Pill>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {s.exams.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-navy">My results</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-navy-50 text-sm text-navy-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Skills</th></tr></thead>
              <tbody>
                {[...s.exams].reverse().map((r, k) => (
                  <tr key={k} className="border-t border-navy-50">
                    <td className="px-4 py-3 text-navy-500">{niceDate(r.date)}</td>
                    <td className="px-4 py-3 font-semibold text-navy">{r.title}</td>
                    <td className="px-4 py-3 font-bold text-navy">{r.score}/{r.total}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{Object.entries(r.bySkill).map(([k2, v]) => <Pill key={k2} tone="grey">{k2} {v!.score}/{v!.total}</Pill>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

type Answers = Record<string, string | number>;

function PlayTwice({ lines, label = 'Play recording' }: { lines: [string, string][]; label?: string }) {
  const { data } = useApp();
  const [plays, setPlays] = useState(0);
  const [on, setOn] = useState(false);
  if (!ttsSupported()) return <p className="rounded-xl bg-coral-50 px-3 py-2 text-coral-800">🔇 Audio is not available in this browser. Ask your teacher to read the script.</p>;
  return (
    <Button variant={on ? 'accent' : 'soft'} disabled={plays >= 2 && !on} onClick={async () => {
      if (on) { stopSpeaking(); setOn(false); return; }
      setOn(true);
      await speakLines(lines.map(([speaker, text]) => ({ speaker, text })), { rate: data.settings.speechRate });
      setOn(false);
      setPlays((p) => p + 1);
    }}>
      <Play size={18} /> {on ? 'Stop' : `${label} (${2 - plays} left)`}
    </Button>
  );
}

export function ExamRunner() {
  const { examId } = useParams();
  const exam = getExam(examId ?? '');
  const { me, updateStudent, update, isTeacher } = useApp();
  const { learner } = useLearner();
  const [showAnswers, setShowAnswers] = useShowAnswers();
  const canEdit = useCanEdit();
  const assignHere = useAssignHere();
  const [phase, setPhase] = useState<'start' | 'run' | 'result'>('start');
  const [sec, setSec] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const startedAt = useRef(0);

  const submit = () => {
    if (!exam) return;
    stopSpeaking();
    const bySkill: ExamResult['bySkill'] = {};
    let score = 0;
    let writingId: string | undefined;
    for (const s of exam.sections) {
      let sc = 0;
      let tot = 0;
      if (s.kind === 'write') {
        const text = String(answers[`${s.id}`] ?? '');
        // provisional mark with the A1 writing rubric (Content + Organisation + Language, /15); the teacher confirms it
        const estimate = analyseWriting(text, { title: s.write!.title, prompt: s.write!.prompt, bullets: s.write!.bullets, model: s.write!.model }).marks;
        sc = marksTotal(estimate);
        tot = WRITING_MAX;
        if (me && text.trim()) {
          const id = `wr-${Date.now()}`;
          writingId = id;
          update((d) => { d.writing.unshift({ id, studentId: me.id, taskTitle: s.write!.title, prompt: s.write!.prompt, bullets: s.write!.bullets, text, words: wordCount(text), selfCheck: 0, estimate, createdAt: new Date().toISOString(), source: exam.id }); });
        }
      } else if (s.kind === 'speak') {
        s.items.forEach((_, k) => {
          tot += 2;
          if (answers[`${s.id}-${k}-rec`]) sc += 1;
          if (answers[`${s.id}-${k}-more`]) sc += 1;
        });
      } else {
        s.items.forEach((q, k) => {
          tot += 1;
          const a = answers[`${s.id}-${k}`];
          if (s.kind === 'typed' ? normalise(String(a ?? '')) === normalise(String(q.answer)) : a === q.answer) sc += 1;
        });
      }
      const prev = bySkill[s.skill] ?? { score: 0, total: 0 };
      bySkill[s.skill] = { score: prev.score + sc, total: prev.total + tot };
      score += sc;
    }
    const r: ExamResult = { examId: exam.id, title: exam.title, date: new Date().toISOString().slice(0, 10), bySkill, score, total: examTotal(exam), minutes: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)), writingId };
    setResult(r);
    if (me) {
      updateStudent((s) => recordExam(s, r));
      update((d) => d.assignments.forEach((a) => { if (a.kind === 'exam' && a.ref === exam.id && (a.to === 'class' ? a.classId === me.classId : a.to.includes(me.id)) && !a.done.includes(me.id)) a.done.push(me.id); }));
    }
    setPhase('result');
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (phase !== 'run') return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === 'run' && left <= 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);
  useEffect(() => () => stopSpeaking(), []);

  if (!exam) return <EmptyState icon="🤔" title="Exam not found" action={<LinkButton to="/exams">All exams</LinkButton>} />;

  if (phase === 'start') {
    return (
      <div className="mx-auto max-w-2xl">
        <LinkButton to="/exams" variant="outline" size="sm"><ArrowLeft size={18} /> Exams</LinkButton>
        <Card className="mt-4">
          <span className={`grid h-14 w-14 place-items-center rounded-2xl ${KIND_META[exam.kind].tone}`}>{KIND_META[exam.kind].icon}</span>
          <h1 className="mt-3 text-3xl font-bold text-navy">{exam.title}</h1>
          <p className="mt-1 text-lg text-navy-500">{exam.description}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Pill tone="navy"><Clock size={14} /> {exam.minutes} minutes</Pill><Pill tone="navy">{examTotal(exam)} marks</Pill></div>
          <ol className="mt-5 space-y-2">
            {exam.sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl bg-navy-50 px-4 py-3">
                <span className="font-semibold text-navy">{s.title}</span>
                <Pill tone="grey">{s.kind === 'write' ? '15 marks' : `${s.items.length} ${s.kind === 'speak' ? 'questions' : 'marks'}`}</Pill>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-navy-500">Tips: read the instructions · answer every question · check your answers before you finish.</p>
          <Ar>نصائح: اقرأ التعليمات، أجب عن كل الأسئلة، وراجع إجاباتك.</Ar>
          {!me && isTeacher && <p className="mt-3"><Pill tone="sun">Teacher preview — results are not saved</Pill></p>}
          {isTeacher && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant={showAnswers ? 'success' : 'outline'} aria-pressed={showAnswers} onClick={() => setShowAnswers(!showAnswers)}>{showAnswers ? <Eye size={16} /> : <EyeOff size={16} />} {showAnswers ? 'Answer key shown' : 'Show answer key'}</Button>
              {canEdit && <Button size="sm" variant="outline" onClick={() => assignHere('exam', exam.id, `Exam: ${exam.title}`)}><Send size={16} /> Assign</Button>}
            </div>
          )}
          <Button size="xl" variant="accent" className="mt-6 w-full" onClick={() => { startedAt.current = Date.now(); setLeft(exam.minutes * 60); setPhase('run'); }}>Start the exam</Button>
        </Card>
        {isTeacher && showAnswers && <ExamKey exam={exam} />}
      </div>
    );
  }

  if (phase === 'result' && result) return <ExamResultView exam={exam} result={result} answers={answers} firstName={learner.firstName} />;

  const s = exam.sections[sec];
  const answered = exam.sections.reduce((n, x) => n + (x.kind === 'write' ? (answers[x.id] ? 1 : 0) : x.items.filter((_, k) => answers[`${x.id}-${k}`] !== undefined || answers[`${x.id}-${k}-rec`]).length), 0);
  const totalQ = exam.sections.reduce((n, x) => n + (x.kind === 'write' ? 1 : x.items.length), 0);
  const mm = Math.max(0, Math.floor(left / 60));
  const ss = String(Math.max(0, left % 60)).padStart(2, '0');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sticky top-16 z-20 -mx-4 mb-4 border-b border-navy-100 bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex-1 text-lg font-bold text-navy">{exam.title}</h1>
          <span className={`flex items-center gap-1 rounded-xl px-3 py-1 font-mono text-lg font-bold ${left < 120 ? 'bg-coral text-white' : 'bg-navy text-white'}`} role="timer" aria-label={`${mm} minutes ${ss} seconds left`}><Clock size={18} /> {mm}:{ss}</span>
          <Button variant="success" onClick={async () => { if (await ask('Finish the exam now? You can’t change your answers after this.', 'Finish')) submit(); }}>Finish</Button>
        </div>
        <ProgressBar pct={(answered / totalQ) * 100} className="mt-2" label="Answered" />
        <Tabs className="mt-2" value={String(sec)} onChange={(v) => setSec(Number(v))} tabs={exam.sections.map((x, k) => ({ id: String(k), label: x.title.replace(/ — .*$/, '') }))} />
      </div>
      <SectionView s={s} answers={answers} setAnswers={setAnswers} showKey={isTeacher && showAnswers} />
      <div className="mt-5 flex justify-between">
        <Button variant="outline" disabled={sec === 0} onClick={() => setSec(sec - 1)}>Previous part</Button>
        {sec + 1 < exam.sections.length ? <Button onClick={() => { setSec(sec + 1); window.scrollTo({ top: 0 }); }}>Next part</Button> : <Button variant="success" size="lg" onClick={submit}>Finish and see results</Button>}
      </div>
    </div>
  );
}

function SectionView({ s, answers, setAnswers, showKey = false }: { s: ExamSection; answers: Answers; setAnswers: Dispatch<SetStateAction<Answers>>; showKey?: boolean }) {
  const readAloud = useApp().data.settings.examReadAloud;
  const set = (k: string, v: string | number) => setAnswers((a) => ({ ...a, [k]: v }));
  return (
    <Card>
      <h2 className="text-2xl font-bold text-navy">{s.title}</h2>
      <p className="text-lg text-navy">{s.instructions}</p>
      <Ar>{s.instructionsAr}</Ar>
      {s.audio && <div className="mt-3"><PlayTwice lines={s.audio} /></div>}
      {s.text && (
        <article className="mt-4 rounded-3xl border-2 border-sky-200 bg-sky-50 p-5">
          {readAloud && (
            <div className="mb-3 flex items-center gap-2">
              <AudioButton text={s.text.join('\n')} size="sm" label="Listen to the text" />
              <AudioButton text={s.text.join('\n')} slow size="sm" label="Listen slowly" />
              <span className="text-sm text-navy-500">Listen and read</span>
            </div>
          )}
          {s.text.map((p, k) => <p key={k} className="mb-2 text-lg leading-relaxed text-navy">{p}</p>)}
        </article>
      )}
      {s.kind === 'write' && s.write && (
        <div className="mt-4">
          <div className="rounded-2xl bg-navy-50 p-4">
            <b className="text-navy">‘{s.write.title}’</b> — {s.write.prompt}
            <ul className="mt-1">{s.write.bullets.map((b) => <li key={b}>• {b}</li>)}</ul>
          </div>
          <textarea aria-label="Your writing" value={String(answers[s.id] ?? '')} onChange={(e) => set(s.id, e.target.value)} rows={6} className="mt-3 w-full rounded-2xl border-2 border-navy-100 p-4 text-xl text-navy outline-none focus:border-navy" spellCheck={false} />
          <Pill tone={wordCount(String(answers[s.id] ?? '')) >= 20 ? 'mint' : 'sun'}>{wordCount(String(answers[s.id] ?? ''))} words</Pill>
          {showKey && <p className="mt-3 rounded-2xl border-2 border-dashed border-mint bg-mint-50 p-3 text-navy"><b className="text-mint-700">Model answer:</b> {s.write.model}</p>}
        </div>
      )}
      <ol className="mt-4 space-y-4">
        {s.kind !== 'write' && s.items.map((q, k) => {
          const key = `${s.id}-${k}`;
          return (
            <li key={k} className="rounded-2xl border-2 border-navy-100 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy font-bold text-white">{k + 1}</span>
                {q.say && <PlayTwice lines={q.say} label="Play" />}
                <span className="text-lg font-semibold text-navy">
                  {s.kind === 'typed' ? q.q.split(/\[|\]/).map((part, j) => (j === 1 ? <b key={j} className="rounded bg-sun-100 px-1">{part}</b> : part)) : q.q}
                </span>
              </div>
              {s.kind === 'choice' && q.options && (
                <div className={`grid gap-2 ${q.options.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} ${q.options.length === 2 ? 'grid-cols-2' : ''}`}>
                  {q.options.map((o, j) => (
                    <button key={j} onClick={() => set(key, j)} aria-pressed={answers[key] === j}
                      className={`min-h-[52px] rounded-2xl border-2 px-3 text-lg font-semibold transition ${answers[key] === j ? 'border-navy bg-navy text-white' : 'border-navy-100 bg-white text-navy hover:border-navy-300'}`}>{o}</button>
                  ))}
                </div>
              )}
              {showKey && (s.kind === 'choice' || s.kind === 'typed') && <p className="mb-2"><Pill tone="mint">Answer: {examAnswer(s, q)}</Pill></p>}
              {s.kind === 'typed' && (
                <input aria-label={`Answer ${k + 1}`} value={String(answers[key] ?? '')} onChange={(e) => set(key, e.target.value)} className="min-h-[52px] w-full rounded-2xl border-2 border-navy-100 px-4 text-xl text-navy outline-none focus:border-navy sm:w-72" autoComplete="off" spellCheck={false} />
              )}
              {s.kind === 'speak' && (
                <div className="space-y-3">
                  <PlayTwice lines={[['Examiner', q.q]]} label="Hear the question" />
                  <Recorder onRecorded={() => set(`${key}-rec`, 1)} label="Record my answer" />
                  <label className="flex min-h-[44px] items-center gap-3 text-lg text-navy"><input type="checkbox" className="h-6 w-6" checked={!!answers[`${key}-rec`]} onChange={(e) => set(`${key}-rec`, e.target.checked ? 1 : 0)} /> I answered in a full sentence.</label>
                  <label className="flex min-h-[44px] items-center gap-3 text-lg text-navy"><input type="checkbox" className="h-6 w-6" checked={!!answers[`${key}-more`]} onChange={(e) => set(`${key}-more`, e.target.checked ? 1 : 0)} /> I added one more idea.</label>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function ExamResultView({ exam, result, answers, firstName }: { exam: Exam; result: ExamResult; answers: Answers; firstName: string }) {
  const pct = Math.round((result.score / Math.max(1, result.total)) * 100);
  const skills = Object.entries(result.bySkill) as [Skill, { score: number; total: number }][];
  const weak = useMemo(() => skills.filter(([, v]) => v.score / Math.max(1, v.total) < 0.6).map(([k]) => k), [skills]);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="text-center">
        <h1 className="text-3xl font-bold text-navy">Well done, {firstName}! You finished.</h1>
        <p className="mt-2 text-5xl font-bold text-navy">{result.score}<span className="text-2xl text-navy-400">/{result.total}</span></p>
        <p className="text-xl text-navy-500">{pct}% · {result.minutes} min</p>
        <Ar>أحسنت! أنهيت الاختبار.</Ar>
        {skills.some(([k]) => k === 'writing') && <p className="mt-2 text-sm text-navy-400">Writing is a provisional mark out of 15 (Content, Organisation, Language). Your teacher will check it.</p>}
        {pct >= 60 && <LinkButton to={`/certificate/exam/${encodeURIComponent(exam.id)}`} variant="primary" className="mt-4"><Award size={18} /> My certificate</LinkButton>}
      </Card>
      <Card>
        <h2 className="mb-3 text-xl font-bold text-navy">Results by skill</h2>
        <ul className="space-y-3">
          {skills.map(([k, v]) => {
            const p = Math.round((v.score / Math.max(1, v.total)) * 100);
            return (
              <li key={k}>
                <div className="mb-1 flex justify-between font-semibold text-navy"><span className="capitalize">{k}</span><span>{v.score}/{v.total} · {p}%</span></div>
                <ProgressBar pct={p} colour={p >= 70 ? 'bg-mint' : p >= 50 ? 'bg-sun' : 'bg-coral'} label={k} />
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 text-xl font-bold text-navy">Your next steps</h2>
        {weak.length === 0 ? <p className="text-lg text-navy">Excellent! Try a harder mock or help a classmate. 🌟</p> : (
          <ul className="space-y-2">
            {weak.map((k) => <li key={k}><Link to={SKILL_NEXT[k].to} className="flex min-h-[48px] items-center gap-3 rounded-2xl bg-sky-50 px-4 py-2 text-lg text-navy hover:bg-sky-100"><b className="capitalize">{k}:</b> {SKILL_NEXT[k].tip}</Link></li>)}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-xl font-bold text-navy">Check your answers</h2>
        {exam.sections.filter((s) => s.kind === 'choice' || s.kind === 'typed').map((s) => (
          <div key={s.id} className="mb-4">
            <h3 className="font-bold text-navy">{s.title}</h3>
            <ol className="mt-1 space-y-1">
              {s.items.map((q, k) => {
                const a = answers[`${s.id}-${k}`];
                const ok = s.kind === 'typed' ? normalise(String(a ?? '')) === normalise(String(q.answer)) : a === q.answer;
                const right = s.kind === 'typed' ? String(q.answer) : q.options?.[q.answer as number];
                const mine = s.kind === 'typed' ? String(a ?? '—') : a === undefined ? '—' : q.options?.[a as number];
                return (
                  <li key={k} className={`rounded-xl px-3 py-2 ${ok ? 'bg-mint-50' : 'bg-coral-50'}`}>
                    <span className="text-navy">{k + 1}. {q.q.replace(/\[|\]/g, '')}</span>{' '}
                    {ok ? <b className="text-mint-700">✓ {right}</b> : <span className="text-coral-800">Your answer: {mine} · <b>Answer: {right}</b></span>}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </Card>
      <div className="flex justify-center gap-3"><LinkButton to="/exams" variant="outline">All exams</LinkButton><LinkButton to="/learning" variant="accent">My Learning</LinkButton></div>
    </div>
  );
}
