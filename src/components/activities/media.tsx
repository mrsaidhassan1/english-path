// Flashcards, grammar, dialogue, listen & repeat, speaking and writing activities.
import { useMemo, useState } from 'react';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { Ar, Button, Feedback, Pill } from '../ui';
import { AudioButton } from '../AudioButton';
import { Markup } from '../Markup';
import { DialoguePlayer } from '../DialoguePlayer';
import { Recorder } from '../Recorder';
import { getWord } from '../../data/content';
import { wordImage } from '../../data/images';
import { useApp } from '../../store';
import { markWordsSeen, recordSpeaking, recordWord } from '../../lib/learner';
import { stripMarkup, wordCount } from '../../lib/text';
import { NextButton, Shell, type ActivityProps } from './common';
import type { GrammarPoint, WritingTask } from '../../types';
import { CRITERIA, marksTotal, WRITING_MAX } from '../../data/writingRubric';
import { analyseWriting, writingChecklist, type WritingAnalysis } from '../../data/writingCheck';
import { headwayWritingGuide } from '../../data/headwayWriting';

const PANEL: Record<GrammarPoint['colour'], string> = {
  navy: 'border-navy-200 bg-navy-50',
  coral: 'border-coral-200 bg-coral-50',
  sky: 'border-sky-300 bg-sky-50',
  mint: 'border-mint/30 bg-mint-50',
  sun: 'border-sun/50 bg-sun-50',
};

// ------------------------------------------------------------------ flashcards
export function WordCard({ id, onKnow, onAgain, big = false }: { id: string; onKnow?: () => void; onAgain?: () => void; big?: boolean }) {
  const { data } = useApp();
  const w = getWord(id);
  if (!w) return null;
  const img = wordImage(id);
  return (
    <article className="relative overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card">
      <div className="flex items-center justify-center bg-gradient-to-br from-sky-50 to-navy-50 py-6 text-7xl sm:text-8xl" aria-hidden="true">
        {img ?? <span className="grid h-24 w-24 place-items-center rounded-3xl bg-navy text-5xl font-bold text-white">{w.word[0].toUpperCase()}</span>}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`${big ? 'text-4xl' : 'text-3xl'} font-bold text-navy`}>{w.word}</h3>
            <div className="mt-1 flex flex-wrap gap-2">
              <Pill tone="grey">{w.pos}</Pill>
              {w.oxfordA1 && <Pill tone="mint">Oxford A1</Pill>}
            </div>
          </div>
          <div className="flex gap-2"><AudioButton text={w.word} /><AudioButton text={w.word} slow /></div>
        </div>
        {data.settings.arabic && <p dir="rtl" lang="ar" className="mt-3 font-arabic text-2xl text-coral-700">{w.ar}</p>}
        <p className="mt-2 text-lg text-navy-500">{w.meaning}</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-navy-50 p-3">
          <p className="flex-1 text-lg font-semibold text-navy">“{w.example}”</p>
          <AudioButton text={w.example} size="sm" />
        </div>
        {(onKnow || onAgain) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="soft" size="lg" onClick={onAgain}><RotateCcw size={20} /> Practise again</Button>
            <Button variant="success" size="lg" onClick={onKnow}><Check size={20} /> I know this</Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function Flashcards({ activity, onDone }: ActivityProps<'flashcards'>) {
  const { updateStudent, me } = useApp();
  const [i, setI] = useState(0);
  const [known, setKnown] = useState(0);
  const words = activity.words;
  const id = words[i];
  const go = (know: boolean) => {
    if (me) updateStudent((s) => { markWordsSeen(s, [id]); recordWord(s, id, know); });
    const k = known + (know ? 1 : 0);
    if (i + 1 >= words.length) onDone({ score: 0, total: 0 });
    else { setKnown(k); setI(i + 1); }
  };
  return (
    <Shell activity={activity}>
      <div className="mb-3 flex items-center justify-between text-navy-400">
        <span className="font-semibold">Word {i + 1} of {words.length}</span>
        <button className="min-h-[44px] px-3 font-semibold underline" onClick={() => onDone({ score: 0, total: 0 })}>Skip to practice</button>
      </div>
      <div className="mx-auto max-w-md">
        <WordCard key={id} id={id} onKnow={() => go(true)} onAgain={() => go(false)} />
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------ grammar explanation
export function GrammarPanel({ p }: { p: GrammarPoint }) {
  const { isTeacher } = useApp();
  return (
    <section className={`rounded-3xl border-2 p-5 ${PANEL[p.colour]}`}>
      <h3 className="text-2xl font-bold text-navy">{p.title}</h3>
      <Ar className="text-lg">{p.titleAr}</Ar>
      <ul className="mt-3 space-y-1">
        {p.explain.map((e, k) => <li key={k} className="text-lg text-navy">• <Markup text={e} colour={p.colour} /></li>)}
      </ul>
      {p.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] overflow-hidden rounded-2xl bg-white text-left text-lg">
            <thead><tr>{p.table.head.map((h) => <th key={h} className="bg-navy px-3 py-2 text-white">{h}</th>)}</tr></thead>
            <tbody>{p.table.rows.map((r, k) => <tr key={k} className="border-t border-navy-50">{r.map((c, j) => <td key={j} className="px-3 py-2 text-navy">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {p.examples.map((ex, k) => (
          <div key={k} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2">
            <span className="flex-1 text-lg text-navy"><Markup text={ex} colour={p.colour} /></span>
            <AudioButton text={stripMarkup(ex)} size="sm" />
          </div>
        ))}
      </div>
      {p.watch && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-coral-300 bg-white px-4 py-3">
          <div className="font-bold text-coral-700">⚠️ Watch out!</div>
          <div className="text-lg text-navy"><Markup text={p.watch} colour={p.colour} /></div>
          <Ar>{p.watchAr}</Ar>
        </div>
      )}
      {isTeacher && p.src && <p className="mt-3 text-xs text-navy-400">Source: {p.src.label}</p>}
    </section>
  );
}

export function Grammar({ activity, onDone }: ActivityProps<'grammar'>) {
  return (
    <Shell activity={activity}>
      <div className="space-y-5">{activity.points.map((p, k) => <GrammarPanel key={k} p={p} />)}</div>
      <NextButton last label="I understand" onClick={() => onDone({ score: 0, total: 0 })} />
    </Shell>
  );
}

export function Watch({ activity, onDone }: ActivityProps<'watch'>) {
  const [heard, setHeard] = useState(false);
  return (
    <Shell activity={activity}>
      <DialoguePlayer dialogue={activity.dialogue} onFinished={() => setHeard(true)} />
      <NextButton last label={heard ? 'Next' : 'I read it'} onClick={() => onDone({ score: 0, total: 0 })} />
    </Shell>
  );
}

// ------------------------------------------------------------------ listen and repeat
export function ListenRepeat({ activity, onDone }: ActivityProps<'listen'>) {
  const { updateStudent, me } = useApp();
  const [i, setI] = useState(0);
  const item = activity.items[i];
  const [rec, setRec] = useState(false);
  const next = () => {
    if (i + 1 >= activity.items.length) {
      if (me) updateStudent((s) => recordSpeaking(s, { recorded: rec, ref: activity.id }));
      onDone({ score: 0, total: 0 });
    } else setI(i + 1);
  };
  return (
    <Shell activity={activity} step={i} steps={activity.items.length}>
      <div className="rounded-3xl bg-navy p-6 text-center text-white sm:p-10">
        <p className="text-3xl font-bold leading-snug sm:text-4xl">{item.text}</p>
        <Ar className="mt-2 text-sky-200">{item.ar}</Ar>
        <div className="mt-6 flex justify-center gap-3">
          <AudioButton text={item.text} size="lg" className="!bg-coral" />
          <AudioButton text={item.text} slow size="lg" />
        </div>
      </div>
      <ol className="my-4 grid gap-2 text-lg text-navy sm:grid-cols-4">
        <li className="rounded-2xl bg-navy-50 px-4 py-3">1️⃣ Listen</li>
        <li className="rounded-2xl bg-navy-50 px-4 py-3">2️⃣ Repeat</li>
        <li className="rounded-2xl bg-navy-50 px-4 py-3">3️⃣ Record</li>
        <li className="rounded-2xl bg-navy-50 px-4 py-3">4️⃣ Replay</li>
      </ol>
      <Recorder key={i} onRecorded={() => setRec(true)} />
      <NextButton last={i + 1 === activity.items.length} label={i + 1 === activity.items.length ? 'Finish' : 'I said it — next'} onClick={next} />
    </Shell>
  );
}

// ------------------------------------------------------------------ speaking task
const FACES = ['😟', '🙁', '😐', '🙂', '😄'];
export function Speak({ activity, onDone }: ActivityProps<'speak'>) {
  const { updateStudent, me } = useApp();
  const t = activity.task;
  const [recorded, setRecorded] = useState(false);
  const [conf, setConf] = useState<number | null>(null);
  return (
    <Shell activity={activity}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-navy-100 p-5">
          <h3 className="mb-2 text-xl font-bold text-navy">Say these things:</h3>
          <ol className="space-y-2">{t.steps.map((s, k) => <li key={k} className="flex gap-3 text-lg text-navy"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral text-white">{k + 1}</span>{s}</li>)}</ol>
        </div>
        <div className="rounded-3xl bg-sky-50 p-5">
          <h3 className="mb-2 text-xl font-bold text-navy">Useful language</h3>
          <ul className="space-y-2">
            {t.usefulLanguage.map(([en, ar], k) => (
              <li key={k} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
                <span className="flex-1"><span className="text-lg font-semibold text-navy">{en}</span><Ar>{ar}</Ar></span>
                <AudioButton text={en.replace(/…/g, '')} size="sm" />
              </li>
            ))}
          </ul>
          {t.model && (
            <div className="mt-3 rounded-2xl bg-white p-3">
              <div className="mb-1 flex items-center justify-between"><span className="font-bold text-navy">Example</span><AudioButton text={t.model} size="sm" /></div>
              <p className="text-navy-500">{t.model}</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 rounded-3xl border-2 border-coral-100 bg-coral-50/50 p-5">
        <h3 className="mb-3 text-xl font-bold text-navy">Your turn 🎤</h3>
        <Recorder onRecorded={() => setRecorded(true)} label="Record my answer" />
        <h4 className="mt-5 font-bold text-navy">How do you feel about speaking now?</h4>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Speaking confidence">
          {FACES.map((f, k) => (
            <button key={k} role="radio" aria-checked={conf === k + 1} aria-label={`Confidence ${k + 1} of 5`} onClick={() => setConf(k + 1)}
              className={`grid h-14 w-14 place-items-center rounded-2xl text-3xl transition ${conf === k + 1 ? 'bg-navy ring-4 ring-sky' : 'bg-white hover:bg-navy-50'}`}>{f}</button>
          ))}
        </div>
      </div>
      {(recorded || conf) && (
        <div className="mt-4">
          <Feedback ok en={recorded ? 'Brave speaker! Listen to yourself and try once more.' : 'Thank you! Speaking a little every day helps a lot.'} ar="أحسنت! التحدث كل يوم يبني الثقة." />
        </div>
      )}
      <NextButton last label="Finish" onClick={() => {
        if (me) updateStudent((s) => recordSpeaking(s, { recorded, confidence: conf ?? undefined, ref: activity.id }));
        onDone({ score: 0, total: 0 });
      }} />
    </Shell>
  );
}

// ------------------------------------------------------------------ writing
// The student's checklist follows the A1 writing rubric (Content, Organisation, Language), in the words of the
// task's Headway unit and kind of writing (writingChecklist in data/writingCheck.ts).

export function WritingBox({ task, source, onSubmitted }: { task: WritingTask; source: string; onSubmitted: (selfCheck: number, text: string) => void }) {
  const { update, me, isTeacher } = useApp();
  const [text, setText] = useState('');
  const checklist = useMemo(() => writingChecklist({ title: task.title, prompt: task.prompt, bullets: task.bullets, model: task.model, frame: task.frame }), [task]);
  const [checks, setChecks] = useState<boolean[]>(() => checklist.map(() => false));
  const [sent, setSent] = useState(false);
  const words = wordCount(text);
  const autoHints = useMemo(() => {
    const h: string[] = [];
    if (text && !/^[A-Z]/.test(text.trim())) h.push('Start with a capital letter.');
    if (text && !/[.!?]$/.test(text.trim())) h.push('End with a full stop.');
    if (/\bi\b/.test(text)) h.push('Write “I” as a capital letter.');
    return h;
  }, [text]);
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const submit = () => {
    const self = checks.filter(Boolean).length;
    const a = analyseWriting(text, { title: task.title, prompt: task.prompt, bullets: task.bullets, model: task.model, frame: task.frame });
    const est = a.marks;
    if (me) {
      update((d) => {
        d.writing.unshift({ id: `wr-${Date.now()}`, studentId: me.id, taskTitle: task.title, prompt: task.prompt, bullets: task.bullets, text, words, selfCheck: self, estimate: est, createdAt: new Date().toISOString(), source });
      });
    }
    setAnalysis(a);
    setSent(true);
    onSubmitted(marksTotal(est), text);
  };
  return (
    <div>
      <div className="mb-4 rounded-3xl bg-navy-50 p-5">
        <h3 className="text-xl font-bold text-navy">‘{task.title}’</h3>
        <p className="text-lg text-navy">{task.prompt}</p>
        <ul className="mt-2 space-y-1">{task.bullets.map((b, k) => <li key={k} className="text-lg text-navy">✏️ {b}</li>)}</ul>
      </div>
      {task.frame && !sent && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 px-4 py-3">
          <span className="flex-1 text-navy"><b>Help:</b> {task.frame}</span>
          <Button variant="soft" size="sm" onClick={() => setText(task.frame!.replace(/_{2,}/g, '…'))}><Sparkles size={16} /> Use this frame</Button>
        </div>
      )}
      <label className="sr-only" htmlFor={`wr-${source}`}>Your writing</label>
      <textarea id={`wr-${source}`} value={text} onChange={(e) => setText(e.target.value)} readOnly={sent} rows={6}
        className="w-full rounded-2xl border-2 border-navy-100 p-4 text-xl leading-relaxed text-navy outline-none focus:border-navy" placeholder="Write here…" spellCheck={false} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Pill tone={words >= task.minWords ? 'mint' : 'sun'}>{words} words {words >= task.minWords ? '✓' : `(aim for ${task.minWords}–35)`}</Pill>
        {autoHints.length > 0 && !sent && <span className="text-sun-700">💡 {autoHints[0]}</span>}
      </div>
      {!sent && (
        <div className="mt-4 rounded-2xl border-2 border-navy-100 p-4">
          <h4 className="mb-2 font-bold text-navy">Check your writing ✔</h4>
          {checklist.map(({ area, en, ar }, k) => (
            <label key={k} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-lg text-navy">
              <input type="checkbox" className="h-6 w-6" checked={checks[k]} onChange={(e) => { const v = e.target.checked; setChecks((cs) => cs.map((c, j) => (j === k ? v : c))); }} />
              <span><span className="mr-2 rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-navy-500">{area}</span>{en}<Ar>{ar}</Ar></span>
            </label>
          ))}
          <Button className="mt-3" size="lg" variant="success" disabled={words < 5} onClick={submit}>Send to my teacher</Button>
        </div>
      )}
      {sent && (
        <div className="mt-4 space-y-3">
          <Feedback ok en={words >= task.minWords ? 'Great writing! Your teacher will read it.' : 'Thank you! Next time, try to write a little more.'} ar="شكراً! سيقرأ معلمك كتابتك." />
          {analysis && <WritingEstimate a={analysis} />}
          <div className="rounded-2xl bg-mint-50 p-4">
            <div className="mb-1 flex items-center justify-between"><b className="text-mint-700">Model answer</b><AudioButton text={task.model} size="sm" /></div>
            <p className="text-lg text-navy">{task.model}</p>
          </div>
        </div>
      )}
      {isTeacher && !me && <p className="mt-2 text-sm text-navy-400">Teacher preview: writing is saved only when a student is signed in.</p>}
    </div>
  );
}

/** The app's first check with the A1 writing rubric: marks, what to fix, points covered. The teacher gives the real mark. */
function WritingEstimate({ a }: { a: WritingAnalysis }) {
  const marks = a.marks;
  return (
    <div className="rounded-2xl border-2 border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-navy">Your writing (first check)</b>
        <Pill tone="sky">{marksTotal(marks)}/{WRITING_MAX}</Pill>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {CRITERIA.map((c) => (
          <div key={c.key} className="rounded-xl bg-navy-50 px-3 py-2">
            <div className="flex items-center justify-between font-bold text-navy"><span>{c.label}</span><span>{marks[c.key]}/5</span></div>
            <Ar className="text-sm">{c.ar}</Ar>
          </div>
        ))}
      </div>
      {a.bullets.length > 0 && (
        <ul className="mt-3 space-y-1">
          {a.bullets.map((b) => (
            <li key={b.text} className={`flex items-center gap-2 ${b.covered ? 'text-mint-700' : 'text-coral-700'}`}>
              <span aria-hidden="true">{b.covered ? '✔' : '✘'}</span> {b.text} <span className="sr-only">{b.covered ? '(done)' : '(missing)'}</span>
            </li>
          ))}
        </ul>
      )}
      <h4 className="mt-3 font-bold text-navy">To make it better</h4>
      <ul className="mt-1 space-y-1.5">
        {a.tips.map((t) => <li key={t.en} className="text-navy">💡 {t.en}<Ar className="text-sm">{t.ar}</Ar></li>)}
      </ul>
      <p className="mt-1 text-sm text-navy-400">
        This is a first check by the app{a.unit ? `, with what you studied in Unit ${a.unit} (${headwayWritingGuide(a.unit)!.title})` : ''}. Your teacher gives the real mark.
      </p>
    </div>
  );
}

export function Write({ activity, onAnswer, onDone }: ActivityProps<'write'>) {
  const [done, setDone] = useState<number | null>(null);
  return (
    <Shell activity={activity}>
      <WritingBox task={activity.task} source={activity.id} onSubmitted={(total) => { setDone(total); onAnswer({ correct: total >= 9, skill: 'writing' }); }} />
      {done !== null && <NextButton last onClick={() => onDone({ score: done, total: WRITING_MAX })} />}
    </Shell>
  );
}
