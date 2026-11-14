// A1 Vocabulary Quizzes: Sets 1 to 14, five Lesson quizzes and a Review quiz in each (from the IATC Word quizzes).
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, RefreshCcw, Target } from 'lucide-react';
import data from '../data/generated/vocab-quizzes.json';
import type { Activity, GapItem, McqItem } from '../types';
import { tag } from '../data/modules/builder';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recordAnswer, recordLesson } from '../lib/learner';
import { summaryLine } from '../lib/feedback';
import { ActivityView } from '../components/activities/ActivityView';
import { Ar, Button, Card, Pill, Tabs } from '../components/ui';

interface Section { id: string; type: 'match' | 'mcq' | 'gap'; title: string; titleAr: string; prompt: string; promptAr: string; pairs?: [string, string][]; items?: (McqItem | GapItem)[] }
interface Quiz { id: string; kind: 'lesson' | 'review'; n: number; title: string; titleAr: string; total: number; target: number; sections: Section[] }
interface QuizSet { n: number; unit: string; unitAr: string; quizzes: Quiz[] }
const SETS = (data as unknown as { sets: QuizSet[] }).sets;

const label = (q: Quiz) => (q.kind === 'review' ? 'Review' : `Lesson ${q.n}`);
const ref = (q: Quiz) => `vquiz-${q.id}`;

function activityOf(q: Quiz, s: Section, attempt: number): Activity {
  const base = { id: `${q.id}-${s.id}-${attempt}`, title: `${s.id}. ${s.title}`, prompt: s.prompt, promptAr: s.promptAr, tags: tag(6, 'vocabulary', q.title, undefined, 'revision') };
  if (s.type === 'match') return { ...base, kind: 'match', pairs: s.pairs!, rtlRight: true, leftLabel: 'English', rightLabel: 'عربي' };
  if (s.type === 'mcq') return { ...base, kind: 'mcq', items: s.items as McqItem[] };
  return { ...base, kind: 'gap', items: s.items as GapItem[] };
}

export default function VocabQuizzes() {
  const { me, updateStudent } = useApp();
  const { learner: s } = useLearner();
  const [setId, setSetId] = useState(SETS[0].n);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [scores, setScores] = useState<{ score: number; total: number }[]>([]);
  const done = useRef(false);

  const start = (q: Quiz) => {
    setQuiz(q); setStep(0); setScores([]); setAttempt((n) => n + 1); done.current = false;
    window.scrollTo(0, 0);
  };
  const activity = useMemo(() => (quiz && step < quiz.sections.length ? activityOf(quiz, quiz.sections[step], attempt) : null), [quiz, step, attempt]);

  if (quiz) {
    const finished = step >= quiz.sections.length;
    const score = scores.reduce((a, b) => a + b.score, 0);
    const total = scores.reduce((a, b) => a + b.total, 0);
    if (finished && !done.current) {
      done.current = true;
      if (me) updateStudent((st) => recordLesson(st, ref(quiz), score, total));
    }
    const set = SETS.find((x) => quiz.id.startsWith(`s${String(x.n).padStart(2, '0')}-`))!;
    const line = summaryLine(score, Math.max(1, total));
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setQuiz(null)}><ArrowLeft size={18} /> Quizzes</Button>
          <div>
            <div className="text-sm font-bold text-navy-400">Set {set.n} · {set.unit}</div>
            <h1 className="text-2xl font-bold text-navy">{label(quiz)}: {quiz.title}</h1>
          </div>
          {!finished && <Pill tone="sky">Part {step + 1} of {quiz.sections.length}</Pill>}
        </div>
        {!finished && activity && (
          <Card className="p-5 sm:p-7">
            <ActivityView key={activity.id} activity={activity}
              onAnswer={(a) => { if (me) updateStudent((st) => recordAnswer(st, a)); }}
              onDone={(r) => { setScores((x) => [...x, r]); setStep((n) => n + 1); window.scrollTo(0, 0); }} />
          </Card>
        )}
        {finished && (
          <>
            <Card className="text-center">
              <h2 className="text-4xl font-bold text-navy">{score}/{total}</h2>
              <p className="mt-1 text-xl text-navy">{line.en}</p>
              <Ar>{line.ar}</Ar>
              <p className="mt-2"><Pill tone={score >= quiz.target ? 'mint' : 'sun'}>{score >= quiz.target ? <><Check size={14} /> Target reached</> : `Target: ${quiz.target}/${quiz.total}`}</Pill></p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="accent" onClick={() => start(quiz)}><RefreshCcw size={18} /> Try again</Button>
                <Button variant="outline" onClick={() => setQuiz(null)}>Back to quizzes</Button>
              </div>
            </Card>
            <Card>
              <h2 className="mb-3 text-xl font-bold text-navy">Score for each part</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {quiz.sections.map((x, i) => (
                  <li key={x.id} className="flex items-center justify-between rounded-2xl bg-navy-50 px-4 py-3">
                    <span className="font-semibold text-navy">{x.id}. {x.title}</span>
                    <Pill tone={scores[i] && scores[i].score / scores[i].total >= 0.8 ? 'mint' : 'sun'}>{scores[i]?.score}/{scores[i]?.total}</Pill>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    );
  }

  const set = SETS.find((x) => x.n === setId)!;
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-2xl font-bold text-navy">A1 Vocabulary Quizzes</h2>
        <p className="text-lg text-navy-500">Each set has five lesson quizzes and a review quiz. Opposites, plurals and past verbs are in every quiz.</p>
        <p className="mt-1 flex items-center gap-1.5 text-navy-500"><Target size={16} /> Target: 80% in each lesson quiz, 30 of 40 in the review.</p>
      </Card>
      <Tabs<string> value={String(setId)} onChange={(v) => setSetId(Number(v))} tabs={SETS.map((x) => ({ id: String(x.n), label: `Set ${x.n}` }))} />
      <Card>
        <h3 className="text-xl font-bold text-navy">{set.unit}</h3>
        <Ar>{set.unitAr}</Ar>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {set.quizzes.map((q) => {
          const res = s.lessons[ref(q)];
          return (
            <button key={q.id} type="button" onClick={() => start(q)}
              className="flex flex-col gap-1.5 rounded-3xl border border-navy-100 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-coral">
              <span className="text-sm font-bold text-navy-400">{label(q)}</span>
              <span className="text-lg font-bold text-navy">{q.title}</span>
              <Ar className="text-sm">{q.titleAr}</Ar>
              <span className="mt-auto flex gap-2 pt-2">
                <Pill tone="grey">{q.total} questions</Pill>
                {res && <Pill tone={res.score >= q.target ? 'mint' : 'sun'}>{res.score}/{res.total}</Pill>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
