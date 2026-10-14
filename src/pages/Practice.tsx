import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Dumbbell, PenLine, ArrowLeft, RefreshCcw, Lock, Check } from 'lucide-react';
import type { Activity, GapItem } from '../types';
import { IATC, getGrammar } from '../data/content';
import { GRAMMAR_KEYS, grammarKey } from '../data/grammarKeys';
import { REVIEWS, reviewUnits } from '../data/modules';
import { clozeFromDeck, gapsFromDeck, pointFromDeck, tag } from '../data/modules/builder';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { recordAnswer, recordLesson } from '../lib/learner';
import { grammarWeaknesses, lessonDone, reviewUnlocked } from '../lib/progress';
import { ActivityView } from '../components/activities/ActivityView';
import { GrammarPanel, WritingBox } from '../components/activities/media';
import { Ar, Button, Card, EmptyState, LinkButton, PageHeader, Pill } from '../components/ui';
import { summaryLine } from '../lib/feedback';
import { hashString, rngFrom, shuffle } from '../lib/rng';

export function PracticePage() {
  const { learner: s } = useLearner();
  const weak = grammarWeaknesses(s, 2);
  const [topic, setTopic] = useState(IATC.topics[0]?.id ?? '');
  const t = IATC.topics.find((x) => x.id === topic);
  return (
    <div className="space-y-8">
      <PageHeader title="Practice" ar="التدريب" sub="Grammar boosters from the A1 Grammar decks, and writing practice." icon={<Dumbbell />} />

      {weak.length > 0 && (
        <Card className="border-coral-200 bg-coral-50/50">
          <h2 className="text-xl font-bold text-navy">🎯 Your practice focus</h2>
          <p className="text-navy-500">These grammar points need more practice.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {weak.slice(0, 4).map((w) => {
              const g = grammarKey(w.key);
              return g?.deck ? (
                <LinkButton key={w.key} to={`/practice/grammar/${g.deck}?key=${w.key}`} variant="accent" size="sm">{g.label} · {w.wrong} mistakes</LinkButton>
              ) : <Pill key={w.key} tone="coral">{g?.label ?? w.key}</Pill>;
            })}
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-1 text-xl font-bold text-navy">Grammar gym</h2>
        <Ar>صالة القواعد</Ar>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IATC.grammar.map((g) => {
            const keys = GRAMMAR_KEYS.filter((k) => k.deck === g.id);
            const wrong = keys.reduce((n, k) => n + (s.grammarStats[k.key]?.wrong ?? 0), 0);
            const right = keys.reduce((n, k) => n + (s.grammarStats[k.key]?.correct ?? 0), 0);
            return (
              <Link key={g.id} to={`/practice/grammar/${g.id}`} className="flex flex-col gap-2 rounded-3xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-coral">
                <span className="text-sm font-bold text-navy-400">A1 Grammar {g.num}</span>
                <span className="text-lg font-bold text-navy">{g.title}</span>
                <Ar className="text-sm">{g.ar}</Ar>
                <span className="text-navy-500">{g.sub}</span>
                <span className="mt-auto flex gap-2 pt-1">
                  {right + wrong > 0 ? <Pill tone={wrong > right / 2 ? 'coral' : 'mint'}>{Math.round((right / (right + wrong)) * 100)}% correct</Pill> : <Pill tone="grey">Not started</Pill>}
                  <Pill tone="grey">{g.practice.length} questions</Pill>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-navy"><PenLine /> Writing practice (25 words)</h2>
        <Ar>تدريب الكتابة — ٢٥ كلمة</Ar>
        <Card className="mt-3">
          <label className="mb-3 block">
            <span className="font-semibold text-navy">Choose a topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 block min-h-[48px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-lg text-navy sm:w-96">
              {IATC.topics.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </label>
          {t && (
            <WritingBox key={t.id} source={`topic-${t.id}`}
              task={{ title: t.title, prompt: `Write 25 words about ${t.title.toLowerCase()}.`, bullets: ['what it is', 'why you like it / one detail', 'one more idea'], frame: t.frame, model: `${t.frame.replace(/_{2,}/g, '…')}`, minWords: 20 }}
              onSubmitted={() => undefined} />
          )}
        </Card>
      </section>
    </div>
  );
}

/** Targeted booster for one A1 Grammar deck. */
export function GrammarBooster() {
  const { gid } = useParams();
  const [params] = useSearchParams();
  const deck = getGrammar(gid ?? '');
  const { me, updateStudent, update } = useApp();
  const [stage, setStage] = useState<'learn' | 'practice' | 'done'>('learn');
  const [result, setResult] = useState({ s: 0, t: 0 });
  const [round, setRound] = useState(0);
  const key = params.get('key') ?? GRAMMAR_KEYS.find((k) => k.deck === gid)?.key ?? 'be';
  const activity = useMemo<Activity | null>(() => {
    if (!deck) return null;
    const items: GapItem[] = shuffle([...gapsFromDeck(deck.id, key, 10), ...clozeFromDeck(deck.id, key, 6, round + 5)], rngFrom(hashString(deck.id) + round)).slice(0, 10);
    return { kind: 'gap', id: `boost-${deck.id}-${round}`, title: `${deck.title}: practice`, prompt: 'Choose the right word.', promptAr: 'اختر الكلمة الصحيحة.', items, tags: tag(grammarKey(key)?.module ?? 1, 'grammar', deck.title, key, 'revision'), src: deck.src };
  }, [deck, key, round]);
  if (!deck || !activity) return <EmptyState icon="🤔" title="Grammar deck not found" action={<LinkButton to="/practice">Practice</LinkButton>} />;
  const point = pointFromDeck(deck.id, 'coral', { sections: 4 });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <LinkButton to="/practice" variant="outline" size="sm"><ArrowLeft size={18} /> Practice</LinkButton>
        <div>
          <div className="text-sm font-bold text-navy-400">A1 Grammar {deck.num} · Grammar booster</div>
          <h1 className="text-2xl font-bold text-navy">{deck.title}</h1>
        </div>
      </div>
      {stage === 'learn' && point && (
        <>
          <GrammarPanel p={point} />
          <div className="flex justify-end"><Button size="lg" variant="accent" onClick={() => setStage('practice')}>Start practice</Button></div>
        </>
      )}
      {stage === 'practice' && (
        <Card className="p-5 sm:p-7">
          <ActivityView key={activity.id} activity={activity}
            onAnswer={(a) => me && updateStudent((s) => recordAnswer(s, a))}
            onDone={(r) => {
              setResult({ s: r.score, t: r.total });
              setStage('done');
              if (me) {
                updateStudent((s) => recordLesson(s, `booster-${deck.id}`, r.score, r.total));
                update((d) => d.assignments.forEach((a) => { if (a.kind === 'grammar' && a.ref === deck.id && (a.to === 'class' ? a.classId === me.classId : a.to.includes(me.id)) && !a.done.includes(me.id)) a.done.push(me.id); }));
              }
            }} />
        </Card>
      )}
      {stage === 'done' && (
        <Card className="text-center">
          <h2 className="text-3xl font-bold text-navy">{result.s}/{result.t}</h2>
          <p className="mt-1 text-xl text-navy">{summaryLine(result.s, result.t).en}</p>
          <Ar>{summaryLine(result.s, result.t).ar}</Ar>
          {deck.practiceTarget && <p className="mt-2 text-navy-400">{deck.practiceTarget.split('.')[0]}.</p>}
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setRound(round + 1); setStage('practice'); }}><RefreshCcw size={18} /> New questions</Button>
            <LinkButton to="/learning" variant="accent">Back to My Learning</LinkButton>
          </div>
        </Card>
      )}
    </div>
  );
}

export function ReviewPage() {
  const { learner: s, unlockAll, assigned } = useLearner();
  return (
    <div>
      <PageHeader title="Review" ar="المراجعة" sub="A review lesson after every two units." icon={<RefreshCcw />} />
      <div className="grid gap-4 sm:grid-cols-2">
        {REVIEWS.map((r, k) => {
          const open = reviewUnlocked(s, k, unlockAll) || assigned.has(r.id);
          const done = lessonDone(s, r.id);
          const res = s.lessons[r.id];
          const mods = reviewUnits(k);
          return (
            <Card key={r.id} className={open ? '' : 'border-dashed opacity-80'}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-navy">{r.title}</h2>
                  <p className="text-navy-500">{mods.map((m) => m.title).join(' · ')}</p>
                </div>
                {done ? <Pill tone="mint"><Check size={14} /> {res?.score}/{res?.total}</Pill> : !open && <Lock className="text-navy-300" />}
              </div>
              <div className="mt-4">
                {open ? <LinkButton to={`/review/${r.id}`} variant={done ? 'outline' : 'accent'}>{done ? 'Do it again' : 'Start review'}</LinkButton>
                  : <p className="text-navy-400">Finish Units {mods.map((m) => m.n).join(' and ')} to open this review.</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
