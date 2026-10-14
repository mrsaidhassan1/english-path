// Question activities: multiple choice, gap-fill, sentence order, error correction, picture choice, reading.
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import type { ErrorItem, GapItem, McqItem, OrderItem } from '../../types';
import { Feedback, Button } from '../ui';
import { AudioButton } from '../AudioButton';
import { Markup } from '../Markup';
import { encourage, encourageAr, praise, praiseAr } from '../../lib/feedback';
import { normalise } from '../../lib/text';
import { shuffle, rngFrom, hashString, optionOrder } from '../../lib/rng';
import { speak } from '../../lib/speech';
import { getWord } from '../../data/content';
import { wordImage } from '../../data/images';
import { NextButton, Option, Shell, type ActivityProps } from './common';
import { useApp } from '../../store';

function useSteps(total: number, onDone: (r: { score: number; total: number }) => void) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const next = (gotIt: boolean) => {
    const s = score + (gotIt ? 1 : 0);
    if (i + 1 >= total) onDone({ score: s, total });
    else {
      setScore(s);
      setI(i + 1);
    }
  };
  return { i, next };
}

// ------------------------------------------------------------------ multiple choice
export function McqQuestion({ item, onResult, autoSay = false }: { item: McqItem; onResult: (correct: boolean) => void; autoSay?: boolean }) {
  const { data } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    setPicked(null);
    if (autoSay && item.say) speak(item.say, { rate: data.settings.speechRate });
  }, [item, autoSay, data.settings.speechRate]);
  const order = useMemo(() => optionOrder(item.options, item.q + item.options.join('|')), [item]);
  const done = picked !== null;
  const ok = picked === item.answer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const msg = useMemo(() => ({ good: praise(), goodAr: praiseAr(), keep: encourage(), keepAr: encourageAr() }), [picked]);
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {item.say && <AudioButton text={item.say} size="lg" label="Listen" />}
        {item.say && <AudioButton text={item.say} slow size="md" />}
        <p className="text-xl font-semibold text-navy sm:text-2xl"><Markup text={item.q} /></p>
      </div>
      <div className={`grid gap-3 ${item.options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-3'}`}>
        {order.map((k) => (
          <Option
            key={k}
            disabled={done}
            state={!done ? 'idle' : k === item.answer ? (k === picked ? 'correct' : 'reveal') : k === picked ? 'wrong' : 'idle'}
            onClick={() => {
              setPicked(k);
              onResult(k === item.answer);
            }}
          >
            {item.options[k]}
          </Option>
        ))}
      </div>
      {done && (
        <div className="mt-4">
          <Feedback ok={ok} en={ok ? msg.good : `${msg.keep} The answer is “${item.options[item.answer]}”.`} ar={ok ? msg.goodAr : msg.keepAr} detail={item.explain} />
        </div>
      )}
    </div>
  );
}

export function Mcq({ activity, onAnswer, onDone }: ActivityProps<'mcq'>) {
  const { i, next } = useSteps(activity.items.length, onDone);
  const [res, setRes] = useState<boolean | null>(null);
  const item = activity.items[i];
  const skill = item.say ? 'listening' : activity.tags.skill;
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <McqQuestion
        key={i}
        item={item}
        autoSay={!!item.say}
        onResult={(ok) => {
          setRes(ok);
          onAnswer({ correct: ok, skill, grammar: item.grammar ?? activity.tags.grammar, word: item.word });
        }}
      />
      {res !== null && <NextButton last={i + 1 === activity.items.length} onClick={() => { const r = res; setRes(null); next(r); }} />}
    </Shell>
  );
}

// ------------------------------------------------------------------ gap fill
// Each question is its own keyed component, so its state always starts fresh.
interface QProps<T> { item: T; last: boolean; tagGrammar?: string; onAnswer: ActivityProps<'gap'>['onAnswer']; onNext: (gotIt: boolean) => void }

export function Gap({ activity, onAnswer, onDone }: ActivityProps<'gap'>) {
  const { i, next } = useSteps(activity.items.length, onDone);
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <GapQ key={i} item={activity.items[i]} last={i + 1 === activity.items.length} tagGrammar={activity.tags.grammar} onAnswer={onAnswer} onNext={next} />
    </Shell>
  );
}

function GapQ({ item, last, tagGrammar, onAnswer, onNext }: QProps<GapItem>) {
  const [val, setVal] = useState('');
  const [res, setRes] = useState<boolean | null>(null);
  const order = useMemo(() => (item.options ? optionOrder(item.options, item.text) : []), [item]);
  const check = (answer: string) => {
    const ok = normalise(answer) === normalise(item.answer);
    setVal(answer);
    setRes(ok);
    onAnswer({ correct: ok, skill: 'grammar', grammar: item.grammar ?? tagGrammar });
  };
  const [before, after] = item.text.split('___');
  const filled = res !== null ? (res ? val : item.answer) : val || '_____';
  return (
    <>
      <p className="mb-5 rounded-2xl bg-navy-50 p-5 text-2xl font-semibold leading-relaxed text-navy sm:text-3xl">
        {before}
        <span className={`mx-1 inline-block min-w-[4ch] rounded-lg border-b-4 px-2 ${res === null ? 'border-navy-300' : res ? 'border-mint bg-mint-50 text-mint-700' : 'border-coral bg-coral-50 text-coral-800'}`}>{filled}</span>
        {after ?? ''}
      </p>
      {item.options ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {order.map((k) => item.options![k]).map((o) => (
            <Option key={o} disabled={res !== null} state={res === null ? 'idle' : normalise(o) === normalise(item.answer) ? (res ? 'correct' : 'reveal') : o === val ? 'wrong' : 'idle'} onClick={() => check(o)}>{o}</Option>
          ))}
        </div>
      ) : (
        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); if (val.trim()) check(val); }}>
          <input value={val} onChange={(e) => setVal(e.target.value)} disabled={res !== null} aria-label="Your answer" autoComplete="off" spellCheck={false}
            className="min-h-[56px] min-w-0 flex-1 rounded-2xl border-2 border-navy-100 px-4 text-xl text-navy outline-none focus:border-navy" placeholder="Type here" autoFocus />
          <Button type="submit" size="lg" disabled={res !== null || !val.trim()}>Check</Button>
        </form>
      )}
      {res !== null && (
        <div className="mt-4">
          <Feedback ok={res} en={res ? 'Great job!' : `Nice try! The answer is “${item.answer}”.`} ar={res ? 'أحسنت!' : 'محاولة جيدة!'} />
          <NextButton last={last} onClick={() => onNext(res)} />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ sentence order
function tokens(s: string) {
  return s.replace(/([?.!,])$/, ' $1').split(/\s+/).filter(Boolean);
}

export function Order({ activity, onAnswer, onDone }: ActivityProps<'order'>) {
  const { i, next } = useSteps(activity.items.length, onDone);
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <OrderQ key={i} item={activity.items[i]} last={i + 1 === activity.items.length} tagGrammar={activity.tags.grammar} onAnswer={onAnswer} onNext={next} />
    </Shell>
  );
}

function OrderQ({ item, last, tagGrammar, onAnswer, onNext }: QProps<OrderItem>) {
  const words = useMemo(() => {
    const t = tokens(item.answer);
    let s = shuffle(t.map((w, k) => ({ w, k })), rngFrom(hashString(item.answer)));
    if (s.every((x, k) => x.k === k) && t.length > 1) s = [...s.slice(1), s[0]];
    return s;
  }, [item]);
  const [built, setBuilt] = useState<number[]>([]);
  const [res, setRes] = useState<boolean | null>(null);
  const sentence = built.map((k) => words[k].w).join(' ').replace(/ ([?.!,])/g, '$1');
  const check = () => {
    const ok = normalise(sentence) === normalise(item.answer);
    setRes(ok);
    onAnswer({ correct: ok, skill: 'grammar', grammar: item.grammar ?? tagGrammar });
  };
  return (
    <>
      <div className={`mb-4 flex min-h-[76px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-3 ${res === null ? 'border-navy-200 bg-navy-50/50' : res ? 'border-mint bg-mint-50' : 'border-coral bg-coral-50'}`} aria-live="polite">
        {built.length === 0 && <span className="px-2 text-lg text-navy-300">Tap the words in order…</span>}
        {built.map((k, pos) => (
          <button key={pos} disabled={res !== null} onClick={() => setBuilt(built.filter((_, p) => p !== pos))}
            className="min-h-[48px] rounded-xl bg-navy px-4 text-xl font-semibold text-white">{words[k].w}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((x, k) => (
          <button key={k} disabled={built.includes(k) || res !== null} onClick={() => setBuilt([...built, k])}
            className="min-h-[52px] rounded-xl border-2 border-navy-100 bg-white px-4 text-xl font-semibold text-navy shadow-card transition hover:border-navy-300 disabled:opacity-25">{x.w}</button>
        ))}
      </div>
      {res === null ? (
        <div className="mt-5 flex justify-between gap-3">
          <Button variant="ghost" onClick={() => setBuilt([])} disabled={!built.length}><RotateCcw size={18} /> Start again</Button>
          <Button size="lg" onClick={check} disabled={built.length !== words.length}>Check</Button>
        </div>
      ) : (
        <div className="mt-4">
          <Feedback ok={res} en={res ? 'Excellent!' : 'Good effort. Look at the right order.'} ar={res ? 'ممتاز!' : 'محاولة جيدة!'} detail={!res && <span>Correct order: <b>{item.answer}</b></span>} />
          <div className="mt-2"><AudioButton text={item.answer} size="sm" /></div>
          <NextButton last={last} onClick={() => onNext(res)} />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ error correction
export function ErrorFix({ activity, onAnswer, onDone }: ActivityProps<'error'>) {
  const { i, next } = useSteps(activity.items.length, onDone);
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <ErrorQ key={i} item={activity.items[i]} last={i + 1 === activity.items.length} tagGrammar={activity.tags.grammar} onAnswer={onAnswer} onNext={next} />
    </Shell>
  );
}

function ErrorQ({ item, last, tagGrammar, onAnswer, onNext }: QProps<ErrorItem>) {
  const toks = item.sentence.split(' ');
  const [tapped, setTapped] = useState<number | null>(null);
  const [miss, setMiss] = useState<number | null>(null);
  const [res, setRes] = useState<boolean | null>(null);
  const [firstTry, setFirstTry] = useState(true);
  const order = useMemo(() => optionOrder(item.options, item.sentence), [item]);
  const wrongIdx = toks.indexOf(item.wrong);
  const fixed = toks.map((t, k) => (k === wrongIdx ? (item.right === '(no word)' ? '' : item.right) : t)).filter(Boolean).join(' ');
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-navy-50 p-4">
        {toks.map((t, k) => (
          <button key={k} disabled={tapped !== null}
            onClick={() => {
              if (k === wrongIdx) setTapped(k);
              else { setMiss(k); setFirstTry(false); }
            }}
            className={`min-h-[52px] rounded-xl border-2 px-3 text-2xl font-semibold transition ${k === tapped ? 'border-coral bg-coral-50 text-coral-800 line-through' : k === miss ? 'border-sun bg-sun-50 animate-wiggle' : 'border-transparent bg-white text-navy hover:border-navy-200'}`}>{t}</button>
        ))}
      </div>
      {miss !== null && tapped === null && <p className="mb-3 text-lg font-semibold text-sun-700">That word is OK. Look again! 👀</p>}
      {tapped !== null && (
        <>
          <p className="mb-2 text-lg font-semibold text-navy">Choose the right word:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {order.map((k) => item.options[k]).map((o) => (
              <Option key={o} disabled={res !== null} state={res === null ? 'idle' : o === item.right ? (res ? 'correct' : 'reveal') : 'idle'}
                onClick={() => {
                  setRes(o === item.right);
                  onAnswer({ correct: o === item.right && firstTry, skill: 'grammar', grammar: item.grammar ?? tagGrammar });
                }}>{o}</Option>
            ))}
          </div>
        </>
      )}
      {res !== null && (
        <div className="mt-4">
          <Feedback ok={res} en={res ? 'Well done!' : 'Nice try!'} ar={res ? 'أحسنت!' : 'محاولة جيدة!'} detail={<span>Correct: <b>{fixed}</b></span>} />
          <NextButton last={last} onClick={() => onNext(res && firstTry)} />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ picture selection
export function PictureChoice({ activity, onAnswer, onDone }: ActivityProps<'picture'>) {
  const { data } = useApp();
  const { i, next } = useSteps(activity.items.length, onDone);
  const item = activity.items[i];
  const w = getWord(item.word);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    setPicked(null);
    if (w) speak(w.word, { rate: data.settings.speechRate });
  }, [i, w, data.settings.speechRate]);
  const ok = picked === item.answer;
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <div className="mb-5 flex items-center gap-3">
        <Button size="lg" onClick={() => w && speak(w.word, { rate: data.settings.speechRate })}><Volume2 /> Listen again</Button>
        {picked && <span className="text-2xl font-bold text-navy">{w?.word}</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {item.options.map((o) => (
          <button key={o} disabled={picked !== null} onClick={() => { setPicked(o); onAnswer({ correct: o === item.answer, skill: 'vocabulary', word: item.word }); }}
            aria-label={picked ? getWord(o)?.word : `Picture ${item.options.indexOf(o) + 1}`}
            className={`grid aspect-square place-items-center rounded-3xl border-4 bg-white text-6xl shadow-card transition sm:text-7xl ${picked === null ? 'border-transparent hover:border-navy-200' : o === item.answer ? 'border-mint bg-mint-50' : o === picked ? 'border-coral bg-coral-50' : 'border-transparent opacity-50'}`}>
            <span>{wordImage(o) ?? '❓'}</span>
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4">
          <Feedback ok={ok} en={ok ? praise() : `${encourage()} This is “${w?.word}”.`} ar={ok ? praiseAr() : encourageAr()} />
          <NextButton last={i + 1 === activity.items.length} onClick={() => next(ok)} />
        </div>
      )}
    </Shell>
  );
}

// ------------------------------------------------------------------ reading
export function Reading({ activity, onAnswer, onDone }: ActivityProps<'reading'>) {
  const { i, next } = useSteps(activity.questions.length, onDone);
  const [res, setRes] = useState<boolean | null>(null);
  const item = activity.questions[i];
  return (
    <Shell activity={activity} step={i} steps={activity.questions.length}>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border-2 border-sky-200 bg-sky-50 p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-navy">{activity.textTitle}</h3>
            <div className="flex gap-2"><AudioButton text={activity.text} size="sm" /><AudioButton text={activity.text} slow size="sm" /></div>
          </div>
          {activity.text.split('\n').map((p, k) => <p key={k} className="mb-2 text-lg leading-relaxed text-navy">{p}</p>)}
        </article>
        <div>
          <McqQuestion key={i} item={item} onResult={(ok) => { setRes(ok); onAnswer({ correct: ok, skill: 'reading' }); }} />
          {res !== null && <NextButton last={i + 1 === activity.questions.length} onClick={() => { const r = res; setRes(null); next(r); }} />}
        </div>
      </div>
    </Shell>
  );
}
