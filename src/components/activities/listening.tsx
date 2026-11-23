// The lesson's A1 Listening practice paper: Parts 1–3, one question at a time, with instant feedback.
// Part 1 questions each have their own short dialogue; Parts 2 and 3 share one recording per part.
import { useEffect, useMemo, useState } from 'react';
import { Headphones, Play, Square, Turtle } from 'lucide-react';
import type { DialogueLine } from '../../types';
import { Ar, Button, Feedback } from '../ui';
import { encourage, encourageAr, praise, praiseAr } from '../../lib/feedback';
import { answerLine, stripMarkup } from '../../lib/text';
import { optionOrder } from '../../lib/rng';
import { speakLines, stopSpeaking, ttsSupported } from '../../lib/speech';
import { useApp } from '../../store';
import { NextButton, Option, Shell, type ActivityProps } from './common';

function PlayLines({ lines, label }: { lines: DialogueLine[]; label: string }) {
  const { data } = useApp();
  const [on, setOn] = useState<'normal' | 'slow' | null>(null);
  useEffect(() => () => stopSpeaking(), []);
  if (!ttsSupported()) return null;
  const play = async (mode: 'normal' | 'slow') => {
    if (on) { stopSpeaking(); setOn(null); if (on === mode) return; }
    setOn(mode);
    await speakLines(lines.map(([speaker, text]) => ({ speaker, text })), { rate: mode === 'slow' ? 0.65 : data.settings.speechRate });
    setOn(null);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="lg" variant={on === 'normal' ? 'accent' : 'primary'} onClick={() => play('normal')}>
        {on === 'normal' ? <Square size={20} /> : <Play size={20} />} {on === 'normal' ? 'Stop' : label}
      </Button>
      <Button variant={on === 'slow' ? 'accent' : 'soft'} onClick={() => play('slow')} aria-label="Play slowly">
        {on === 'slow' ? <Square size={18} /> : <Turtle size={18} />} {on === 'slow' ? 'Stop' : 'Slowly'}
      </Button>
    </div>
  );
}

function Script({ lines }: { lines: DialogueLine[] }) {
  const speakers = new Set(lines.map(([w]) => w)).size;
  return (
    <div className="mt-2 space-y-1 text-base">
      {lines.map(([who, t], k) => <p key={k}>{speakers > 1 && <b>{who}: </b>}{stripMarkup(t)}</p>)}
    </div>
  );
}

export function Listening({ activity, onAnswer, onDone }: ActivityProps<'listening'>) {
  const steps = useMemo(() => activity.parts.flatMap((p, pi) => p.items.map((item, k) => ({ pi, k, item }))), [activity]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const { pi, k, item } = steps[i];
  const part = activity.parts[pi];
  const heard = item.say ?? part.audio;
  const order = useMemo(() => optionOrder(item.options, item.q + item.options.join('|')), [item]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const msg = useMemo(() => ({ good: praise(), goodAr: praiseAr(), keep: encourage(), keepAr: encourageAr() }), [picked]);
  const done = picked !== null;
  const ok = picked === item.answer;
  const last = i + 1 === steps.length;
  const next = () => {
    // A Part 2 / Part 3 recording keeps playing across that part's questions; the player stops it
    // when it closes (a new Part 1 dialogue, the next part, or the end of the step).
    const s = score + (ok ? 1 : 0);
    if (last) { onDone({ score: s, total: steps.length }); return; }
    setScore(s);
    setPicked(null);
    setI(i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <Shell activity={activity} step={i} steps={steps.length}>
      <div className="mb-4 rounded-3xl border-2 border-sky-200 bg-sky-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-800">
          <Headphones size={18} /> Part {pi + 1} of {activity.parts.length} · Question {k + 1} of {part.items.length}
        </div>
        <h3 className="mt-1 text-lg font-bold text-navy">{part.title}</h3>
        <p className="text-lg text-navy">{part.instructions}</p>
        <Ar>{part.instructionsAr}</Ar>
        {heard && <div className="mt-3"><PlayLines key={`${pi}-${item.say ? k : 'part'}`} lines={heard} label={item.say ? 'Listen to the dialogue' : 'Listen to the recording'} /></div>}
        {heard && !ttsSupported() && (
          <div className="mt-3 rounded-xl bg-white px-4 py-3 text-lg text-navy" role="note">🔇 Sound is not available here. Read the words:<Script lines={heard} /></div>
        )}
      </div>
      <p className="mb-4 text-xl font-semibold text-navy sm:text-2xl">{item.q}</p>
      <div className={`grid gap-3 ${item.options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
        {order.map((j) => (
          <Option
            key={j}
            disabled={done}
            state={!done ? 'idle' : j === item.answer ? (j === picked ? 'correct' : 'reveal') : j === picked ? 'wrong' : 'idle'}
            onClick={() => {
              setPicked(j);
              onAnswer({ correct: j === item.answer, skill: 'listening' });
            }}
          >
            {item.options[j]}
          </Option>
        ))}
      </div>
      {done && (
        <div className="mt-4">
          <Feedback
            ok={ok}
            en={ok ? msg.good : `${msg.keep} ${answerLine(item.options[item.answer])}`}
            ar={ok ? msg.goodAr : msg.keepAr}
            detail={heard && (
              <details>
                <summary className="cursor-pointer font-semibold">Show the words</summary>
                <Script lines={heard} />
              </details>
            )}
          />
          <NextButton last={last} onClick={next} />
        </div>
      )}
    </Shell>
  );
}
