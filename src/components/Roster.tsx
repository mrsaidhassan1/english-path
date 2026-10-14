// Visual class roster: student cards, a Class card, an Add pupils card, search and filters.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Flame, UserPlus, Users } from 'lucide-react';
import type { Cefr, Student } from '../types';
import { MODULES } from '../data/modules';
import { useApp } from '../store';
import { newStudent } from '../lib/learner';
import { nameOf, refreshNameFlags, splitName } from '../lib/classes';
import { currentModule, overallProgress } from '../lib/progress';
import { Avatar } from './Avatar';
import { Button, Modal, ProgressRing } from './ui';

type ProgFilter = 'all' | 'low' | 'mid' | 'high';
type PartFilter = 'all' | 'none' | 'some';

export function participationLabel(s: Student) {
  if (s.participation.count === 0) return { text: 'Not yet', cls: 'bg-slate-100 text-slate-600' };
  if (s.participation.count < 3) return { text: `${s.participation.count} answers`, cls: 'bg-sky-100 text-sky-900' };
  return { text: `${s.participation.count} answers`, cls: 'bg-mint-50 text-mint-700' };
}

export function Roster() {
  const { students, cls } = useApp();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<'all' | Cefr>('all');
  const [mod, setMod] = useState<'all' | string>('all');
  const [prog, setProg] = useState<ProgFilter>('all');
  const [part, setPart] = useState<PartFilter>('all');
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => students.filter((s) => {
    const p = overallProgress(s);
    if (q && !`${s.firstName} ${s.lastName ?? ''} ${s.iatcId ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (level !== 'all' && s.level !== level) return false;
    if (mod !== 'all' && String(currentModule(s).n) !== mod) return false;
    if (prog === 'low' && p >= 15) return false;
    if (prog === 'mid' && (p < 15 || p >= 35)) return false;
    if (prog === 'high' && p < 35) return false;
    if (part === 'none' && s.participation.count > 0) return false;
    if (part === 'some' && s.participation.count === 0) return false;
    return true;
  }), [students, q, level, mod, prog, part]);

  const sel = 'min-h-[48px] rounded-2xl border-2 border-navy-100 bg-white px-3 font-semibold text-navy';
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search students</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" className="min-h-[48px] w-full rounded-2xl border-2 border-navy-100 pl-10 pr-3 text-lg outline-none focus:border-navy" />
        </label>
        <select className={sel} value={prog} onChange={(e) => setProg(e.target.value as ProgFilter)} aria-label="Filter by progress"><option value="all">All progress</option><option value="low">Under 15%</option><option value="mid">15–35%</option><option value="high">35% +</option></select>
        <select className={sel} value={level} onChange={(e) => setLevel(e.target.value as 'all' | Cefr)} aria-label="Filter by level"><option value="all">All levels</option><option value="A0">A0</option><option value="A1">A1</option></select>
        <select className={sel} value={mod} onChange={(e) => setMod(e.target.value)} aria-label="Filter by unit"><option value="all">All units</option>{MODULES.map((m) => <option key={m.n} value={m.n}>Unit {m.n}</option>)}</select>
        <select className={sel} value={part} onChange={(e) => setPart(e.target.value as PartFilter)} aria-label="Filter by participation"><option value="all">All participation</option><option value="none">Not answered yet</option><option value="some">Answered</option></select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Class card */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-navy p-4 text-center text-white shadow-card">
          <div className="flex -space-x-3">
            {students.slice(0, 5).map((s) => <Avatar key={s.id} student={s} size={44} className="ring-2 ring-navy" />)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-lg font-bold"><Users size={18} /> Class</div>
          <div className="text-sm text-navy-100">{cls?.name ?? 'No class'}</div>
          <div className="text-sm text-sky">{students.length} students</div>
          {cls && <div className="mt-1 rounded-lg bg-white/10 px-2 py-0.5 font-mono text-xs">Code: {cls.code}</div>}
        </div>

        {list.map((s) => {
          const p = overallProgress(s);
          const m = currentModule(s);
          const pl = participationLabel(s);
          return (
            <Link key={s.id} to={`/teacher/student/${s.id}`} className="group relative flex flex-col items-center gap-1.5 rounded-3xl border border-navy-100 bg-white p-4 pt-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-coral">
              <span className="absolute right-2 top-2"><ProgressRing pct={p} size={42} stroke={5} colour="#1F9D6B" label={`${nameOf(s)}: ${p}% of the course`} textClass="text-[10px]" /></span>
              <Avatar student={s} size={78} />
              <span className="text-lg font-bold leading-tight text-navy">{nameOf(s)}</span>
              {s.rosterNo && <span className="text-xs text-navy-400">#{s.rosterNo}{s.group ? ` · ${s.group}` : ''}{s.groupRole ? ` ${s.groupRole.replace(' (provisional)', '*')}` : ''}</span>}
              <span className="flex flex-wrap justify-center gap-1 text-xs font-bold">
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-navy">{s.level}</span>
                <span className="flex items-center gap-0.5 rounded-full bg-coral-50 px-2 py-0.5 text-coral-700"><Flame size={12} /> {s.streak.count}</span>
              </span>
              <span className="text-xs text-navy-500">Unit {m.n}: {m.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pl.cls}`}>{pl.text}</span>
            </Link>
          );
        })}

        {/* Add pupils card */}
        <button onClick={() => setAdding(true)} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-navy-200 bg-white/60 p-4 text-navy transition hover:border-coral hover:text-coral-700">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-navy-50"><Plus size={32} /></span>
          <span className="text-lg font-bold">Add pupils</span>
        </button>
      </div>
      {list.length === 0 && students.length > 0 && <p className="mt-4 text-center text-navy-400">No students match these filters.</p>}
      <AddPupils open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddPupils({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update, toast, cls } = useApp();
  const [names, setNames] = useState('');
  const [level, setLevel] = useState<Cefr>('A0');
  const add = () => {
    const list = names.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (!list.length || !cls) return;
    update((d) => {
      list.forEach((n) => {
        const { firstName, lastName } = splitName(n);
        d.students.push(newStudent(firstName, level, { classId: cls.id, lastName, joinedBy: 'teacher' }));
      });
      refreshNameFlags(d);
    });
    toast(`${list.length} pupil${list.length > 1 ? 's' : ''} added with new monster avatars.`, 'good');
    setNames('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Add pupils to ${cls?.name ?? 'this class'}`} labelledBy="add-title">
      <p className="mb-2 text-navy-500">One pupil per line (or separated by commas). Write the first name, and the surname if two pupils share a first name. Each pupil gets a unique monster avatar.</p>
      <textarea value={names} onChange={(e) => setNames(e.target.value)} rows={6} className="w-full rounded-2xl border-2 border-navy-100 p-3 text-lg outline-none focus:border-navy" placeholder={'Abdullah\nFahad Alsaeed\nSaad'} aria-label="Pupil names" autoFocus />
      <div className="mt-3 flex items-center gap-3">
        <label className="font-semibold text-navy" htmlFor="lvl">Level</label>
        <select id="lvl" value={level} onChange={(e) => setLevel(e.target.value as Cefr)} className="min-h-[44px] rounded-xl border-2 border-navy-100 px-3"><option>A0</option><option>A1</option></select>
      </div>
      <p className="mt-2 text-sm text-navy-400">Names stay on this device. To bring in a whole class with IDs, use Teacher Dashboard → Classes → Import class file.</p>
      <Button className="mt-4 w-full" size="lg" onClick={add}><UserPlus size={20} /> Add</Button>
    </Modal>
  );
}
