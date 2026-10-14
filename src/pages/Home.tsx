import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Layers, Mic, ClipboardCheck, Presentation, LayoutDashboard, Users, Sparkles } from 'lucide-react';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recommend, todayMessage } from '../lib/recommend';
import { currentModule, moduleProgress, overallProgress } from '../lib/progress';
import { LogoMark, APP_NAME, APP_SUBTITLE } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { Ar, Card, LinkButton, ProgressRing } from '../components/ui';
import { Monster } from '../components/Monster';
import { ModuleIcon } from '../components/ModuleIcon';

function Tile({ to, icon, title, ar, text, tone }: { to: string; icon: ReactNode; title: string; ar: string; text: string; tone: string }) {
  return (
    <Link to={to} className="group flex flex-col gap-3 rounded-3xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone}`}>{icon}</span>
      <span>
        <span className="block text-xl font-bold text-navy">{title}</span>
        <Ar>{ar}</Ar>
        <span className="mt-1 block text-navy-400">{text}</span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1 font-bold text-coral-700">Open <ArrowRight size={18} className="transition group-hover:translate-x-1" /></span>
    </Link>
  );
}

export default function Home() {
  const { data, isTeacher, cls, students } = useApp();
  const { learner, preview } = useLearner();
  const recs = recommend(learner, data.assignments);
  const msg = todayMessage(learner, recs);
  const m = currentModule(learner);
  const mp = moduleProgress(learner, m);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-navy p-6 text-white shadow-lift sm:p-10">
        <div className="pointer-events-none absolute -right-6 -top-8 hidden opacity-90 sm:block"><Monster seed={learner.avatar.seed + 1} size={180} /></div>
        <div className="relative max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-2xl bg-white p-2"><LogoMark size={44} /></span>
            <span className="leading-tight"><span className="block text-lg font-semibold text-sky">{APP_NAME}</span><span className="block text-xs font-semibold uppercase tracking-wider text-navy-100">{APP_SUBTITLE}</span></span>
          </div>
          {preview && isTeacher ? (
            <>
              <h1 className="text-3xl font-bold sm:text-4xl">Welcome, teacher!</h1>
              <p className="mt-2 text-xl text-navy-100">{cls ? `${students.length} learners in ${cls.name}. Open the dashboard or start a class.` : 'Create or import your first class in the Teacher Dashboard.'}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton to="/teacher" variant="accent" size="lg"><LayoutDashboard size={20} /> Teacher Dashboard</LinkButton>
                <LinkButton to="/classroom" variant="outline" size="lg"><Presentation size={20} /> Classroom Mode</LinkButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold sm:text-4xl">Hello, {learner.firstName}! 👋</h1>
              <p className="mt-2 text-xl text-navy-100">{msg.en}</p>
              <Ar className="text-sky-200">{msg.ar}</Ar>
              {recs[0] && (
                <div className="mt-6 rounded-2xl bg-white/10 p-4">
                  <div className="text-sm font-semibold uppercase tracking-wide text-sky">Your next best step</div>
                  <div className="mt-1 text-lg font-bold">{recs[0].title}</div>
                  <LinkButton to={recs[0].to} variant="accent" size="lg" className="mt-3">Start now <ArrowRight size={20} /></LinkButton>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {!preview && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4">
            <Avatar student={learner} size={64} />
            <div><div className="text-sm font-semibold text-navy-400">Level</div><div className="text-2xl font-bold text-navy">{learner.level}</div></div>
          </Card>
          <Card className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-coral-50 text-coral"><Flame size={32} /></span>
            <div><div className="text-sm font-semibold text-navy-400">Streak</div><div className="text-2xl font-bold text-navy">{learner.streak.count} day{learner.streak.count === 1 ? '' : 's'}</div></div>
          </Card>
          <Card className="flex items-center gap-4">
            <ProgressRing pct={overallProgress(learner)} size={64} stroke={7} textClass="text-sm" />
            <div><div className="text-sm font-semibold text-navy-400">Course</div><div className="text-lg font-bold text-navy">Unit {m.n}: {mp.done}/{mp.total}</div></div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile to={`/lessons/${m.id}`} icon={<ModuleIcon name={m.icon} size={28} />} title={`Unit ${m.n}`} ar={m.titleAr} text={m.title} tone="bg-navy text-white" />
        <Tile to="/vocabulary?list=daily" icon={<Layers size={28} />} title="Daily 5 words" ar="خمس كلمات يومياً" text="Five new words. Two minutes." tone="bg-sky-100 text-sky-800" />
        <Tile to="/speaking" icon={<Mic size={28} />} title="Speaking" ar="التحدث" text="Listen, repeat, record." tone="bg-coral-50 text-coral-700" />
        <Tile to="/exams" icon={<ClipboardCheck size={28} />} title="Exam practice" ar="التدريب على الاختبار" text="A1 reading, writing and listening." tone="bg-mint-50 text-mint-700" />
      </div>

      {isTeacher && (
        <Card className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Users size={28} /></span>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-navy">Teacher tools</h2>
            <p className="text-navy-400">Roster, monster avatars, assignments, writing to mark and the IATC content map.</p>
          </div>
          <LinkButton to="/teacher" variant="soft"><Sparkles size={18} /> Open dashboard</LinkButton>
        </Card>
      )}
    </div>
  );
}
