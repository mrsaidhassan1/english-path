import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BarChart3, Award, Printer, Flame, Mic, Layers, Target, Pencil } from 'lucide-react';
import type { Student } from '../types';
import { MODULES, getModule } from '../data/modules';
import { getExam } from '../data/exams';
import { getWord } from '../data/content';
import { GRAMMAR_KEYS } from '../data/grammarKeys';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { BADGES } from '../lib/learner';
import { countByStatus } from '../lib/srs';
import { currentModule, moduleProgress, moduleScore, skillProfile, speakingConfidence, strengthsAndNeeds } from '../lib/progress';
import { niceDate, today } from '../lib/date';
import { Avatar } from '../components/Avatar';
import { LogoMark, APP_NAME } from '../components/Logo';
import { Ar, Button, Card, EmptyState, LinkButton, PageHeader, Pill, ProgressBar } from '../components/ui';
import { nameOf } from '../lib/classes';
import { canPrint } from '../lib/env';

export const INTERESTS = ['travel', 'work', 'football', 'food', 'family', 'shopping', 'technology', 'daily life'];

export function SkillBars({ s }: { s: Student }) {
  return (
    <ul className="space-y-3">
      {skillProfile(s).map(({ skill, pct }) => (
        <li key={skill}>
          <div className="mb-1 flex justify-between font-semibold text-navy"><span className="capitalize">{skill}</span><span>{pct === null ? '—' : `${pct}%`}</span></div>
          <ProgressBar pct={pct ?? 0} colour={pct === null ? 'bg-navy-100' : pct >= 70 ? 'bg-mint' : pct >= 50 ? 'bg-sun' : 'bg-coral'} label={skill} />
        </li>
      ))}
    </ul>
  );
}

export function earnedCertificates(s: Student) {
  const mods = MODULES.filter((m) => (moduleScore(s, m) ?? 0) >= 80).map((m) => ({ kind: 'module' as const, id: String(m.n), title: `Unit ${m.n}: ${m.title}` }));
  const seen = new Set<string>();
  const exams = s.exams.filter((r) => r.score / Math.max(1, r.total) >= 0.6 && !seen.has(r.examId) && seen.add(r.examId)).map((r) => ({ kind: 'exam' as const, id: r.examId, title: r.title }));
  return [...mods, ...exams];
}

export function ProgressPage() {
  const { me, updateStudent } = useApp();
  const { learner: s, preview } = useLearner();
  const [editGoal, setEditGoal] = useState(false);
  const [goal, setGoal] = useState(s.goal);
  const m = currentModule(s);
  const words = countByStatus(s);
  const conf = speakingConfidence(s);
  const { strengths, needs } = strengthsAndNeeds(s);
  const certs = earnedCertificates(s);

  return (
    <div className="space-y-6">
      <PageHeader title="My Progress" ar="تقدّمي" icon={<BarChart3 />} />
      <Card className="grid gap-5 md:grid-cols-[auto,1fr]">
        <Avatar student={s} size={120} ring />
        <div>
          <h2 className="text-3xl font-bold text-navy">{nameOf(s)}</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <Pill tone="navy">CEFR {s.level}</Pill>
            <Pill tone="sky">Unit {m.n}: {m.title}</Pill>
            <Pill tone="coral"><Flame size={14} /> {s.streak.count}-day streak</Pill>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Target size={18} className="text-coral" />
            {editGoal && me ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); updateStudent((x) => { x.goal = goal.trim() || x.goal; }); setEditGoal(false); }}>
                <input value={goal} onChange={(e) => setGoal(e.target.value)} className="min-h-[44px] flex-1 rounded-xl border-2 border-navy-100 px-3 text-navy" aria-label="My learning goal" autoFocus />
                <Button size="sm">Save</Button>
              </form>
            ) : (
              <>
                <span className="text-lg text-navy"><b>My goal:</b> {s.goal}</span>
                {me && <button onClick={() => setEditGoal(true)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-navy-50" aria-label="Edit my goal"><Pencil size={18} /></button>}
              </>
            )}
          </div>
          <div className="mt-3">
            <span className="font-semibold text-navy">My interests: </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = s.interests.includes(i);
                return (
                  <button key={i} disabled={!me} aria-pressed={on} onClick={() => updateStudent((x) => { x.interests = on ? x.interests.filter((y) => y !== i) : [...x.interests, i]; })}
                    className={`min-h-[44px] rounded-full border-2 px-4 font-semibold capitalize ${on ? 'border-coral bg-coral-50 text-coral-700' : 'border-navy-100 text-navy-400'}`}>{i}</button>
                );
              })}
            </div>
          </div>
          {preview && <p className="mt-3"><Pill tone="sun">Teacher preview</Pill></p>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Skills</h2>
          <SkillBars s={s} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-mint-50 p-3"><b className="text-mint-700">Strengths</b><p className="capitalize text-navy">{strengths.join(', ') || 'Keep going!'}</p></div>
            <div className="rounded-2xl bg-sun-50 p-3"><b className="text-sun-700">Areas to practise</b><p className="capitalize text-navy">{needs.join(', ') || '—'}</p></div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy"><Layers size={20} /> Vocabulary mastery</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['new', 'learning', 'review', 'mastered'] as const).map((k) => <div key={k} className="rounded-2xl bg-navy-50 p-3"><div className="text-sm capitalize text-navy-400">{k}</div><div className="text-2xl font-bold text-navy">{words[k]}</div></div>)}
          </div>
          <h3 className="mt-4 font-bold text-navy">Difficult words</h3>
          <div className="mt-1 flex flex-wrap gap-1">{s.practiseAgain.length ? s.practiseAgain.slice(0, 12).map((w) => <Pill key={w} tone="coral">{getWord(w)?.word ?? w}</Pill>) : <span className="text-navy-400">None yet 🎉</span>}</div>
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy"><Mic size={20} /> Speaking confidence</h2>
          <p className="text-4xl">{conf === null ? '—' : ['😟', '🙁', '😐', '🙂', '😄'][Math.round(conf) - 1]} <span className="text-2xl font-bold text-navy">{conf ?? ''}{conf !== null && '/5'}</span></p>
          <p className="mt-1 text-navy-500">{s.speaking.tasks} speaking tasks · {s.speaking.recordings} recordings</p>
          <h3 className="mt-4 font-bold text-navy">Grammar progress</h3>
          <ul className="mt-2 space-y-2">
            {GRAMMAR_KEYS.filter((g) => s.grammarStats[g.key]).slice(0, 6).map((g) => {
              const v = s.grammarStats[g.key];
              const p = Math.round((v.correct / Math.max(1, v.correct + v.wrong)) * 100);
              return <li key={g.key}><div className="flex justify-between text-sm text-navy"><span>{g.label}</span><span>{p}%</span></div><ProgressBar pct={p} colour={p >= 70 ? 'bg-mint' : 'bg-sun'} label={g.label} /></li>;
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-navy">Units</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((mm) => {
            const p = moduleProgress(s, mm);
            const sc = moduleScore(s, mm);
            return (
              <Link key={mm.id} to={`/lessons/${mm.id}`} className="rounded-2xl border border-navy-100 p-3 hover:border-coral">
                <div className="text-sm font-bold text-navy">{mm.n}. {mm.title}</div>
                <ProgressBar pct={p.pct} className="mt-2" label={mm.title} />
                <div className="mt-1 text-xs text-navy-400">{p.done}/{p.total} lessons{sc !== null && ` · check ${sc}%`}</div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy"><Award size={20} /> Badges</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((b) => {
              const got = s.badges[b.id];
              return (
                <div key={b.id} className={`rounded-2xl border-2 p-3 text-center ${got ? 'border-sun bg-sun-50' : 'border-dashed border-navy-100 opacity-60'}`}>
                  <div className={`text-4xl ${got ? '' : 'grayscale'}`}>{b.icon}</div>
                  <div className="font-bold text-navy">{b.title}</div>
                  <Ar className="text-xs">{b.titleAr}</Ar>
                  <div className="text-xs text-navy-400">{got ? `Earned ${niceDate(got)}` : b.desc}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Recent results</h2>
          {s.exams.length === 0 && Object.keys(s.lessons).length === 0 ? <p className="text-navy-400">No results yet.</p> : (
            <ul className="space-y-2">
              {[...s.exams].reverse().slice(0, 3).map((r, k) => <li key={`e${k}`} className="flex justify-between rounded-xl bg-navy-50 px-3 py-2"><span className="text-navy">📝 {r.title}</span><b className="text-navy">{r.score}/{r.total}</b></li>)}
              {s.log.filter((l) => l.type === 'lesson' && l.total).slice(0, 4).map((l, k) => <li key={`l${k}`} className="flex justify-between rounded-xl bg-navy-50 px-3 py-2"><span className="text-navy">📘 {l.ref}</span><b className="text-navy">{l.score}/{l.total}</b></li>)}
            </ul>
          )}
          <h2 className="mb-2 mt-5 text-lg font-bold text-navy">Certificates</h2>
          {certs.length === 0 ? <p className="text-navy-400">Score 80% in a unit check or 60% in an exam to get a certificate.</p> : (
            <div className="flex flex-wrap gap-2">{certs.map((c) => <LinkButton key={c.kind + c.id} to={`/certificate/${c.kind}/${encodeURIComponent(c.id)}`} variant="soft" size="sm"><Award size={16} /> {c.title}</LinkButton>)}</div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function CertificatePage() {
  const { kind, id } = useParams();
  const [params] = useSearchParams();
  const { data, isTeacher } = useApp();
  const { learner, preview } = useLearner();
  const s = (isTeacher && data.students.find((x) => x.id === params.get('student'))) || learner;
  let what = '';
  let detail = '';
  let earned = false;
  if (kind === 'module') {
    const m = getModule(id ?? '');
    const sc = m ? moduleScore(s, m) : null;
    earned = (sc ?? 0) >= 80;
    if (m) { what = `Unit ${m.n}: ${m.title}`; detail = sc !== null ? `Unit Master · Check yourself score ${sc}%` : 'Unit complete'; }
  } else if (kind === 'exam') {
    const e = getExam(id ?? '');
    const r = [...s.exams].reverse().find((x) => x.examId === id && x.score / Math.max(1, x.total) >= 0.6);
    earned = !!r;
    if (e) { what = e.title; detail = r ? `Score ${r.score}/${r.total}` : ''; }
  }
  if (!what) return <EmptyState icon="🏅" title="Certificate not found" />;
  if (!earned && !preview) return <EmptyState icon="🏅" title="Not yet!" text="Score 80% in the unit check (or 60% in the exam) to get this certificate. You can do it!" action={<LinkButton to="/progress">My Progress</LinkButton>} />;
  const date = niceDate(today());
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">{canPrint && <Button onClick={() => window.print()}><Printer size={18} /> Print / Save as PDF</Button>}</div>
      <section className="print-page relative aspect-[1.414] w-full overflow-hidden rounded-3xl border-[10px] border-navy bg-white p-[5%] text-center shadow-lift print:rounded-none print:shadow-none">
        <div className="absolute inset-3 rounded-2xl border-2 border-coral/60" aria-hidden="true" />
        <div className="relative flex h-full flex-col items-center justify-between">
          <div className="flex flex-col items-center">
            <LogoMark size={86} />
            <div className="mt-2 text-xl font-bold tracking-wide text-navy">{APP_NAME}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.3em] text-coral-700">Certificate of Achievement</div>
            <p className="mt-3 text-lg text-navy-500">This certificate is presented to</p>
            <p className="my-2 flex items-center justify-center gap-3 text-5xl font-bold text-navy"><Avatar student={s} size={64} /> {nameOf(s)}</p>
            <p className="text-lg text-navy-500">for successfully completing</p>
            <p className="mt-1 text-3xl font-bold text-navy">{what}</p>
            {detail && <p className="mt-1 text-lg text-sky-700">{detail}</p>}
          </div>
          <div className="flex w-full items-end justify-between px-[6%] text-navy">
            <div className="text-left"><div className="font-bold">{date}</div><div className="border-t-2 border-navy pt-1 text-sm">Date</div></div>
            <div className="text-4xl" aria-hidden="true">🏅</div>
            <div className="text-right"><div className="h-6" /><div className="border-t-2 border-navy pt-1 text-sm">Teacher</div></div>
          </div>
        </div>
      </section>
    </div>
  );
}
