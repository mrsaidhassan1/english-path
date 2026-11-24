// A1 Graded Readers (Weeks 1-15): one short story per week, shown on the Reading page (/reading?week=N).
// Data: src/data/generated/graded-readers.json, made by scripts/import_graded_readers.py (student version: no teacher notes).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Pause, Play, RotateCcw, Turtle } from 'lucide-react';
import { readerActivities } from '../data/readerActivities';
import { ActivityView, type ActivityResult } from '../components/activities/ActivityView';
import { recordAnswer, recordLesson } from '../lib/learner';
import { DEFAULT_NARRATOR, NARRATORS, READERS, readerLine, type Reader } from '../data/narrators';
import { speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { Markup } from '../components/Markup';
import { AudioButton } from '../components/AudioButton';
import { Button, Card, Pill } from '../components/ui';
import { useApp } from '../store';

export { READERS };
export type { Reader };

const NARRATOR_KEY = 'ep.narrator';
function savedNarrator() {
  try {
    const id = localStorage.getItem(NARRATOR_KEY);
    return NARRATORS.some((n) => n.id === id) ? (id as string) : DEFAULT_NARRATOR;
  } catch {
    return DEFAULT_NARRATOR;
  }
}

export default function GradedReaders() {
  const [params, setParams] = useSearchParams();
  const week = Number(params.get('week'));
  const reader = READERS.find((r) => r.week === week);
  const open = (w: number | null) => {
    stopSpeaking();
    setParams(w ? { week: String(w) } : {});
  };
  return reader ? <ReaderView reader={reader} open={open} /> : <ReaderList open={open} />;
}

function ReaderList({ open }: { open: (w: number) => void }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy"><BookOpen size={22} /> A1 Graded Readers · Stories 1–15</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {READERS.map((r) => (
          <button key={r.week} type="button" onClick={() => open(r.week)} className="text-left">
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-coral">
              <Pill tone="coral">Story {r.week}</Pill>
              <h3 className="mt-3 text-xl font-bold text-navy">{r.title}</h3>
              <p className="mt-1 text-navy-500">{r.setting}</p>
              <p className="mt-3 text-sm font-semibold text-navy-400">{r.vocab.length} key words · 4 activities</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReaderView({ reader: r, open }: { reader: Reader; open: (w: number | null) => void }) {
  const { data: app } = useApp();
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const top = useRef<HTMLElement>(null);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    setLine(-1); setPlaying(false);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [r.week]);

  const [narrator, setNarrator] = useState(savedNarrator);
  const voice = NARRATORS.find((n) => n.id === narrator) ?? NARRATORS[0];

  const play = async (rate: number) => {
    setPlaying(true);
    await speakLines(r.story.map((l) => ({ speaker: voice.speaker, text: readerLine(l) })), { rate, onLine: setLine, gapMs: 250 });
    setPlaying(false);
  };
  const stop = () => { stopSpeaking(); setPlaying(false); setLine(-1); };
  const choose = (id: string) => {
    stop();
    setNarrator(id);
    try { localStorage.setItem(NARRATOR_KEY, id); } catch { /* private mode: keep it for this visit */ }
  };
  const prev = READERS.find((x) => x.week === r.week - 1);
  const next = READERS.find((x) => x.week === r.week + 1);

  return (
    <article ref={top} className="scroll-mt-24">
      <Button variant="ghost" size="sm" onClick={() => open(null)} className="mb-3"><ArrowLeft size={18} /> All readers</Button>
      <header className="mb-4">
        <Pill tone="coral">Story {r.week}</Pill>
        <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">{r.title}</h2>
        <p className="text-navy-500">📍 {r.setting}</p>
      </header>

      <Card className="mb-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-coral-700">Vocabulary focus</h3>
        <div className="flex flex-wrap gap-2">{r.focus.map((f) => <Pill key={f} tone="navy">{f}</Pill>)}</div>
      </Card>

      <Card as="section" className="mb-4 border-l-8 border-l-coral bg-slate-50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-navy">Story</h3>
          {ttsSupported() && (
            <div className="flex gap-2">
              {playing
                ? <Button variant="accent" size="sm" onClick={stop}><Pause size={18} /> Stop</Button>
                : <Button size="sm" onClick={() => play(app.settings.speechRate)}><Play size={18} /> Listen</Button>}
              <Button variant="soft" size="sm" disabled={playing} onClick={() => play(0.6)}><Turtle size={18} /> Slow</Button>
            </div>
          )}
        </div>
        {ttsSupported() && (
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-coral-700">
              Narrator {app.settings.arabic && <span lang="ar" className="font-arabic normal-case">· الراوي</span>}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {NARRATORS.map((n) => {
                const on = n.id === voice.id;
                return (
                  <button key={n.id} type="button" aria-pressed={on} onClick={() => choose(n.id)}
                    className={`min-h-[56px] rounded-2xl border-2 px-3 py-2 text-left transition ${on ? 'border-coral bg-white shadow-card' : 'border-navy-100 bg-white/60 hover:border-coral/60'}`}>
                    <span className="block font-bold text-navy">{n.name}</span>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-coral-700">{n.accent}</span>
                    <span className="block text-sm leading-snug text-navy-500">{n.about}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <div className="space-y-2 text-lg leading-relaxed text-navy-700">
          {r.story.map((l, i) => (
            <p key={i} className={`rounded-lg px-2 py-0.5 transition ${line === i ? 'bg-sun-100' : ''}`}>
              {l.speaker && <strong className="font-bold text-navy">{l.speaker}: </strong>}
              <Markup text={l.text} />
            </p>
          ))}
        </div>
      </Card>

      <Card as="section" className="mb-4">
        <h3 className="mb-3 text-xl font-bold text-navy">Vocabulary check</h3>
        <div className="space-y-2">
          {r.vocab.map((v) => (
            <div key={v.word} className="grid items-center gap-x-4 gap-y-1 rounded-2xl border border-navy-100/70 p-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]">
              <div className="flex items-center gap-2">
                <AudioButton text={v.word.replace(/…/g, '')} size="sm" label={`Listen: ${v.word}`} />
                <div>
                  <div className="font-bold text-navy">{v.word}</div>
                  {app.settings.arabic && <span lang="ar" className="block font-arabic font-bold text-coral-700"><span dir="rtl">{v.ar}</span></span>}
                </div>
              </div>
              <div className="text-navy-600">{v.meaning}</div>
              <div className="italic text-navy-500">“{v.example}”</div>
            </div>
          ))}
        </div>
      </Card>

      <Practice key={r.week} reader={r} />

      <Card as="section" className="mb-6">
        <h3 className="mb-3 text-xl font-bold text-navy">More words from this story</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {r.more.map((m) => (
            <li key={m.word} className="rounded-xl bg-navy-50/60 px-3 py-2">
              <span className="font-bold text-navy">{m.word}</span> <span className="text-coral">–</span> <span className="text-navy-600">{m.meaning}</span>
            </li>
          ))}
        </ul>
      </Card>

      <nav className="flex flex-wrap justify-between gap-3">
        {prev ? <Button variant="outline" onClick={() => open(prev.week)}><ArrowLeft size={18} /> Story {prev.week}</Button> : <span />}
        {next && <Button onClick={() => open(next.week)}>Story {next.week} <ArrowRight size={18} /></Button>}
      </nav>
    </article>
  );
}

const STEP_LABEL: Record<string, string> = { check: 'Questions', match: 'Match', gap: 'Fill the gap', talk: 'Talk' };

/** The interactive practice after the story: questions, matching, gap-fill and speaking, one at a time. */
function Practice({ reader }: { reader: Reader }) {
  const { me, updateStudent } = useApp();
  const acts = useMemo(() => readerActivities(reader), [reader]);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<string, ActivityResult>>({});
  const act = acts[step];
  const result = results[act.id];
  const kind = act.id.split('-').pop()!;
  /** Open activity i; `restart` clears its last result so it starts again. */
  const go = (i: number, restart = false) => {
    stopSpeaking();
    setStep(i);
    setAttempt((a) => a + 1);
    if (restart) setResults((r) => { const n = { ...r }; delete n[acts[i].id]; return n; });
  };

  return (
    <Card as="section" className="mb-4">
      <h3 className="mb-1 text-xl font-bold text-navy">Practise</h3>
      <p className="mb-3 text-navy-500">Four short activities about the story.</p>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Activities">
        {acts.map((a, i) => {
          const k = a.id.split('-').pop()!;
          const r = results[a.id];
          return (
            <button key={a.id} type="button" role="tab" aria-selected={i === step} onClick={() => go(i)}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition ${i === step ? 'bg-navy text-white' : 'bg-navy-50 text-navy hover:bg-navy-100'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${r ? 'bg-mint text-white' : i === step ? 'bg-white/20' : 'bg-white'}`}>{r ? <Check size={14} /> : i + 1}</span>
              {STEP_LABEL[k] ?? a.title}
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="animate-rise rounded-3xl bg-mint-50 p-5 text-center">
          <div className="text-4xl" aria-hidden="true">{result.total === 0 || result.score === result.total ? '🌟' : result.score / result.total >= 0.6 ? '👍' : '💪'}</div>
          <p className="mt-2 text-2xl font-bold text-navy">
            {result.total ? `${result.score} / ${result.total}` : 'Well done!'}
          </p>
          <p className="text-navy-600">{result.total === 0 || result.score === result.total ? 'Excellent work!' : 'Good try! Practice makes progress.'}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => go(step, true)}><RotateCcw size={18} /> Try again</Button>
            {step + 1 < acts.length && <Button onClick={() => go(step + 1)}>Next: {STEP_LABEL[acts[step + 1].id.split('-').pop()!]} <ArrowRight size={18} /></Button>}
          </div>
        </div>
      ) : (
        <ActivityView
          key={`${act.id}-${attempt}`}
          activity={act}
          onAnswer={(a) => me && updateStudent((s) => recordAnswer(s, a))}
          onDone={(res) => {
            setResults((r) => ({ ...r, [act.id]: res }));
            if (me && kind !== 'talk') updateStudent((s) => recordLesson(s, act.id, res.score, res.total));
          }}
        />
      )}
    </Card>
  );
}
