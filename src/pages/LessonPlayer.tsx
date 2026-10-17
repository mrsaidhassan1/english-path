// Plays a lesson (a list of activities), then shows the lesson or unit completion screen.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, Lock, RotateCcw } from 'lucide-react';
import type { Lesson, Module } from '../types';
import { getLesson, getModule, MODULES } from '../data/modules';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recordAnswer, recordLesson } from '../lib/learner';
import { lessonUnlocked, moduleProgress, reviewUnlocked } from '../lib/progress';
import { recommend } from '../lib/recommend';
import { summaryLine } from '../lib/feedback';
import { countByStatus } from '../lib/srs';
import { ActivityView, type AnswerEvent } from '../components/activities/ActivityView';
import { Ar, Button, Card, EmptyState, LinkButton, Pill, ProgressBar, ProgressRing } from '../components/ui';
import { Monster } from '../components/Monster';
import { AnswerKey } from '../components/activities/AnswerKey';
import { PresentView, PreviewBar, useAssignHere, useCanEdit, useShowAnswers } from '../components/StaffPreview';

export default function LessonPlayer({ review = false }: { review?: boolean }) {
  const params = useParams();
  const lesson = getLesson(review ? params.reviewId ?? '' : params.lessonId ?? '');
  const module = lesson ? getModule(lesson.module) : undefined;
  const { learner, unlockAll, assigned } = useLearner();
  if (!lesson || !module) return <EmptyState icon="🤔" title="Lesson not found" action={<LinkButton to="/lessons">All lessons</LinkButton>} />;
  const reviewIndex = review ? Number(lesson.id.split('-')[1]) - 1 : -1;
  const open = review ? reviewUnlocked(learner, reviewIndex, unlockAll) || assigned.has(lesson.id) : lessonUnlocked(learner, module, lesson, { unlockAll, assigned });
  if (!open) {
    return (
      <EmptyState icon={<Lock />} title="This lesson is locked" text={review ? 'Finish the units before this review first.' : 'Finish the lesson before it first.'}
        action={<LinkButton to={`/lessons/${module.id}`}>Back to Unit {module.n}</LinkButton>} />
    );
  }
  return <Player key={lesson.id} lesson={lesson} module={module} review={review} />;
}

function Player({ lesson, module, review }: { lesson: Lesson; module: Module; review: boolean }) {
  const { me, updateStudent, update, data, isTeacher } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  // teachers can open a lesson at any step (?a=3) and jump between steps without doing them
  const [i, setI] = useState(() => (isTeacher ? Math.min(Math.max(0, Number(params.get('a') ?? 1) - 1 || 0), lesson.activities.length - 1) : 0));
  const [present, setPresent] = useState(false);
  const [showAnswers] = useShowAnswers();
  const canEdit = useCanEdit();
  const assignHere = useAssignHere();
  const jump = (k: number) => { setI(Math.max(0, Math.min(k, lesson.activities.length - 1))); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const [score, setScore] = useState({ s: 0, t: 0 });
  const [finished, setFinished] = useState(false);
  const act = lesson.activities[i];

  const onAnswer = (a: AnswerEvent) => {
    if (me) updateStudent((s) => recordAnswer(s, a));
  };
  const onDone = (r: { score: number; total: number }) => {
    const ns = { s: score.s + r.score, t: score.t + r.total };
    setScore(ns);
    if (i + 1 < lesson.activities.length) {
      setI(i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (me) {
      updateStudent((s) => recordLesson(s, lesson.id, ns.s, ns.t));
      update((d) => {
        for (const a of d.assignments) {
          const hit = a.ref === lesson.id || (a.kind === 'module' && a.ref === module.id && lesson.type === 'quiz') || (a.kind === 'review' && a.ref === lesson.id);
          if (hit && (a.to === 'class' ? a.classId === me.classId : a.to.includes(me.id)) && !a.done.includes(me.id)) a.done.push(me.id);
        }
      });
    }
    setFinished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (finished) return <Complete lesson={lesson} module={module} score={score} review={review} onAgain={() => { setI(0); setScore({ s: 0, t: 0 }); setFinished(false); }} />;

  const back = review ? '/review' : `/lessons/${module.id}`;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => nav(back)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-navy shadow-card hover:bg-navy-50" aria-label="Leave lesson"><ArrowLeft /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-navy-400">{review ? 'Review' : `Unit ${module.n}: ${module.title}`}</div>
          <div className="truncate text-lg font-bold text-navy">{lesson.title}</div>
        </div>
        <span className="text-sm font-bold text-navy-400">{i + 1}/{lesson.activities.length}</span>
      </div>
      {isTeacher && (
        <PreviewBar activities={lesson.activities} index={i} onJump={jump} onPresent={() => setPresent(true)}
          onAssign={canEdit ? () => assignHere(review ? 'review' : 'lesson', lesson.id, `${review ? 'Review lesson' : 'Lesson'}: ${lesson.title}`) : undefined} />
      )}
      <ProgressBar pct={(i / lesson.activities.length) * 100} colour="bg-coral" className="mb-5" label="Lesson progress" />
      {i === 0 && lesson.id.endsWith('-d1') && (
        <div className="mb-5 rounded-3xl bg-sky-50 p-4">
          <b className="text-navy">In this unit…</b>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">{module.goals.map((g) => <li key={g} className="text-navy">✔ {g}</li>)}</ul>
        </div>
      )}
      {!me && isTeacher && <p className="mb-4"><Pill tone="sun">Teacher preview — answers are not saved</Pill></p>}
      <Card className="p-5 sm:p-7">
        <ActivityView key={act.id} activity={act} onAnswer={onAnswer} onDone={onDone} />
      </Card>
      {isTeacher && showAnswers && <div className="mt-4"><AnswerKey activity={act} /></div>}
      {present && (
        <PresentView activity={act} index={i} total={lesson.activities.length} onJump={jump} onClose={() => setPresent(false)}>
          <ActivityView key={`${act.id}-class`} activity={act} onAnswer={() => undefined} onDone={() => (i + 1 < lesson.activities.length ? jump(i + 1) : setPresent(false))} />
        </PresentView>
      )}
      {data.session.role === 'teacher' && act.src && <p className="mt-2 text-xs text-navy-400">Source: {act.src.label} — {act.src.doc ?? act.src.file}</p>}
    </div>
  );
}

function Complete({ lesson, module, score, review, onAgain }: { lesson: Lesson; module: Module; score: { s: number; t: number }; review: boolean; onAgain: () => void }) {
  const { data } = useApp();
  const { learner } = useLearner();
  const pct = score.t ? Math.round((score.s / score.t) * 100) : 100;
  const line = summaryLine(score.s, score.t || 1);
  const moduleDone = lesson.type === 'quiz' && !review;
  const prog = moduleProgress(learner, module);
  const idx = module.lessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = module.lessons[idx + 1];
  const nextModule = MODULES[module.n];
  const rec = useMemo(() => recommend(learner, data.assignments)[0], [learner, data.assignments]);
  const words = countByStatus(learner, module.vocab);

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="relative overflow-hidden p-6 text-center sm:p-10">
        <div className="mx-auto mb-3 w-fit animate-pop"><Monster seed={learner.avatar.seed} size={120} /></div>
        <h1 className="text-3xl font-bold text-navy sm:text-4xl">{moduleDone ? `Unit ${module.n} complete! 🎉` : review ? 'Review complete! 🎉' : 'Lesson complete! 🎉'}</h1>
        <p className="mt-2 text-xl text-navy">{line.en}</p>
        <Ar className="text-lg">{line.ar}</Ar>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-navy-50 p-4">
            <div className="text-sm font-bold text-navy-400">Score</div>
            <div className="text-3xl font-bold text-navy">{score.t ? `${score.s}/${score.t}` : '✓'}</div>
            {score.t > 0 && <div className="text-navy-500">{pct}%</div>}
          </div>
          <div className="rounded-3xl bg-sky-50 p-4">
            <div className="text-sm font-bold text-navy-400">Words learned</div>
            <div className="text-3xl font-bold text-navy">{words.learning + words.review + words.mastered}<span className="text-lg text-navy-400">/{module.vocab.length}</span></div>
          </div>
          <div className="flex flex-col items-center rounded-3xl bg-mint-50 p-4">
            <div className="text-sm font-bold text-navy-400">Unit progress</div>
            <ProgressRing pct={prog.pct} size={60} stroke={7} textClass="text-sm" />
          </div>
        </div>

        {moduleDone && pct >= 80 && (
          <div className="mt-6 rounded-3xl border-2 border-sun bg-sun-50 p-4">
            <p className="flex items-center justify-center gap-2 text-lg font-bold text-sun-700"><Award /> You are a Unit Master!</p>
            <LinkButton to={`/certificate/module/${module.n}`} variant="primary" className="mt-3">See my certificate</LinkButton>
          </div>
        )}

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={onAgain}><RotateCcw size={18} /> Try again</Button>
          {!review && nextLesson && <LinkButton to={`/lessons/${module.id}/${nextLesson.id}`} variant="accent" size="lg">Next: {nextLesson.title} <ArrowRight size={20} /></LinkButton>}
          {!review && !nextLesson && nextModule && <LinkButton to={`/lessons/${nextModule.id}`} variant="accent" size="lg">Next unit: {nextModule.title} <ArrowRight size={20} /></LinkButton>}
          {review && <LinkButton to="/review" variant="accent" size="lg">Back to Review</LinkButton>}
        </div>
        {rec && (
          <p className="mt-5 text-navy-500">Recommended next: <Link to={rec.to} className="font-bold text-coral-700 underline">{rec.title}</Link></p>
        )}
      </Card>
    </div>
  );
}
