import { KIND_LABEL } from '../components/activities/ActivityView';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Check, Clock, Lock, Play, Target, FileText } from 'lucide-react';
import { MODULES, getModule, reviewAfterModule } from '../data/modules';
import { useLearner } from '../hooks/useLearner';
import { useApp } from '../store';
import { lessonDone, lessonUnlocked, moduleProgress, moduleScore, moduleUnlocked } from '../lib/progress';
import { ModuleIcon } from '../components/ModuleIcon';
import { Ar, Card, EmptyState, LinkButton, PageHeader, Pill, ProgressBar, ProgressRing } from '../components/ui';
import { WordCard } from '../components/activities/media';

export function LessonsPage() {
  const { learner: s, unlockAll, assigned } = useLearner();
  return (
    <div>
      <PageHeader title="Lessons" ar="الدروس" sub={`${MODULES.length} units from A0 to A1, one for each week (Week 1–${MODULES.length}). Each unit has a lesson for every class day, Sunday to Thursday.`} icon={<BookOpen />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m) => {
          const open = moduleUnlocked(s, m, { unlockAll, assigned });
          const p = moduleProgress(s, m);
          return (
            <Link key={m.id} to={`/lessons/${m.id}`} className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${open ? 'border-navy-100' : 'border-dashed border-navy-200'}`}>
              <div className="flex items-center gap-4 p-5" style={{ background: `linear-gradient(135deg, ${m.colour}22, transparent)` }}>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-card" style={{ background: m.colour }}><ModuleIcon name={m.icon} size={28} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-navy-400">Unit {m.n}{m.week && <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-navy-500">Week {m.week}</span>}</div>
                  <h2 className="text-xl font-bold leading-tight text-navy">{m.title}</h2>
                  <Ar className="text-sm">{m.titleAr}</Ar>
                </div>
                {open ? <ProgressRing pct={p.pct} /> : <Lock className="text-navy-300" aria-label="Locked" />}
              </div>
              <div className="flex flex-1 flex-col gap-2 px-5 pb-5">
                <p className="text-navy-500">{m.subtitle}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Pill tone="grey">{m.vocab.length} words</Pill>
                  <Pill tone="grey">{m.lessons.length} lessons</Pill>
                  {p.done === p.total && <Pill tone="mint"><Check size={14} /> Done</Pill>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ModulePage() {
  const { moduleId } = useParams();
  const m = getModule(moduleId ?? '');
  const { isTeacher } = useApp();
  const { learner: s, unlockAll, assigned } = useLearner();
  if (!m) return <EmptyState icon="🤔" title="Unit not found" action={<LinkButton to="/lessons">All units</LinkButton>} />;
  const open = moduleUnlocked(s, m, { unlockAll, assigned });
  const p = moduleProgress(s, m);
  const score = moduleScore(s, m);
  const next = m.lessons.find((l) => !lessonDone(s, l.id) && lessonUnlocked(s, m, l, { unlockAll, assigned }));
  const review = reviewAfterModule(m.n) ?? null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-5 p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${m.colour}2a, #fff 70%)` }}>
          <span className="grid h-20 w-20 place-items-center rounded-3xl text-white shadow-lift" style={{ background: m.colour }}><ModuleIcon name={m.icon} size={40} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-bold text-navy-400">Unit {m.n}{m.week && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-sm text-navy-500">Week {m.week}{m.dates ? ` · ${m.dates}` : ''}</span>}</div>
            <h1 className="text-3xl font-bold text-navy sm:text-4xl">{m.title}</h1>
            <Ar className="text-lg">{m.titleAr}</Ar>
            <p className="mt-1 text-lg text-navy-500">{m.subtitle}</p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex justify-between text-sm font-bold text-navy"><span>Progress</span><span>{p.done}/{p.total}</span></div>
            <ProgressBar pct={p.pct} />
            {score !== null && <p className="mt-2 text-sm text-navy-500">Check yourself: <b>{score}%</b></p>}
            {open && next && <LinkButton to={`/lessons/${m.id}/${next.id}`} variant="accent" className="mt-3 w-full"><Play size={18} /> {p.done ? 'Continue' : 'Start'}</LinkButton>}
          </div>
        </div>
      </section>

      {!open && (
        <Card className="flex items-center gap-4 border-dashed">
          <Lock className="text-navy-300" size={32} />
          <div><b className="text-navy">This unit is locked.</b><p className="text-navy-400">Finish Unit {m.n - 1} first, or ask your teacher to open it.</p></div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr,1.4fr]">
        <Card>
          <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Target className="text-coral" /> In this unit…</h2>
          <Ar>في هذه الوحدة…</Ar>
          <ul className="mt-3 space-y-2">
            {m.goals.map((g, k) => (
              <li key={k} className="flex gap-3 text-lg text-navy">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-700"><Check size={16} /></span>
                <span>{g}<Ar className="text-sm">{m.goalsAr[k]}</Ar></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-bold text-navy">Lessons</h2>
          <ol className="space-y-2">
            {m.lessons.map((l, k) => {
              const done = lessonDone(s, l.id);
              const un = lessonUnlocked(s, m, l, { unlockAll, assigned });
              const r = s.lessons[l.id];
              const inner = (
                <>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold ${done ? 'bg-mint text-white' : un ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check size={20} /> : un ? k + 1 : <Lock size={16} />}</span>
                  <span className="flex-1">
                    <span className="block text-lg font-bold text-navy">{l.title}</span>
                    {l.titleAr && <Ar className="text-sm">{l.titleAr}</Ar>}
                    <span className="flex items-center gap-1 text-sm text-navy-400"><Clock size={14} /> {l.minutes} min · {l.activities.length} activities</span>
                  </span>
                  {r && r.total > 0 && <Pill tone="mint">{r.score}/{r.total}</Pill>}
                </>
              );
              return (
                <li key={l.id}>
                  {un ? (
                    <Link to={`/lessons/${m.id}/${l.id}`} className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-navy-100 px-3 py-2 transition hover:border-coral">{inner}</Link>
                  ) : (
                    <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-3 py-2 opacity-70">{inner}</div>
                  )}
                  {isTeacher && (
                    <div className="ml-14 mt-1 flex flex-wrap gap-1" aria-label={`Open a step of ${l.title}`}>
                      {l.activities.map((a, j) => (
                        <Link key={a.id} to={`/lessons/${m.id}/${l.id}?a=${j + 1}`} title={a.title} className="rounded-lg bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy hover:bg-navy-100">{j + 1}. {KIND_LABEL[a.kind]}</Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            {review && (
              <li><Link to={`/review/${review.id}`} className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-sun bg-sun-50 px-3 py-2 font-bold text-sun-700">🔄 {review.title}</Link></li>
            )}
          </ol>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold text-navy">Words in this unit ({m.vocab.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {m.vocab.slice(0, 6).map((w) => <WordCard key={w} id={w} />)}
        </div>
        <LinkButton to={`/vocabulary?module=${m.n}`} variant="soft" className="mt-4">See all {m.vocab.length} words</LinkButton>
      </section>

      {isTeacher && (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><FileText size={20} /> Sources (teacher only)</h2>
          <p className="text-sm text-navy-400">{m.full ? `Built from the Week ${m.week} materials (A0 – A1 Weekly Materials).` : 'Built from the reusable template using these IATC files.'}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {[...new Map(m.sources.map((x) => [x.label, x])).values()].map((x) => (
              <li key={x.label} className="rounded-xl bg-navy-50 px-3 py-2"><b className="text-navy">{x.label}</b><br /><span className="break-all text-navy-400">{x.doc ?? x.file}</span></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
