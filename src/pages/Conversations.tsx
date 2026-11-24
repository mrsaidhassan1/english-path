// Conversations: 70 short A1 conversations, five for every unit (Units 1-14), one per lesson.
// Each one is read by its own cast of natural British or American voices. Route: /conversations?unit=N&lesson=L
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MessagesSquare, Pause, Play, Turtle } from 'lucide-react';
import { CONVERSATIONS, CONV_UNITS, convSpeaker, conversationsOf, type Conversation } from '../data/conversations';
import { speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { Markup } from '../components/Markup';
import { Button, Card, PageHeader, Pill } from '../components/ui';
import { useApp } from '../store';

export default function ConversationsPage() {
  const [params, setParams] = useSearchParams();
  const unit = CONV_UNITS.includes(Number(params.get('unit'))) ? Number(params.get('unit')) : 1;
  const conv = CONVERSATIONS.find((c) => c.unit === unit && c.lesson === Number(params.get('lesson')));
  const open = (u: number, lesson?: number) => {
    stopSpeaking();
    setParams(lesson ? { unit: String(u), lesson: String(lesson) } : { unit: String(u) });
  };
  return (
    <div>
      <PageHeader title="Conversations" ar="المحادثات" sub="70 short conversations, 5 in every unit. Listen, read, then act them out." icon={<MessagesSquare />} />
      {conv ? <ConversationView conv={conv} open={open} /> : <UnitList unit={unit} open={open} />}
    </div>
  );
}

function UnitList({ unit, open }: { unit: number; open: (u: number, lesson?: number) => void }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Units">
        {CONV_UNITS.map((u) => (
          <button key={u} type="button" role="tab" aria-selected={u === unit} onClick={() => open(u)}
            className={`min-h-[44px] rounded-2xl px-4 font-bold transition ${u === unit ? 'bg-navy text-white' : 'bg-navy-50 text-navy hover:bg-navy-100'}`}>
            Unit {u}
          </button>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-bold text-navy">Unit {unit} · Lessons 1–5</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {conversationsOf(unit).map((c) => (
          <button key={c.id} type="button" onClick={() => open(c.unit, c.lesson)} className="text-left">
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-coral">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-navy px-4 py-1.5 text-sm font-bold text-white">Lesson {c.lesson}</span>
                <h3 className="text-xl font-bold text-navy">{c.title}</h3>
              </div>
              <p className="mt-3 text-navy-500">📍 {c.where}</p>
              <p className="mt-3 text-sm font-semibold text-navy-400">{c.people.join(' · ')} · {c.accent} voices</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationView({ conv: c, open }: { conv: Conversation; open: (u: number, lesson?: number) => void }) {
  const { data: app } = useApp();
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const top = useRef<HTMLElement>(null);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    setLine(-1); setPlaying(false);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [c.id]);

  const lines = c.lines.map((l) => ({ speaker: convSpeaker(c, l.speaker), text: l.text }));
  const play = async (rate: number) => {
    setPlaying(true);
    await speakLines(lines, { rate, onLine: setLine, gapMs: 350 });
    setPlaying(false);
  };
  const stop = () => { stopSpeaking(); setPlaying(false); setLine(-1); };
  const idx = CONVERSATIONS.indexOf(c);
  const prev = CONVERSATIONS[idx - 1];
  const next = CONVERSATIONS[idx + 1];
  const go = (x: Conversation) => open(x.unit, x.lesson);

  return (
    <article ref={top} className="scroll-mt-24">
      <Button variant="ghost" size="sm" onClick={() => open(c.unit)} className="mb-3"><ArrowLeft size={18} /> Unit {c.unit}</Button>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-navy px-4 py-1.5 font-bold text-white">Lesson {c.lesson}</span>
        <h2 className="text-2xl font-bold text-navy sm:text-3xl">{c.title}</h2>
      </header>
      <p className="mb-2 text-navy-500">📍 {c.where}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill tone="navy">Unit {c.unit}</Pill>
        <Pill tone="coral">{c.accent} voices</Pill>
        {c.people.map((p) => <Pill key={p} tone="grey">{p}</Pill>)}
      </div>

      <Card as="section" className="mb-4 border-l-8 border-l-coral bg-slate-50">
        {ttsSupported() && (
          <div className="mb-4 flex flex-wrap gap-2">
            {playing
              ? <Button variant="accent" size="sm" onClick={stop}><Pause size={18} /> Stop</Button>
              : <Button size="sm" onClick={() => play(app.settings.speechRate)}><Play size={18} /> Listen</Button>}
            <Button variant="soft" size="sm" disabled={playing} onClick={() => play(0.6)}><Turtle size={18} /> Slow</Button>
          </div>
        )}
        <ol className="space-y-2" aria-label="Conversation">
          {c.lines.map((l, i) => (
            <li key={i}>
              <button type="button"
                onClick={() => {
                  if (playing || !ttsSupported()) return;
                  setLine(i);
                  speakLines([lines[i]], { rate: app.settings.speechRate }).then(() => setLine(-1));
                }}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition ${line === i ? 'bg-sun-100 ring-2 ring-sun' : 'hover:bg-white'}`}>
                <span className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-sm font-bold ${c.people.indexOf(l.speaker) % 2 ? 'bg-coral-50 text-coral-700' : 'bg-navy-50 text-navy'}`}>{l.speaker}</span>
                <span className="text-lg leading-snug text-navy"><Markup text={l.text} /></span>
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <Card as="section" className="mb-6">
        <h3 className="mb-3 text-xl font-bold text-navy">Practise</h3>
        <ol className="list-decimal space-y-2 pl-6 text-navy-700">
          <li>Listen and read. <span className="text-navy-400">Tap a line to hear it again.</span></li>
          <li>Read the conversation with {c.people.length > 2 ? 'two partners' : 'a partner'}. Then change roles.</li>
          <li>Your turn: change some words. Make a new conversation and act it out without looking.</li>
        </ol>
        {app.settings.arabic && (
          <ol lang="ar" dir="rtl" className="mt-3 list-decimal space-y-1 pr-6 font-arabic text-navy-500">
            <li>استمع واقرأ.</li>
            <li>اقرأ المحادثة مع زميلك، ثم بدّلوا الأدوار.</li>
            <li>دورك: غيّر بعض الكلمات، واصنع محادثة جديدة ومثّلها بدون النظر.</li>
          </ol>
        )}
      </Card>

      <nav className="flex flex-wrap justify-between gap-3">
        {prev ? <Button variant="outline" onClick={() => go(prev)}><ArrowLeft size={18} /> Unit {prev.unit} · Lesson {prev.lesson}</Button> : <span />}
        {next && <Button onClick={() => go(next)}>Unit {next.unit} · Lesson {next.lesson} <ArrowRight size={18} /></Button>}
      </nav>
    </article>
  );
}
