import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Search, Eye, RotateCcw, Check, Trophy } from 'lucide-react';
import { MODULES } from '../data/modules';
import { getWord, IATC } from '../data/content';
import { wordImage } from '../data/images';
import { useApp } from '../store';
import { useLearner } from '../hooks/useLearner';
import { dueWords, statusOf, countByStatus, type WordStatus } from '../lib/srs';
import { recordWord, markWordsSeen } from '../lib/learner';
import { currentModule } from '../lib/progress';
import { lastNDays, shortDay, today } from '../lib/date';
import { hashString, rngFrom, shuffle } from '../lib/rng';
import { optionsWith } from '../data/modules/builder';
import { speak } from '../lib/speech';
import { WordCard } from '../components/activities/media';
import { AudioButton } from '../components/AudioButton';
import { Ar, Button, Card, EmptyState, Feedback, PageHeader, Pill, Tabs } from '../components/ui';
import { Option } from '../components/activities/common';

type Tab = 'words' | 'review' | 'daily' | 'again' | 'oxford';
const STATUS_TONE: Record<WordStatus, 'grey' | 'sun' | 'sky' | 'mint'> = { new: 'grey', learning: 'sun', review: 'sky', mastered: 'mint' };

export default function Vocabulary() {
  const [params, setParams] = useSearchParams();
  const list = params.get('list');
  const initial: Tab = list === 'again' ? 'again' : list === 'due' ? 'review' : list === 'daily' ? 'daily' : 'words';
  const [tab, setTab] = useState<Tab>(initial);
  const { learner: s } = useLearner();
  const due = dueWords(s);
  const allModuleWords = useMemo(() => [...new Set(MODULES.flatMap((m) => m.vocab))], []);
  const counts = countByStatus(s, allModuleWords);

  return (
    <div>
      <PageHeader title="Vocabulary" ar="المفردات" sub="Look, listen, say. Then review at the right time." icon={<Layers />} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {(['new', 'learning', 'review', 'mastered'] as WordStatus[]).map((k) => (
          <Card key={k} className="p-4">
            <Pill tone={STATUS_TONE[k]}>{k[0].toUpperCase() + k.slice(1)}</Pill>
            <div className="mt-2 text-3xl font-bold text-navy">{counts[k]}</div>
          </Card>
        ))}
      </div>
      <WeeklyChart />
      <Tabs<Tab>
        className="my-5"
        value={tab}
        onChange={(t) => { setTab(t); setParams({}); }}
        tabs={[
          { id: 'words', label: 'All words' },
          { id: 'daily', label: '⭐ Daily 5' },
          { id: 'review', label: `🔁 Review (${due.length})` },
          { id: 'again', label: `Practise again (${s.practiseAgain.length})` },
          { id: 'oxford', label: 'Oxford 3000 A1' },
        ]}
      />
      {tab === 'words' && <WordBrowser initialModule={params.get('module')} initialTopic={params.get('topic')} />}
      {tab === 'review' && <ReviewSession ids={due} title="Spaced review" empty="No words to review today. Great work! Come back tomorrow." />}
      {tab === 'again' && <ReviewSession ids={s.practiseAgain} title="Practise again" empty="Your Practise again list is empty. 🎉" />}
      {tab === 'daily' && <DailyFive />}
      {tab === 'oxford' && <OxfordList />}
    </div>
  );
}

function WeeklyChart() {
  const { learner: s } = useLearner();
  const days = lastNDays(7);
  const values = days.map((d) => Object.values(s.vocab).filter((v) => v.last === d).length);
  const max = Math.max(4, ...values);
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Words practised this week</h2>
        <Pill tone="sky">{values.reduce((a, b) => a + b, 0)} this week</Pill>
      </div>
      <div className="flex h-32 items-end gap-2" role="img" aria-label={`Words practised per day: ${days.map((d, i) => `${shortDay(d)} ${values[i]}`).join(', ')}`}>
        {days.map((d, i) => (
          <div key={d} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-bold text-navy">{values[i] || ''}</span>
            <div className={`w-full rounded-t-lg ${d === today() ? 'bg-coral' : 'bg-navy-300'}`} style={{ height: `${Math.max(4, (values[i] / max) * 96)}px` }} />
            <span className="text-xs text-navy-400">{shortDay(d)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WordBrowser({ initialModule, initialTopic }: { initialModule: string | null; initialTopic: string | null }) {
  const { learner: s } = useLearner();
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<string>(initialModule ?? String(currentModule(s).n));
  const [status, setStatus] = useState<'all' | WordStatus>('all');
  const [topic] = useState(initialTopic);
  const [page, setPage] = useState(0);
  const ids = useMemo(() => {
    let base: string[];
    if (topic) base = IATC.vocab.filter((v) => v.topic === topic).map((v) => v.id);
    else if (mod === 'all') base = [...new Set(MODULES.flatMap((m) => m.vocab))];
    else base = MODULES[Number(mod) - 1]?.vocab ?? [];
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      base = IATC.vocab.filter((v) => v.word.toLowerCase().includes(t) || v.ar.includes(q.trim()) || v.meaning.toLowerCase().includes(t)).map((v) => v.id);
    }
    return status === 'all' ? base : base.filter((id) => statusOf(s.vocab[id]) === status);
  }, [q, mod, status, topic, s.vocab]);
  const PER = 12;
  const shown = ids.slice(page * PER, page * PER + PER);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search words</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" size={20} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search English or Arabic…" className="min-h-[48px] w-full rounded-2xl border-2 border-navy-100 pl-10 pr-3 text-lg outline-none focus:border-navy" />
        </label>
        <select value={mod} onChange={(e) => { setMod(e.target.value); setPage(0); }} className="min-h-[48px] rounded-2xl border-2 border-navy-100 bg-white px-3 font-semibold text-navy" aria-label="Topic">
          <option value="all">All units</option>
          {MODULES.map((m) => <option key={m.n} value={m.n}>Unit {m.n}: {m.title}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as 'all' | WordStatus); setPage(0); }} className="min-h-[48px] rounded-2xl border-2 border-navy-100 bg-white px-3 font-semibold text-navy" aria-label="Status">
          <option value="all">All status</option><option value="new">New</option><option value="learning">Learning</option><option value="review">Review</option><option value="mastered">Mastered</option>
        </select>
      </div>
      {topic && <p className="mb-3"><Pill tone="sky">Topic: {topic}</Pill></p>}
      {shown.length === 0 ? <EmptyState icon="🔍" title="No words found" text="Try another word or filter." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((id) => (
            <div key={id} className="relative">
              <span className="absolute right-3 top-3 z-10"><Pill tone={STATUS_TONE[statusOf(s.vocab[id])]}>{statusOf(s.vocab[id])}</Pill></span>
              <WordCard id={id} />
            </div>
          ))}
        </div>
      )}
      {ids.length > PER && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="font-semibold text-navy">{page + 1} / {Math.ceil(ids.length / PER)}</span>
          <Button variant="outline" disabled={(page + 1) * PER >= ids.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

/** Flip-card review: see the word, remember the meaning, then mark it. */
function ReviewSession({ ids, title, empty }: { ids: string[]; title: string; empty: string }) {
  const { updateStudent, me, data } = useApp();
  const [queue] = useState(() => ids.slice(0, 15));
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [right, setRight] = useState(0);
  if (queue.length === 0) return <EmptyState icon="🎉" title={empty} />;
  if (i >= queue.length) {
    return (
      <Card className="text-center">
        <Trophy className="mx-auto text-sun" size={48} />
        <h2 className="mt-2 text-2xl font-bold text-navy">{title} done!</h2>
        <p className="text-lg text-navy">You knew {right} of {queue.length} words. The others come back soon.</p>
        <Ar>أحسنت! الكلمات الصعبة ستعود قريباً للمراجعة.</Ar>
      </Card>
    );
  }
  const w = getWord(queue[i]);
  const mark = (know: boolean) => {
    if (me) updateStudent((s) => recordWord(s, queue[i], know));
    if (know) setRight(right + 1);
    setFlip(false);
    setI(i + 1);
  };
  return (
    <div className="mx-auto max-w-md">
      <p className="mb-2 text-center font-semibold text-navy-400">{title}: {i + 1} of {queue.length}</p>
      <Card className="text-center">
        <div className="text-7xl" aria-hidden="true">{wordImage(queue[i]) ?? '🔤'}</div>
        <h2 className="mt-2 text-4xl font-bold text-navy">{w?.word}</h2>
        <div className="mt-3 flex justify-center gap-2"><AudioButton text={w?.word ?? ''} /><AudioButton text={w?.word ?? ''} slow /></div>
        {flip ? (
          <div className="mt-4 animate-rise space-y-2">
            {data.settings.arabic && <p dir="rtl" lang="ar" className="font-arabic text-2xl text-coral-700">{w?.ar}</p>}
            <p className="text-lg text-navy-500">{w?.meaning}</p>
            <p className="rounded-2xl bg-navy-50 p-3 text-lg font-semibold text-navy">“{w?.example}”</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="soft" size="lg" onClick={() => mark(false)}><RotateCcw size={18} /> Practise again</Button>
              <Button variant="success" size="lg" onClick={() => mark(true)}><Check size={18} /> I know this</Button>
            </div>
          </div>
        ) : (
          <Button size="lg" className="mt-5 w-full" onClick={() => setFlip(true)}><Eye size={20} /> Show the meaning</Button>
        )}
      </Card>
    </div>
  );
}

/** Daily five-word challenge: the same five words all day, chosen from due + current-unit words. */
function DailyFive() {
  const { updateStudent, me, data } = useApp();
  const { learner: s } = useLearner();
  const words = useMemo(() => {
    const m = currentModule(s);
    const pool = [...dueWords(s), ...shuffle(m.vocab.filter((w) => wordImage(w)), rngFrom(hashString(today() + s.id)))];
    return [...new Set(pool)].filter((w) => wordImage(w)).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);
  const [i, setI] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const m = currentModule(s);
  if (words.length < 3) return <EmptyState icon="⭐" title="Daily 5 is not ready" text="Open a unit first to get new words." />;
  if (i === -1) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <div className="text-6xl">⭐</div>
        <h2 className="mt-2 text-2xl font-bold text-navy">Today’s five words</h2>
        <Ar>تحدي الكلمات الخمس اليوم</Ar>
        <div className="my-4 flex justify-center gap-3 text-5xl" aria-hidden="true">{words.map((w) => <span key={w}>{wordImage(w)}</span>)}</div>
        <Button size="lg" variant="accent" onClick={() => { setI(0); if (me) updateStudent((st) => markWordsSeen(st, words)); speak(getWord(words[0])!.word, { rate: data.settings.speechRate }); }}>Start the challenge</Button>
      </Card>
    );
  }
  if (i >= words.length) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <Trophy className="mx-auto text-sun" size={56} />
        <h2 className="mt-2 text-2xl font-bold text-navy">Challenge complete: {score}/5</h2>
        <p className="text-lg text-navy">{score >= 4 ? 'Fantastic! See you tomorrow for five more.' : 'Good effort! These words will come back in your review.'}</p>
      </Card>
    );
  }
  const id = words[i];
  const w = getWord(id)!;
  const pool = m.vocab.filter((x) => wordImage(x));
  const options = optionsWith(id, pool.length >= 3 ? pool : words, 3, hashString(id + today()));
  return (
    <Card className="mx-auto max-w-xl">
      <p className="mb-2 font-semibold text-navy-400">Word {i + 1} of 5 — Listen and choose the picture.</p>
      <div className="mb-4 flex items-center gap-3">
        <AudioButton text={w.word} size="lg" />
        {picked && <span className="text-3xl font-bold text-navy">{w.word}</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map((o) => (
          <Option key={o} big disabled={!!picked} state={!picked ? 'idle' : o === id ? 'correct' : o === picked ? 'wrong' : 'idle'}
            onClick={() => { setPicked(o); const ok = o === id; if (ok) setScore(score + 1); if (me) updateStudent((st) => recordWord(st, id, ok)); }}>
            <span className="py-4 text-5xl">{wordImage(o)}</span>
          </Option>
        ))}
      </div>
      {picked && (
        <div className="mt-4">
          <Feedback ok={picked === id} en={picked === id ? 'Great job!' : `Nice try! This is “${w.word}”.`} detail={<span>“{w.example}”</span>} />
          <div className="mt-3 flex justify-end">
            <Button size="lg" onClick={() => { setPicked(null); setI(i + 1); const n = words[i + 1]; if (n) speak(getWord(n)!.word, { rate: data.settings.speechRate }); }}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OxfordList() {
  const [q, setQ] = useState('');
  const words = IATC.oxfordA1.filter((w) => w.toLowerCase().includes(q.toLowerCase()));
  const inApp = new Set(IATC.vocab.filter((v) => v.oxfordA1).map((v) => v.word.toLowerCase()));
  return (
    <div>
      <p className="mb-3 text-navy-500">The Oxford 3000 A1 headwords ({IATC.oxfordA1.length}). Words with a ✓ have a full card in the app.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the A1 list…" aria-label="Search the Oxford A1 list" className="mb-4 min-h-[48px] w-full rounded-2xl border-2 border-navy-100 px-4 text-lg outline-none focus:border-navy sm:w-80" />
      <div className="flex flex-wrap gap-2">
        {words.slice(0, 400).map((w) => (
          <button key={w} onClick={() => speak(w.split(',')[0])} className={`min-h-[44px] rounded-xl border px-3 font-semibold ${inApp.has(w.toLowerCase()) ? 'border-mint/40 bg-mint-50 text-mint-700' : 'border-navy-100 bg-white text-navy'}`}>
            {inApp.has(w.toLowerCase()) && '✓ '}{w}
          </button>
        ))}
      </div>
      {words.length > 400 && <p className="mt-3 text-navy-400">Showing 400 of {words.length}. Search to find more.</p>}
    </div>
  );
}
