import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookText, Check, RefreshCcw, Shuffle, ListChecks, Target } from 'lucide-react';
import type { Activity } from '../types';
import { CHALLENGE_SETS, CHALLENGE_TARGET, PART_RULES, QUESTION_NOTES, completedSentence, toMcq, type ChallengePart, type ChallengeQuestion, type ChallengeSet } from '../data/grammarChallenge';
import { tag } from '../data/modules/builder';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recordAnswer, recordLesson } from '../lib/learner';
import { summaryLine } from '../lib/feedback';
import { shuffle } from '../lib/rng';
import { ActivityView } from '../components/activities/ActivityView';
import { Ar, Button, Card, PageHeader, Pill } from '../components/ui';

interface Item { part: ChallengePart; q: ChallengeQuestion }
interface Run { id: string; ref: string; title: string; titleAr?: string; prompt: string; promptAr: string; set: ChallengeSet; part?: ChallengePart; items: Item[] }
type Stage = 'menu' | 'intro' | 'quiz' | 'done';

const allItems = (set: ChallengeSet): Item[] => set.parts.flatMap((part) => part.questions.map((q) => ({ part, q })));
const partRef = (set: ChallengeSet, part: ChallengePart) => `grammar-${set.id}-part${part.n}`;

export default function GrammarPage() {
  const { me, updateStudent } = useApp();
  const { learner: s } = useLearner();
  const [run, setRun] = useState<Run | null>(null);
  const [stage, setStage] = useState<Stage>('menu');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number; missed: Item[] } | null>(null);
  const answers = useRef<boolean[]>([]);

  const start = (r: Run, intro = false) => {
    answers.current = [];
    setRun(r);
    setResult(null);
    setAttempt((n) => n + 1);
    setStage(intro ? 'intro' : 'quiz');
    window.scrollTo(0, 0);
  };
  const partRun = (set: ChallengeSet, part: ChallengePart): Run => ({
    id: `${set.id}-p${part.n}`, ref: partRef(set, part), title: `Part ${part.n}: ${part.focus}`, titleAr: part.focusAr,
    prompt: part.instruction, promptAr: part.instructionAr, set, part, items: part.questions.map((q) => ({ part, q })),
  });
  const mixedRun = (set: ChallengeSet): Run => ({
    id: `${set.id}-mixed-${Date.now()}`, ref: `grammar-${set.id}-mixed`, title: 'Mixed 20', titleAr: 'عشرون سؤالاً متنوعاً',
    prompt: 'Choose the correct answer.', promptAr: 'اختر الإجابة الصحيحة.', set, items: shuffle(allItems(set)).slice(0, 20),
  });
  const fullRun = (set: ChallengeSet): Run => ({
    id: `${set.id}-all`, ref: `grammar-${set.id}-all`, title: 'All 100 questions', titleAr: 'الأسئلة المئة كلها',
    prompt: 'Choose the correct answer.', promptAr: 'اختر الإجابة الصحيحة.', set, items: allItems(set),
  });
  const missedRun = (r: Run, missed: Item[]): Run => ({
    id: `${r.set.id}-missed-${Date.now()}`, ref: `grammar-${r.set.id}-missed`, title: 'Questions I missed', titleAr: 'الأسئلة التي أخطأت فيها',
    prompt: 'Try them again. Think about the rule.', promptAr: 'حاول مرة أخرى وفكّر في القاعدة.', set: r.set, items: shuffle(missed),
  });

  const activity = useMemo<Activity | null>(() => run && {
    kind: 'mcq', id: `${run.id}-${attempt}`, title: run.title, prompt: run.prompt, promptAr: run.promptAr,
    items: run.items.map((i) => toMcq(run.set, i.part, i.q)), tags: tag(6, 'grammar', run.title, undefined, 'revision'),
  }, [run, attempt]);

  const finish = (score: number, total: number) => {
    if (!run) return;
    const missed = run.items.filter((_, i) => answers.current[i] === false);
    setResult({ score, total, missed });
    setStage('done');
    // a practice run of missed questions is not a score for the whole set
    if (me && !run.ref.endsWith('-missed')) updateStudent((st) => recordLesson(st, run.ref, score, total));
  };

  if (stage !== 'menu' && run) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setStage('menu')}><ArrowLeft size={18} /> Grammar</Button>
          <div>
            <div className="text-sm font-bold text-navy-400">{run.set.title}</div>
            <h1 className="text-2xl font-bold text-navy">{run.title}</h1>
          </div>
        </div>

        {stage === 'intro' && run.part && (
          <Card className="space-y-3">
            <h2 className="text-xl font-bold text-navy">Remember</h2>
            <p className="text-lg text-navy">{PART_RULES[run.set.id]?.[run.part.n]?.en}</p>
            <Ar>{PART_RULES[run.set.id]?.[run.part.n]?.ar}</Ar>
            <p className="text-navy-500">{run.items.length} questions. If you make a mistake, you will see the right answer and why.</p>
            <div className="flex justify-end"><Button size="lg" variant="accent" onClick={() => setStage('quiz')}>Start</Button></div>
          </Card>
        )}

        {stage === 'quiz' && activity && (
          <Card className="p-5 sm:p-7">
            <ActivityView key={activity.id} activity={activity}
              onAnswer={(a) => { answers.current.push(a.correct); if (me) updateStudent((st) => recordAnswer(st, a)); }}
              onDone={(r) => finish(r.score, r.total)} />
          </Card>
        )}

        {stage === 'done' && result && <Results run={run} result={result} onAgain={() => start(run.id.includes('-mixed-') ? mixedRun(run.set) : run)} onMissed={() => start(missedRun(run, result.missed))} onMenu={() => setStage('menu')} />}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Grammar" ar="القواعد" sub="Answer the questions. If you make a mistake, you see the right answer and why." icon={<BookText />} />
      {CHALLENGE_SETS.map((set) => {
        const parts = set.parts.map((p) => ({ p, res: s.lessons[partRef(set, p)] }));
        const done = parts.filter((x) => x.res).length;
        const best = s.lessons[`grammar-${set.id}-all`];
        return (
          <section key={set.id} className="mb-8">
            <Card className="mb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-navy">{set.title}</h2>
                  <p className="text-lg text-navy-500">{set.topic} · {set.parts.length} parts · 100 questions</p>
                  <p className="mt-1 flex items-center gap-1.5 text-navy-500"><Target size={16} /> Target: {Math.round(CHALLENGE_TARGET * 100)}% or more</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={done === set.parts.length ? 'mint' : 'grey'}>{done} of {set.parts.length} parts done</Pill>
                  {best && <Pill tone={best.score / best.total >= CHALLENGE_TARGET ? 'mint' : 'sun'}>All 100: {best.score}/{best.total}</Pill>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="accent" onClick={() => start(mixedRun(set))}><Shuffle size={18} /> Mixed 20</Button>
                <Button variant="outline" onClick={() => start(fullRun(set))}><ListChecks size={18} /> All 100 questions</Button>
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {parts.map(({ p, res }) => (
                <button key={p.n} type="button" onClick={() => start(partRun(set, p), true)}
                  className="flex flex-col gap-1.5 rounded-3xl border border-navy-100 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-coral">
                  <span className="text-sm font-bold text-navy-400">Part {p.n}</span>
                  <span className="text-lg font-bold text-navy">{p.focus}</span>
                  <Ar className="text-sm">{p.focusAr}</Ar>
                  <span className="mt-auto flex gap-2 pt-2">
                    <Pill tone="grey">{p.questions.length} questions</Pill>
                    {res && <Pill tone={res.score / res.total >= CHALLENGE_TARGET ? 'mint' : 'sun'}>{res.score}/{res.total}</Pill>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Results({ run, result, onAgain, onMissed, onMenu }: { run: Run; result: { score: number; total: number; missed: Item[] }; onAgain: () => void; onMissed: () => void; onMenu: () => void }) {
  const line = summaryLine(result.score, result.total);
  const reached = result.score / Math.max(1, result.total) >= CHALLENGE_TARGET;
  return (
    <>
      <Card className="text-center">
        <h2 className="text-4xl font-bold text-navy">{result.score}/{result.total}</h2>
        <p className="mt-1 text-xl text-navy">{line.en}</p>
        <Ar>{line.ar}</Ar>
        {reached && <p className="mt-2"><Pill tone="mint"><Check size={14} /> Target reached</Pill></p>}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {result.missed.length > 0 && <Button variant="accent" onClick={onMissed}><RefreshCcw size={18} /> Practise the {result.missed.length} I missed</Button>}
          <Button variant="outline" onClick={onAgain}><RefreshCcw size={18} /> {run.id.includes('-mixed-') ? 'New 20 questions' : 'Try again'}</Button>
          <Button variant="outline" onClick={onMenu}>Back to Grammar</Button>
        </div>
      </Card>
      {result.missed.length > 0 && (
        <Card>
          <h2 className="mb-3 text-xl font-bold text-navy">Look again at these</h2>
          <ul className="space-y-3">
            {result.missed.map(({ part, q }) => (
              <li key={q.n} className="rounded-2xl bg-sun-50 p-4">
                <div className="text-sm font-bold text-navy-400">Question {q.n} · {part.focus}</div>
                <p className="text-lg font-semibold text-navy">{completedSentence(q) ?? `${q.q} → ${q.options[q.answer]}`}</p>
                <p className="text-navy-500">{QUESTION_NOTES[run.set.id]?.[q.n]}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
