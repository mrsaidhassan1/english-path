// Matching, drag-and-drop sorting and dialogue building.
import { useMemo, useState, type DragEvent } from 'react';
import { Feedback } from '../ui';
import { AudioButton } from '../AudioButton';
import { Markup } from '../Markup';
import { praise, praiseAr, encourageAr } from '../../lib/feedback';
import { hashString, rngFrom, shuffle } from '../../lib/rng';
import { stripMarkup } from '../../lib/text';
import { NextButton, Option, Shell, type ActivityProps } from './common';

// ------------------------------------------------------------------ matching
export function Match({ activity, onAnswer, onDone }: ActivityProps<'match'>) {
  const pairs = activity.pairs;
  const right = useMemo(() => shuffle(pairs.map((p, k) => ({ t: p[1], k })), rngFrom(hashString(activity.id))), [pairs, activity.id]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [bad, setBad] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const finished = done.size === pairs.length;

  const tryPair = (l: number, r: number) => {
    if (l === r) {
      const nd = new Set(done).add(l);
      setDone(nd);
      setSel(null);
      onAnswer({ correct: true, skill: 'vocabulary' });
    } else {
      setBad(r);
      setMistakes((m) => m + 1);
      onAnswer({ correct: false, skill: 'vocabulary' });
      setTimeout(() => setBad(null), 600);
    }
  };

  return (
    <Shell activity={activity}>
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <div className="space-y-3">
          <div className="text-sm font-bold uppercase tracking-wide text-navy-400">{activity.leftLabel ?? 'A'}</div>
          {pairs.map((p, k) => (
            <Option key={k} disabled={done.has(k)} state={done.has(k) ? 'correct' : sel === k ? 'selected' : 'idle'} onClick={() => setSel(k)}>{p[0]}</Option>
          ))}
        </div>
        <div className="space-y-3">
          <div className="text-sm font-bold uppercase tracking-wide text-navy-400" dir={activity.rtlRight ? 'rtl' : undefined}>{activity.rightLabel ?? 'B'}</div>
          {right.map(({ t, k }) => (
            <Option key={k} dir={activity.rtlRight ? 'rtl' : undefined} disabled={done.has(k) || sel === null} state={done.has(k) ? 'correct' : bad === k ? 'wrong' : 'idle'} onClick={() => sel !== null && tryPair(sel, k)}>
              <span className={activity.rtlRight ? 'font-arabic' : ''}>{t}</span>
            </Option>
          ))}
        </div>
      </div>
      {sel === null && !finished && <p className="mt-3 text-center text-navy-400">Tap a word on the left first.</p>}
      {finished && (
        <div className="mt-4">
          <Feedback ok={mistakes === 0} en={mistakes === 0 ? praise() : `All matched! ${mistakes} mistake${mistakes > 1 ? 's' : ''} — good effort.`} ar={mistakes === 0 ? praiseAr() : encourageAr()} />
          <NextButton last onClick={() => onDone({ score: Math.max(0, pairs.length - mistakes), total: pairs.length })} />
        </div>
      )}
    </Shell>
  );
}

// ------------------------------------------------------------------ drag & drop sorting (tap also works)
export function Sort({ activity, onAnswer, onDone }: ActivityProps<'sort'>) {
  const items = useMemo(() => shuffle(activity.items.map((x, k) => ({ ...x, k })), rngFrom(hashString(activity.id))), [activity]);
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [bad, setBad] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState<Set<number>>(new Set());
  const remaining = items.filter((x) => placed[x.k] === undefined);

  const drop = (itemK: number, group: number) => {
    const it = activity.items[itemK];
    const ok = it.group === group;
    onAnswer({ correct: ok && !wrongs.has(itemK), skill: activity.tags.skill });
    if (ok) {
      setPlaced({ ...placed, [itemK]: group });
      setSel(null);
    } else {
      setWrongs(new Set(wrongs).add(itemK));
      setBad(group);
      setTimeout(() => setBad(null), 600);
    }
  };
  const onDrop = (e: DragEvent, g: number) => {
    e.preventDefault();
    const k = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(k)) drop(k, g);
  };

  return (
    <Shell activity={activity}>
      <div className="mb-5 flex min-h-[64px] flex-wrap gap-2 rounded-2xl bg-navy-50 p-3" aria-label="Words to sort">
        {remaining.length === 0 && <span className="px-2 py-3 text-lg font-semibold text-mint-700">All sorted! 🎉</span>}
        {remaining.map((x) => (
          <button key={x.k} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(x.k))} onClick={() => setSel(sel === x.k ? null : x.k)}
            aria-pressed={sel === x.k}
            className={`min-h-[52px] cursor-grab rounded-xl border-2 bg-white px-4 text-lg font-semibold text-navy shadow-card active:cursor-grabbing ${sel === x.k ? 'border-navy ring-2 ring-navy' : 'border-navy-100'}`}>{x.text}</button>
        ))}
      </div>
      <div className={`grid gap-3 ${activity.groups.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {activity.groups.map((g, gi) => (
          <div key={gi} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, gi)}
            onClick={() => sel !== null && drop(sel, gi)}
            role="button" tabIndex={0} aria-label={`Put in ${g}`}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && sel !== null && drop(sel, gi)}
            className={`min-h-[150px] rounded-3xl border-2 border-dashed p-3 transition ${bad === gi ? 'animate-wiggle border-coral bg-coral-50' : sel !== null ? 'border-navy-300 bg-sky-50 hover:bg-sky-100' : 'border-navy-200 bg-white'}`}>
            <div className="mb-2 text-center text-lg font-bold text-navy">{g}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {activity.items.map((x, k) => placed[k] === gi && <span key={k} className="rounded-xl bg-mint-50 px-3 py-2 font-semibold text-mint-700">✓ {x.text}</span>)}
            </div>
          </div>
        ))}
      </div>
      {sel !== null && <p className="mt-3 text-center text-navy-400">Now tap a box.</p>}
      {remaining.length === 0 && (
        <div className="mt-4">
          <Feedback ok={wrongs.size === 0} en={wrongs.size === 0 ? praise() : `Done! ${wrongs.size} needed a second try.`} ar={wrongs.size === 0 ? praiseAr() : encourageAr()} />
          <NextButton last onClick={() => onDone({ score: activity.items.length - wrongs.size, total: activity.items.length })} />
        </div>
      )}
    </Shell>
  );
}

// ------------------------------------------------------------------ dialogue building
export function DialogueBuild({ activity, onAnswer, onDone }: ActivityProps<'dialogue'>) {
  const lines = activity.dialogue.lines;
  const [shown, setShown] = useState(1);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const total = Object.keys(activity.steps).length;
  const step = activity.steps[shown];
  const finished = shown >= lines.length;

  const advance = () => {
    let n = shown + 1;
    while (n < lines.length && !activity.steps[n]) n++;
    setShown(Math.min(n, lines.length));
    setPick(null);
  };

  return (
    <Shell activity={activity}>
      {activity.dialogue.setting && <p className="mb-3 rounded-xl bg-sun-50 px-4 py-2 text-navy">📍 {activity.dialogue.setting}</p>}
      <ol className="space-y-2">
        {lines.slice(0, shown).map(([who, text], k) => (
          <li key={k} className={`flex items-start gap-3 ${k % 2 ? 'flex-row-reverse text-right' : ''}`}>
            <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-sm font-bold ${k % 2 ? 'bg-coral-50 text-coral-700' : 'bg-navy-50 text-navy'}`}>{who}</span>
            <span className={`rounded-2xl px-4 py-2 text-lg ${k % 2 ? 'bg-coral-50/60' : 'bg-navy-50/60'}`}><Markup text={text} /></span>
            <AudioButton text={stripMarkup(text)} size="sm" />
          </li>
        ))}
      </ol>
      {!finished && step && (
        <div className="mt-4 rounded-2xl border-2 border-navy-100 p-4">
          <p className="mb-2 font-bold text-navy">{lines[shown][0]} says:</p>
          <div className="grid gap-2">
            {step.options.map((o, k) => (
              <Option key={k} disabled={pick !== null} state={pick === null ? 'idle' : k === step.answer ? (pick === k ? 'correct' : 'reveal') : k === pick ? 'wrong' : 'idle'}
                onClick={() => { setPick(k); const ok = k === step.answer; if (ok) setScore(score + 1); onAnswer({ correct: ok, skill: 'speaking' }); }}>{o}</Option>
            ))}
          </div>
          {pick !== null && <NextButton onClick={advance} label="Continue" />}
        </div>
      )}
      {!finished && !step && <NextButton onClick={advance} label="Continue" />}
      {finished && (
        <div className="mt-4">
          <Feedback ok={score === total} en={score === total ? praise() : `You built the dialogue! ${score} of ${total} first time.`} ar={score === total ? praiseAr() : encourageAr()} />
          <NextButton last onClick={() => onDone({ score, total })} />
        </div>
      )}
      {!finished && pick === null && step && <p className="mt-2 text-sm text-navy-400">Read the dialogue. Choose what comes next.</p>}
    </Shell>
  );
}
