// Printable / shareable student progress report, with photo and monster-avatar management.
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Printer, RefreshCw, Smile, Trash2, Copy, Award } from 'lucide-react';
import type { Cefr } from '../types';
import { MODULES } from '../data/modules';
import { getWord } from '../data/content';
import { GRAMMAR_KEYS } from '../data/grammarKeys';
import { useApp } from '../store';
import { resizePhoto } from '../lib/image';
import { newSeed } from '../lib/rng';
import { countByStatus } from '../lib/srs';
import { currentModule, moduleProgress, moduleScore, overallProgress, speakingConfidence, strengthsAndNeeds } from '../lib/progress';
import { recommend } from '../lib/recommend';
import { niceDate } from '../lib/date';
import { BADGES } from '../lib/learner';
import { Avatar } from '../components/Avatar';
import { LogoMark, APP_NAME } from '../components/Logo';
import { Monster } from '../components/Monster';
import { Button, Card, EmptyState, LinkButton, Pill, ProgressBar } from '../components/ui';
import { SkillBars, earnedCertificates } from './Progress';
import { nameOf, refreshNameFlags } from '../lib/classes';
import { canPrint } from '../lib/env';
import { ask } from '../components/Confirm';

export default function StudentReport() {
  const { id } = useParams();
  const { data, update, updateStudent, toast } = useApp();
  const nav = useNavigate();
  const s = data.students.find((x) => x.id === id);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(s?.firstName ?? '');
  const [surname, setSurname] = useState(s?.lastName ?? '');
  if (!s) return <EmptyState icon="🤔" title="Student not found" action={<LinkButton to="/teacher?tab=students">Back to students</LinkButton>} />;

  const m = currentModule(s);
  const words = countByStatus(s);
  const { strengths, needs } = strengthsAndNeeds(s);
  const recs = recommend(s, data.assignments).slice(0, 3);
  const conf = speakingConfidence(s);
  const certs = earnedCertificates(s);
  const partners = (s.partnerNos ?? []).map((no) => data.students.find((x) => x.classId === s.classId && x.rosterNo === no)).filter(Boolean);
  const partnerText = [partners.map((x) => `${nameOf(x!)} (#${x!.rosterNo})`).join(', '), s.pairNote].filter(Boolean).join(' · ');

  const upload = async (f: File) => {
    setBusy(true);
    try {
      const dataUrl = await resizePhoto(f);
      updateStudent((x) => { x.avatar = { kind: 'photo', dataUrl, seed: x.avatar.seed }; }, s.id);
      toast('Photo saved on this device.', 'good');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not use this photo.', 'warn');
    }
    setBusy(false);
  };

  const summary = () => [
    `${nameOf(s)} — ${APP_NAME} progress report (${niceDate(new Date().toISOString())})`,
    `Level ${s.level} · Unit ${m.n}: ${m.title} · course ${overallProgress(s)}%`,
    `Streak ${s.streak.count} days · words learned ${words.learning + words.review + words.mastered} · mastered ${words.mastered}`,
    `Strengths: ${strengths.join(', ') || '—'} · Practise: ${needs.join(', ') || '—'}`,
    `Next steps: ${recs.map((r) => r.title).join('; ')}`,
  ].join('\n');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => nav('/teacher?tab=students')}><ArrowLeft size={18} /> Students</Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(summary()); toast('Report summary copied — paste it into a message.', 'good'); } catch { toast('Copy is not available here.', 'warn'); } }}><Copy size={16} /> Copy summary</Button>
        {canPrint && <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print / PDF</Button>}
      </div>

      <Card className="print:hidden">
        <h2 className="mb-3 text-lg font-bold text-navy">Photo or monster avatar</h2>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar student={s} size={110} ring />
          {s.avatar.kind === 'photo' && <div className="text-center"><div className="mx-auto w-fit rounded-full bg-navy-50"><Monster seed={s.avatar.seed} size={64} /></div><div className="text-xs text-navy-400">Saved monster</div></div>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><Camera size={18} /> Upload Photo</Button>
            <Button variant="outline" disabled={s.avatar.kind === 'monster'} onClick={async () => { if (await ask(`Replace ${nameOf(s)}'s photo with the monster avatar?`, 'Use monster')) updateStudent((x) => { x.avatar = { kind: 'monster', seed: x.avatar.seed }; }, s.id); }}><Smile size={18} /> Use Monster Avatar</Button>
            <Button variant="outline" onClick={() => {
              if (s.avatar.kind === 'photo') {
                updateStudent((x) => { x.avatar = { ...x.avatar, seed: newSeed() }; }, s.id);
                toast('New monster saved. The photo is still shown.', 'info');
              } else updateStudent((x) => { x.avatar = { kind: 'monster', seed: newSeed() }; }, s.id);
            }}><RefreshCw size={18} /> Regenerate Monster</Button>
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          </div>
        </div>
        <p className="mt-2 text-sm text-navy-400">Photos are resized and kept only on this device. A real photo is never replaced unless you choose “Use Monster Avatar”.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block"><span className="text-sm font-semibold text-navy">First name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && update((d) => { const x = d.students.find((y) => y.id === s.id); if (x) x.firstName = name.trim().split(/\s+/)[0]; refreshNameFlags(d); })} className="mt-1 block min-h-[44px] rounded-xl border-2 border-navy-100 px-3" />
          </label>
          <label className="block"><span className="text-sm font-semibold text-navy">Surname</span>
            <input value={surname} onChange={(e) => setSurname(e.target.value)} onBlur={() => update((d) => { const x = d.students.find((y) => y.id === s.id); if (x) x.lastName = surname.trim() || undefined; refreshNameFlags(d); })} className="mt-1 block min-h-[44px] rounded-xl border-2 border-navy-100 px-3" />
          </label>
          <label className="block"><span className="text-sm font-semibold text-navy">Class</span>
            <select value={s.classId} onChange={async (e) => { const to = data.classes.find((c) => c.id === e.target.value); if (to && await ask(`Move ${nameOf(s)} to ${to.name}? Their progress moves with them.`)) update((d) => { const x = d.students.find((y) => y.id === s.id); if (x) x.classId = to.id; refreshNameFlags(d); }); }}
              className="mt-1 block min-h-[44px] rounded-xl border-2 border-navy-100 px-3">
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-sm font-semibold text-navy">Level</span>
            <select value={s.level} onChange={(e) => updateStudent((x) => { x.level = e.target.value as Cefr; }, s.id)} className="mt-1 block min-h-[44px] rounded-xl border-2 border-navy-100 px-3"><option>A0</option><option>A1</option></select>
          </label>
          {(s.iatcId || s.rosterNo || s.group) && (
            <div className="rounded-xl bg-navy-50 px-3 py-2 text-sm text-navy">
              {s.iatcId && <div>Student ID: <b>{s.iatcId}</b></div>}
              {s.rosterNo && <div>Roster no. {s.rosterNo}</div>}
              {s.group && <div>Group {s.group}{s.groupRole ? ` · ${s.groupRole}` : ''}</div>}
              {partnerText && <div>Partner: {partnerText}</div>}
            </div>
          )}
          <Button variant="ghost" className="text-coral-700" onClick={async () => { if (await ask(`Delete ${nameOf(s)} and all their results from this device?`, 'Delete', true)) { update((d) => { d.students = d.students.filter((x) => x.id !== s.id); d.writing = d.writing.filter((w) => w.studentId !== s.id); }); nav('/teacher?tab=students'); } }}><Trash2 size={18} /> Delete student</Button>
        </div>
      </Card>

      {/* Printable report */}
      <section className="print-page space-y-5 rounded-3xl bg-white p-6 shadow-card print:shadow-none">
        <header className="flex items-center gap-4 border-b-4 border-coral pb-4">
          <LogoMark size={48} />
          <div className="flex-1"><div className="text-sm font-bold text-navy-400">{APP_NAME}</div><h1 className="text-2xl font-bold text-navy">Progress report</h1></div>
          <div className="text-right text-sm text-navy-500">{niceDate(new Date().toISOString())}<br />{data.classes.find((c) => c.id === s.classId)?.name}{s.iatcId ? ` · ID ${s.iatcId}` : ''}</div>
        </header>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar student={s} size={88} />
          <div>
            <h2 className="text-3xl font-bold text-navy">{nameOf(s)}</h2>
            <div className="mt-1 flex flex-wrap gap-2"><Pill tone="navy">CEFR {s.level}</Pill><Pill tone="sky">Unit {m.n}: {m.title}</Pill><Pill tone="mint">Course {overallProgress(s)}%</Pill><Pill tone="coral">Streak {s.streak.count}</Pill></div>
            {s.group && <p className="mt-2 text-navy"><b>Group:</b> {s.group}{s.groupRole ? ` (${s.groupRole})` : ''}{partnerText ? ` · Partner: ${partnerText}` : ''}</p>}
            <p className="mt-2 text-navy"><b>Goal:</b> {s.goal} {s.interests.length > 0 && <span className="text-navy-500">· Interests: {s.interests.join(', ')}</span>}</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><h3 className="mb-2 font-bold text-navy">Skills</h3><SkillBars s={s} /></div>
          <div>
            <h3 className="mb-2 font-bold text-navy">Units</h3>
            <ul className="space-y-1.5">
              {MODULES.map((mm) => { const p = moduleProgress(s, mm); const sc = moduleScore(s, mm); return (
                <li key={mm.id} className="grid grid-cols-[9rem,1fr,3.5rem] items-center gap-2 text-sm"><span className="truncate text-navy">{mm.n}. {mm.title}</span><ProgressBar pct={p.pct} label={mm.title} /><span className="text-right text-navy-500">{sc !== null ? `${sc}%` : `${p.done}/${p.total}`}</span></li>
              ); })}
            </ul>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-navy-50 p-4">
            <h3 className="font-bold text-navy">Vocabulary</h3>
            <p className="text-navy">New {words.new} · Learning {words.learning} · Review {words.review} · Mastered {words.mastered}</p>
            <p className="mt-1 text-sm text-navy-500">Difficult: {s.practiseAgain.slice(0, 8).map((w) => getWord(w)?.word ?? w).join(', ') || '—'}</p>
          </div>
          <div className="rounded-2xl bg-navy-50 p-4">
            <h3 className="font-bold text-navy">Grammar</h3>
            <ul className="text-sm text-navy">
              {GRAMMAR_KEYS.filter((g) => s.grammarStats[g.key]).slice(0, 6).map((g) => { const v = s.grammarStats[g.key]; return <li key={g.key}>{g.label}: {Math.round((v.correct / Math.max(1, v.correct + v.wrong)) * 100)}% <span className="text-navy-400">({v.wrong} mistakes)</span></li>; })}
            </ul>
          </div>
          <div className="rounded-2xl bg-navy-50 p-4">
            <h3 className="font-bold text-navy">Speaking & participation</h3>
            <p className="text-navy">{s.speaking.tasks} tasks · {s.speaking.recordings} recordings · confidence {conf ?? '—'}/5</p>
            <p className="text-navy">Class answers: {s.participation.count} ({s.participation.correct} correct)</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-1 font-bold text-navy">Exams</h3>
            {s.exams.length === 0 ? <p className="text-navy-400">No exams yet.</p> : (
              <ul className="space-y-1 text-sm">{[...s.exams].reverse().slice(0, 5).map((r, k) => <li key={k} className="text-navy">{niceDate(r.date)} · {r.title}: <b>{r.score}/{r.total}</b>{r.reported && <b> · {r.reported}</b>} <span className="text-navy-400">({Object.entries(r.bySkill).map(([k2, v]) => `${k2} ${v!.score}/${v!.total}`).join(', ')})</span></li>)}</ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 font-bold text-navy">Strengths and next steps</h3>
            <p className="text-navy"><b>Strengths:</b> <span className="capitalize">{strengths.join(', ') || 'building'}</span></p>
            <p className="text-navy"><b>Practise:</b> <span className="capitalize">{needs.join(', ') || '—'}</span></p>
            <ul className="mt-1 list-disc pl-5 text-navy">{recs.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {BADGES.filter((b) => s.badges[b.id]).map((b) => <Pill key={b.id} tone="sun">{b.icon} {b.title}</Pill>)}
          {certs.map((c) => <LinkButton key={c.kind + c.id} to={`/certificate/${c.kind}/${encodeURIComponent(c.id)}?student=${s.id}`} variant="soft" size="sm" className="print:hidden"><Award size={16} /> {c.title}</LinkButton>)}
        </div>
      </section>
    </div>
  );
}
