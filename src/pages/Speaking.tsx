import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mic, ArrowLeft, ArrowRight, Headphones, Repeat2, Play } from 'lucide-react';
import { ROLE_PLAYS, SPEAKING_PART1 } from '../data/speaking';
import { useApp } from '../store';
import { recordSpeaking } from '../lib/learner';
import { speak, speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { stripMarkup } from '../lib/text';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { Recorder } from '../components/Recorder';
import { AudioButton } from '../components/AudioButton';
import { Markup } from '../components/Markup';
import { Ar, Button, Card, EmptyState, Feedback, LinkButton, PageHeader, Pill, Tabs } from '../components/ui';
import { recordingSupported } from '../lib/recorder';

export function SpeakingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Speaking" ar="التحدث" sub="Listen → Repeat → Record → Replay. Every try makes you stronger." icon={<Mic />} />
      {!recordingSupported() && <p className="rounded-2xl bg-sky-50 p-4 text-navy">🎙️ Recording is not available in this browser. You can still listen, repeat and practise with a partner.</p>}
      <section>
        <h2 className="mb-3 text-xl font-bold text-navy">Role plays</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_PLAYS.map((r) => (
            <Link key={r.id} to={`/speaking/${r.id}`} className="flex flex-col gap-2 rounded-3xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-coral">
              <span className="text-4xl" aria-hidden="true">{r.icon}</span>
              <span className="text-lg font-bold text-navy">{r.title}</span>
              <Ar className="text-sm">{r.titleAr}</Ar>
              <span className="text-sm text-navy-400">“{r.dialogue.title}” · {r.dialogue.lines.length} lines</span>
            </Link>
          ))}
        </div>
      </section>
      <SpeakingQuestions />
    </div>
  );
}

function SpeakingQuestions() {
  const { me, updateStudent } = useApp();
  const [i, setI] = useState(0);
  const q = SPEAKING_PART1[i];
  const [show, setShow] = useState(false);
  useEffect(() => setShow(false), [i]);
  return (
    <section>
      <h2 className="mb-1 text-xl font-bold text-navy">Questions about you (A1 Speaking Part 1)</h2>
      <Ar>أسئلة عنك — الجزء الأول من اختبار التحدث</Ar>
      <Card className="mt-3">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="navy">Question {i + 1} of {SPEAKING_PART1.length}</Pill>
          <span className="text-sm text-navy-400">Answer in a full sentence. Add one more idea.</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <AudioButton text={q.q} size="lg" />
          <AudioButton text={q.q} slow />
          <div>
            <p className="text-2xl font-bold text-navy sm:text-3xl">{q.q}</p>
            <Ar className="text-lg">{q.ar}</Ar>
          </div>
        </div>
        <div className="mt-4"><Recorder key={i} label="Record my answer" onRecorded={() => me && updateStudent((s) => recordSpeaking(s, { recorded: true, ref: `part1-${i}` }))} /></div>
        {show ? (
          <div className="mt-4 rounded-2xl bg-mint-50 p-4">
            <div className="flex items-center justify-between"><b className="text-mint-700">Example answer</b><AudioButton text={`${q.model} ${q.more ?? ''}`} size="sm" /></div>
            <p className="text-lg text-navy">{q.model} {q.more && <span className="text-navy-500">+ {q.more}</span>}</p>
            {q.tip && <p className="mt-1 text-sun-700">★ {q.tip}</p>}
          </div>
        ) : (
          <Button variant="soft" className="mt-4" onClick={() => setShow(true)}>Show an example answer</Button>
        )}
        <div className="mt-5 flex justify-between">
          <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={18} /> Back</Button>
          <Button disabled={i + 1 >= SPEAKING_PART1.length} onClick={() => setI(i + 1)}>Next question <ArrowRight size={18} /></Button>
        </div>
      </Card>
    </section>
  );
}

type Step = 'listen' | 'repeat' | 'record' | 'replay';

export function RolePlayPage() {
  const { id } = useParams();
  const rp = ROLE_PLAYS.find((r) => r.id === id);
  const { me, updateStudent, data } = useApp();
  const [step, setStep] = useState<Step>('listen');
  const [line, setLine] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [recs, setRecs] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!rp) return <EmptyState icon="🤔" title="Role play not found" action={<LinkButton to="/speaking">All role plays</LinkButton>} />;
  const lines = rp.dialogue.lines;
  const speakers = [...new Set(lines.map((l) => l[0]))];
  const rate = data.settings.speechRate;

  const finish = () => {
    if (me && !saved) updateStudent((s) => recordSpeaking(s, { recorded: Object.keys(recs).length > 0, ref: rp.id, confidence: 4 }));
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <LinkButton to="/speaking" variant="outline" size="sm"><ArrowLeft size={18} /> Speaking</LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">{rp.icon} {rp.title}</h1>
          <Ar>{rp.titleAr}</Ar>
        </div>
      </div>
      <Tabs<Step> value={step} onChange={(s) => { stopSpeaking(); setStep(s); setLine(0); }} tabs={[
        { id: 'listen', label: <span className="flex items-center gap-1"><Headphones size={16} /> 1 Listen</span> },
        { id: 'repeat', label: <span className="flex items-center gap-1"><Repeat2 size={16} /> 2 Repeat</span> },
        { id: 'record', label: <span className="flex items-center gap-1"><Mic size={16} /> 3 Record</span> },
        { id: 'replay', label: <span className="flex items-center gap-1"><Play size={16} /> 4 Replay</span> },
      ]} />

      {step === 'listen' && (
        <Card>
          <p className="mb-3 text-lg text-navy">Listen to the whole dialogue. Read the words. Try it slowly too.</p>
          <DialoguePlayer dialogue={rp.dialogue} large />
          <div className="mt-4 flex justify-end"><Button onClick={() => setStep('repeat')}>Next: Repeat <ArrowRight size={18} /></Button></div>
        </Card>
      )}

      {step === 'repeat' && (
        <Card>
          <p className="mb-2 text-navy-400">Line {line + 1} of {lines.length}</p>
          <div className="rounded-3xl bg-navy p-6 text-white sm:p-8">
            <Pill tone="coral">{lines[line][0]}</Pill>
            <p className="mt-3 text-3xl font-bold leading-snug sm:text-4xl"><Markup text={lines[line][1]} className="[&_strong]:text-sky" /></p>
            <div className="mt-5 flex gap-3">
              <AudioButton text={stripMarkup(lines[line][1])} size="lg" className="!bg-coral" />
              <AudioButton text={stripMarkup(lines[line][1])} slow size="lg" />
            </div>
          </div>
          <p className="mt-3 text-lg text-navy">Now say it. Say it again — a little faster!</p>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" disabled={line === 0} onClick={() => setLine(line - 1)}><ArrowLeft size={18} /> Back</Button>
            {line + 1 < lines.length
              ? <Button onClick={() => { setLine(line + 1); if (ttsSupported()) speak(stripMarkup(lines[line + 1][1]), { rate }); }}>Next line <ArrowRight size={18} /></Button>
              : <Button variant="success" onClick={() => { setStep('record'); setLine(0); }}>Next: Record <ArrowRight size={18} /></Button>}
          </div>
        </Card>
      )}

      {step === 'record' && (
        <Card>
          {!role ? (
            <div>
              <h2 className="text-xl font-bold text-navy">Choose your role</h2>
              <Ar>اختر دورك</Ar>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {speakers.map((sp) => <Button key={sp} variant="outline" size="lg" onClick={() => setRole(sp)}>I am {sp}</Button>)}
              </div>
              <p className="mt-3 text-navy-400">The app says the other lines. You record your lines.</p>
            </div>
          ) : (
            <RecordWalk lines={lines} role={role} recs={recs} onRec={(k, u) => setRecs((r) => ({ ...r, [k]: u }))} onDone={() => { setStep('replay'); finish(); }} />
          )}
        </Card>
      )}

      {step === 'replay' && (
        <Card>
          <h2 className="mb-1 text-xl font-bold text-navy">Replay the dialogue with your voice</h2>
          <Ar>استمع إلى الحوار بصوتك</Ar>
          <ol className="mt-3 space-y-2">
            {lines.map(([who, text], k) => (
              <li key={k} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${who === role ? 'bg-coral-50' : 'bg-navy-50'}`}>
                <Pill tone={who === role ? 'coral' : 'navy'}>{who === role ? `You (${who})` : who}</Pill>
                <span className="flex-1 text-lg text-navy"><Markup text={text} /></span>
                {who === role && recs[k] ? (
                  <Button variant="success" size="sm" onClick={() => new Audio(recs[k]).play()}><Play size={16} /> My voice</Button>
                ) : (
                  <AudioButton text={stripMarkup(text)} size="sm" />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Feedback ok en={Object.keys(recs).length ? 'Brave speaker! You did the whole role play. 🎤' : 'Well done! Practise it with a partner too.'} ar="أحسنت! أنت متحدث شجاع." />
          </div>
          {!saved && <Button className="mt-3" variant="success" onClick={finish}>Finish</Button>}
        </Card>
      )}
    </div>
  );
}

function RecordWalk({ lines, role, recs, onRec, onDone }: { lines: [string, string][]; role: string; recs: Record<number, string>; onRec: (k: number, url: string) => void; onDone: () => void }) {
  const { data } = useApp();
  const [k, setK] = useState(0);
  const [who, text] = lines[k];
  const mine = who === role;
  useEffect(() => {
    if (!mine && ttsSupported()) speakLines([{ speaker: who, text }], { rate: data.settings.speechRate });
  }, [k, mine, who, text, data.settings.speechRate]);
  return (
    <div>
      <p className="mb-2 text-navy-400">Line {k + 1} of {lines.length}</p>
      <div className={`rounded-3xl p-6 ${mine ? 'bg-coral-50 ring-2 ring-coral' : 'bg-navy-50'}`}>
        <Pill tone={mine ? 'coral' : 'navy'}>{mine ? 'Your line' : who}</Pill>
        <p className="mt-3 text-2xl font-bold text-navy sm:text-3xl"><Markup text={text} /></p>
        {!mine && <div className="mt-3"><AudioButton text={stripMarkup(text)} /></div>}
        {mine && <div className="mt-4"><Recorder key={k} keep onRecorded={(u) => onRec(k, u)} label="Record my line" /></div>}
        {mine && recs[k] && <p className="mt-2 font-semibold text-mint-700">✓ Recorded</p>}
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={k === 0} onClick={() => setK(k - 1)}><ArrowLeft size={18} /> Back</Button>
        {k + 1 < lines.length ? <Button onClick={() => setK(k + 1)}>Next <ArrowRight size={18} /></Button> : <Button variant="success" onClick={onDone}>Next: Replay <ArrowRight size={18} /></Button>}
      </div>
    </div>
  );
}
