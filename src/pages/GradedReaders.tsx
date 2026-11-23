// A1 Graded Readers (Weeks 1-15): one short story per week, shown on the Vocabulary page.
// Data: src/data/generated/graded-readers.json, made by scripts/import_graded_readers.py (student version: no teacher notes).
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Pause, Play, Turtle } from 'lucide-react';
import data from '../data/generated/graded-readers.json';
import { speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { Markup } from '../components/Markup';
import { AudioButton } from '../components/AudioButton';
import { Button, Card, Pill } from '../components/ui';
import { useApp } from '../store';

interface Line { speaker?: string; text: string }
export interface Reader {
  week: number;
  title: string;
  setting: string;
  focus: string[];
  story: Line[];
  check: string[];
  talk: string[];
  vocab: { word: string; ar: string; meaning: string; example: string }[];
  more: { word: string; meaning: string }[];
}
export const READERS = data as Reader[];

export default function GradedReaders() {
  const [params, setParams] = useSearchParams();
  const week = Number(params.get('week'));
  const reader = READERS.find((r) => r.week === week);
  const open = (w: number | null) => {
    stopSpeaking();
    setParams(w ? { list: 'readers', week: String(w) } : { list: 'readers' });
  };
  return reader ? <ReaderView reader={reader} open={open} /> : <ReaderList open={open} />;
}

function ReaderList({ open }: { open: (w: number) => void }) {
  return (
    <div>
      <Card className="mb-4 bg-navy-50/60">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><BookOpen size={22} /> A1 Graded Readers</h2>
        <p className="mt-1 text-navy-500">One short story for every week. Read it, listen to it, then check the new words.</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {READERS.map((r) => (
          <button key={r.week} type="button" onClick={() => open(r.week)} className="text-left">
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-coral">
              <Pill tone="coral">Week {r.week}</Pill>
              <h3 className="mt-3 text-xl font-bold text-navy">{r.title}</h3>
              <p className="mt-1 text-navy-500">{r.setting}</p>
              <p className="mt-3 text-sm font-semibold text-navy-400">{r.vocab.length} key words · {r.check.length + r.talk.length} questions</p>
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

  const play = async (rate: number) => {
    setPlaying(true);
    await speakLines(r.story.map((l) => ({ speaker: l.speaker ?? 'Narrator', text: l.text })), { rate, onLine: setLine });
    setPlaying(false);
  };
  const stop = () => { stopSpeaking(); setPlaying(false); setLine(-1); };
  const prev = READERS.find((x) => x.week === r.week - 1);
  const next = READERS.find((x) => x.week === r.week + 1);

  return (
    <article ref={top} className="scroll-mt-24">
      <Button variant="ghost" size="sm" onClick={() => open(null)} className="mb-3"><ArrowLeft size={18} /> All readers</Button>
      <header className="mb-4">
        <Pill tone="coral">Week {r.week}</Pill>
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
        <div className="space-y-2 text-lg leading-relaxed text-navy-700">
          {r.story.map((l, i) => (
            <p key={i} className={`rounded-lg px-2 py-0.5 transition ${line === i ? 'bg-sun-100' : ''}`}>
              {l.speaker && <strong className="font-bold text-navy">{l.speaker}: </strong>}
              <Markup text={l.text} />
            </p>
          ))}
        </div>
      </Card>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <QuestionCard title="Check your understanding" items={r.check} />
        <QuestionCard title="Talk about it" items={r.talk} />
      </div>

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

      <Card as="section" className="mb-6">
        <h3 className="mb-3 text-xl font-bold text-navy">More words from this week</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {r.more.map((m) => (
            <li key={m.word} className="rounded-xl bg-navy-50/60 px-3 py-2">
              <span className="font-bold text-navy">{m.word}</span> <span className="text-coral">–</span> <span className="text-navy-600">{m.meaning}</span>
            </li>
          ))}
        </ul>
      </Card>

      <nav className="flex flex-wrap justify-between gap-3">
        {prev ? <Button variant="outline" onClick={() => open(prev.week)}><ArrowLeft size={18} /> Week {prev.week}</Button> : <span />}
        {next && <Button onClick={() => open(next.week)}>Week {next.week} <ArrowRight size={18} /></Button>}
      </nav>
    </article>
  );
}

function QuestionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card as="section">
      <h3 className="mb-3 text-xl font-bold text-navy">{title}</h3>
      <ol className="space-y-2">
        {items.map((q, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-coral text-sm font-bold text-white">{i + 1}</span>
            <span className="text-navy-700"><Markup text={q} /></span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
