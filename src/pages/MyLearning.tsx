import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Flame, Target, Inbox, Sparkles } from 'lucide-react';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { assignmentRoute, assignmentsFor, recommend, todayMessage } from '../lib/recommend';
import { getWord } from '../data/content';
import { lastNDays, shortDay, niceDate } from '../lib/date';
import { LearningPath, PathLegend } from '../components/LearningPath';
import { Avatar } from '../components/Avatar';
import { Ar, Card, LinkButton, Pill, ProgressBar } from '../components/ui';

const WEEKLY_GOAL = 5;

export default function MyLearning() {
  const { data } = useApp();
  const { learner: s, preview, unlockAll, assigned } = useLearner();
  const recs = recommend(s, data.assignments);
  const msg = todayMessage(s, recs);
  const nextLesson = recs.find((r) => r.kind === 'lesson');
  const tasks = assignmentsFor(s, data.assignments);
  const week = lastNDays(7);
  const lessonsThisWeek = Object.values(s.lessons).filter((l) => week.includes(l.completedAt.slice(0, 10))).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 rounded-[2rem] bg-white p-6 shadow-card lg:grid-cols-[auto,1fr,auto] lg:items-center">
        <Avatar student={s} size={96} ring />
        <div>
          <h1 className="text-3xl font-bold text-navy">{preview ? 'Learner view (teacher preview)' : `Welcome back, ${s.firstName}!`}</h1>
          <p className="mt-1 text-xl text-navy">{msg.en}</p>
          <Ar className="text-lg">{msg.ar}</Ar>
          {nextLesson && (
            <p className="mt-2 text-lg text-navy-500">Your next best lesson: <Link to={nextLesson.to} className="font-bold text-coral-700 underline">{nextLesson.title}</Link></p>
          )}
          {preview && <p className="mt-2"><Pill tone="sun">Preview: progress is not saved</Pill></p>}
        </div>
        {recs[0] && <LinkButton to={recs[0].to} variant="accent" size="lg">Start now <ArrowRight size={20} /></LinkButton>}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-navy"><Sparkles className="text-coral" /> Recommended for you</h2>
          <Ar>مقترح لك</Ar>
          <ul className="mt-3 space-y-3">
            {recs.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link to={r.to} className="flex items-center gap-4 rounded-2xl border-2 border-navy-100 p-4 transition hover:border-coral">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy-50 text-2xl">
                    {{ assignment: '📌', grammar: '🧩', vocab: '🔁', lesson: '📘', review: '🔄', skill: '🎯', speaking: '🎤', exam: '📝' }[r.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-navy">{r.title}</span>
                    <span className="block text-navy-400">{r.reason}</span>
                    <Ar className="text-sm">{r.reasonAr}</Ar>
                  </span>
                  <ArrowRight className="shrink-0 text-navy-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><Target className="text-mint" /> Weekly goal</h2>
            <p className="mt-1 text-navy-500">{Math.min(lessonsThisWeek, WEEKLY_GOAL)} of {WEEKLY_GOAL} lessons this week</p>
            <ProgressBar pct={(lessonsThisWeek / WEEKLY_GOAL) * 100} className="mt-2" label="Weekly goal" />
            <div className="mt-4 flex justify-between">
              {week.map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-sm ${s.activeDays.includes(d) ? 'bg-coral text-white' : 'bg-navy-50 text-navy-300'}`}>{s.activeDays.includes(d) ? <Flame size={16} /> : '·'}</span>
                  <span className="text-xs text-navy-400">{shortDay(d)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 font-semibold text-navy">🔥 {s.streak.count}-day streak{s.streak.count >= 3 ? ' — keep going!' : ''}</p>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><Inbox className="text-sky-600" /> From your teacher</h2>
            {tasks.length === 0 ? <p className="mt-2 text-navy-400">No tasks right now. 🎉</p> : (
              <ul className="mt-2 space-y-2">
                {tasks.map((a) => (
                  <li key={a.id}>
                    <Link to={assignmentRoute(a)} className="flex min-h-[48px] items-center justify-between gap-2 rounded-2xl bg-sky-50 px-4 py-2 font-semibold text-navy hover:bg-sky-100">
                      <span>{a.title}</span>
                      {a.due && <span className="flex items-center gap-1 text-sm text-navy-400"><CalendarCheck size={14} /> {niceDate(a.due)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-navy">🔁 Practise again</h2>
            {s.practiseAgain.length === 0 ? <p className="mt-2 text-navy-400">No difficult words yet.</p> : (
              <>
                <div className="mt-2 flex flex-wrap gap-2">{s.practiseAgain.slice(0, 8).map((w) => <Pill key={w} tone="coral">{getWord(w)?.word ?? w}</Pill>)}</div>
                <LinkButton to="/vocabulary?list=again" variant="soft" size="sm" className="mt-3">Practise these words</LinkButton>
              </>
            )}
          </Card>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-navy">My Learning Path</h2>
            <Ar>مسار تعلّمي</Ar>
          </div>
          <PathLegend />
        </div>
        <LearningPath s={s} recommendedId={undefined} unlockAll={unlockAll} assigned={assigned} />
      </section>
    </div>
  );
}
