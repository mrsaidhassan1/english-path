// "STUDENT TO ANSWER" — branded random picker for Classroom Mode.
// Pick a student (from the whole class or one group) or a whole group, always fairly.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, X, Check, RotateCcw, Hand, Users, User } from 'lucide-react';
import type { Student } from '../types';
import { fairPick } from '../lib/picker';
import { currentModule } from '../lib/progress';
import { suggestQuestion } from '../lib/recommend';
import { groupsOf, groupTask, partnersOf, roleIcon, type Group } from '../lib/groups';
import { nameOf } from '../lib/classes';
import { Avatar } from './Avatar';
import { LogoMark } from './Logo';

interface Props {
  open: boolean;
  onClose: () => void;
  students: Student[];
  counts: Record<string, number>; // student answers this session
  onPicked: (s: Student) => void;
  onMark?: (s: Student, correct: boolean) => void;
  groupCounts?: Record<string, number>; // group turns this session
  onGroupPicked?: (g: Group) => void;
  onGroupMark?: (g: Group, correct: boolean) => void;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function StudentPicker({ open, onClose, students, counts, onPicked, onMark, groupCounts = {}, onGroupPicked, onGroupMark }: Props) {
  const groups = useMemo(() => groupsOf(students), [students]);
  const hasGroups = groups.length > 1;
  const [mode, setMode] = useState<'student' | 'group'>('student');
  const [filter, setFilter] = useState<string | null>(null); // pick only from this group
  const [current, setCurrent] = useState<Student | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [rolling, setRolling] = useState(false);
  const [marked, setMarked] = useState<boolean | null>(null);
  const [manual, setManual] = useState(false);
  const last = useRef<string | null>(null);
  const lastGroup = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pool = filter ? students.filter((s) => s.group === filter) : students;

  const roll = <T,>(items: T[], winner: T, show: (x: T) => void, done: (x: T) => void) => {
    setManual(false);
    setMarked(null);
    if (reduceMotion() || items.length < 3) return done(winner);
    setRolling(true);
    let delay = 60;
    let t = 0;
    for (let k = 0; k < 11; k++) {
      t += delay;
      delay *= 1.18;
      const x = k === 10 ? winner : items[Math.floor(Math.random() * items.length)];
      timers.current.push(window.setTimeout(() => (k === 10 ? done(x) : show(x)), t));
    }
  };

  const land = (s: Student) => {
    setCurrent(s);
    setRolling(false);
    setMarked(null);
    last.current = s.id;
    onPicked(s);
  };
  const landGroup = (g: Group) => {
    setCurrentGroup(g);
    setRolling(false);
    setMarked(null);
    lastGroup.current = g.name;
    onGroupPicked?.(g);
  };

  const pickStudent = (from = pool) => {
    const winner = fairPick(from, counts, last.current);
    if (winner) roll(from, winner, setCurrent, land);
  };
  const pickGroup = () => {
    const asIds = groups.map((g) => ({ id: g.name, g }));
    const winner = fairPick(asIds, groupCounts, lastGroup.current);
    if (winner) roll(asIds, winner, (x) => setCurrentGroup(x.g), (x) => landGroup(x.g));
  };
  const studentFromGroup = (g: Group) => {
    setMode('student');
    setFilter(g.name);
    pickStudent(g.members);
  };

  if (!open) return null;
  const m = current ? currentModule(current) : null;
  const partners = current ? partnersOf(current, students) : [];
  const showGroup = mode === 'group';

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-navy-900/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="picker-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative max-h-[96vh] w-full max-w-3xl animate-pop overflow-y-auto rounded-[2rem] bg-white shadow-lift">
        <div className="flex items-center gap-3 bg-navy px-6 py-4 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral"><Dices size={28} /></span>
          <h2 id="picker-title" className="flex-1 text-2xl font-bold tracking-[0.15em] sm:text-3xl">{showGroup ? 'GROUP TO ANSWER' : 'STUDENT TO ANSWER'}</h2>
          <LogoMark size={40} white />
          <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close"><X size={26} /></button>
        </div>

        {hasGroups && (
          <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 px-6 py-3">
            <div role="tablist" className="flex rounded-2xl bg-navy-50 p-1">
              <button role="tab" aria-selected={!showGroup} onClick={() => { setMode('student'); setMarked(null); }} className={`flex min-h-[44px] items-center gap-1 rounded-xl px-4 font-bold ${!showGroup ? 'bg-white text-navy shadow-card' : 'text-navy-400'}`}><User size={18} /> Student</button>
              <button role="tab" aria-selected={showGroup} onClick={() => { setMode('group'); setMarked(null); }} className={`flex min-h-[44px] items-center gap-1 rounded-xl px-4 font-bold ${showGroup ? 'bg-white text-navy shadow-card' : 'text-navy-400'}`}><Users size={18} /> Group</button>
            </div>
            {!showGroup && (
              <div className="flex flex-wrap gap-1" aria-label="Pick from">
                <span className="self-center px-1 text-sm font-semibold text-navy-400">From:</span>
                {[null, ...groups.map((g) => g.name)].map((gName) => (
                  <button key={gName ?? 'all'} aria-pressed={filter === gName} onClick={() => setFilter(gName)}
                    className={`min-h-[44px] rounded-xl px-3 font-bold ${filter === gName ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-navy-100 hover:ring-navy-300'}`}>{gName ?? 'Whole class'}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- student view ---------------- */}
        {!showGroup && (
          <div className="grid gap-6 p-6 sm:grid-cols-[auto,1fr] sm:p-8">
            <div className="mx-auto">
              {current ? (
                <div className={rolling ? 'scale-95 opacity-90 transition' : 'animate-pop'}><Avatar student={current} size={190} ring /></div>
              ) : (
                <div className="grid h-[190px] w-[190px] place-items-center rounded-full bg-navy-50 text-7xl" aria-hidden="true">🎲</div>
              )}
            </div>
            <div className="flex flex-col justify-center text-center sm:text-left" aria-live="polite">
              {current ? (
                <>
                  <p className="text-5xl font-bold text-navy sm:text-6xl">{nameOf(current)}</p>
                  {!rolling && m && (
                    <>
                      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <span className="rounded-full bg-navy-50 px-4 py-1 text-lg font-bold text-navy">{current.level}</span>
                        {current.group && <span className="rounded-full bg-sun-50 px-4 py-1 text-lg font-bold text-sun-700">{current.group}{current.groupRole ? ` · ${current.groupRole}` : ''}</span>}
                        <span className="rounded-full bg-sky-100 px-4 py-1 text-lg font-bold text-sky-900">Unit {m.n}: {m.title}</span>
                      </div>
                      <p className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-xl font-semibold text-coral-800">💡 Suggested: {suggestQuestion(current)}</p>
                      <p className="mt-3 text-xl text-navy">Ask your student to explain the choice.</p>
                      {partners.length > 0 && (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-lg text-navy-500">
                          🤝 Partner can help:{' '}
                          {partners.map((p) => <span key={p.id} className="inline-flex items-center gap-1 font-semibold text-navy"><Avatar student={p} size={30} /> {nameOf(p)}</span>)}
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="text-2xl text-navy">Press the button to choose a student fairly{filter ? ` from ${filter}` : ''}.</p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- group view ---------------- */}
        {showGroup && (
          <div className="p-6 sm:p-8" aria-live="polite">
            {currentGroup ? (
              <div className={rolling ? 'opacity-80' : 'animate-pop'}>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="text-6xl font-bold text-navy">{currentGroup.name}</p>
                  <span className="text-xl text-navy-400">{currentGroup.members.length} students</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {currentGroup.members.map((s) => (
                    <div key={s.id} className={`flex flex-col items-center gap-1 rounded-2xl p-2 ${s.groupRole?.startsWith('Leader') ? 'bg-sun-50 ring-2 ring-sun' : 'bg-navy-50'}`}>
                      <Avatar student={s} size={84} />
                      <span className="max-w-[7rem] text-center text-base font-bold leading-tight text-navy">{nameOf(s)}</span>
                      <span className="text-sm text-navy-500">{roleIcon(s)} {s.groupRole ?? ''}</span>
                    </div>
                  ))}
                </div>
                {!rolling && (
                  <>
                    <p className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-xl font-semibold text-coral-800">💡 {groupTask(currentGroup)}</p>
                    <button onClick={() => studentFromGroup(currentGroup)} className="mt-3 flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-navy-100 px-5 text-lg font-bold text-navy hover:border-coral">
                      <Dices size={20} /> Pick one student from {currentGroup.name}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-2xl text-navy">Press the button to choose a group fairly. The group answers together.</p>
            )}
          </div>
        )}

        {/* mark the answer */}
        {!rolling && ((showGroup && currentGroup && onGroupMark) || (!showGroup && current && onMark)) && (
          <div className="flex flex-wrap justify-center gap-3 px-6">
            <button onClick={() => { setMarked(true); if (showGroup) onGroupMark!(currentGroup!, true); else onMark!(current!, true); }} disabled={marked !== null}
              className={`flex min-h-[56px] items-center gap-2 rounded-2xl px-6 text-xl font-bold ${marked === true ? 'bg-mint text-white' : 'bg-mint-50 text-mint-700 hover:bg-mint-100'} disabled:cursor-default`}><Check /> Correct{hasGroups ? ' (+1 team point)' : ''}</button>
            <button onClick={() => { setMarked(false); if (showGroup) onGroupMark!(currentGroup!, false); else onMark!(current!, false); }} disabled={marked !== null}
              className={`flex min-h-[56px] items-center gap-2 rounded-2xl px-6 text-xl font-bold ${marked === false ? 'bg-sun text-navy' : 'bg-sun-50 text-sun-700 hover:bg-sun-100'} disabled:cursor-default`}><RotateCcw /> Try again</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 p-6">
          <button onClick={() => (showGroup ? pickGroup() : pickStudent())} disabled={rolling || (showGroup ? groups.length === 0 : pool.length === 0)}
            className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-coral px-10 text-2xl font-bold text-white shadow-lift transition hover:bg-coral-600 disabled:opacity-60">
            <Dices size={30} /> {showGroup ? 'Pick a group' : filter ? `Pick from ${filter}` : 'Pick a student'}
          </button>
          {!showGroup && (
            <button onClick={() => setManual(!manual)} className="flex min-h-[56px] items-center gap-2 rounded-2xl border-2 border-navy-100 px-5 text-lg font-bold text-navy hover:border-navy-300" aria-expanded={manual}>
              <Hand size={22} /> Choose manually
            </button>
          )}
        </div>

        <div className="border-t border-navy-100 bg-paper px-6 py-4">
          {showGroup ? (
            <>
              <p className="mb-2 font-bold text-navy">Group turns this session:</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button key={g.name} onClick={() => landGroup(g)} className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 px-4 font-bold ${groupCounts[g.name] ? 'border-mint/40 bg-mint-50 text-mint-700' : 'border-navy-100 bg-white text-navy'} hover:border-coral`} title="Choose this group">
                    {g.name} {groupCounts[g.name] ? `✓${groupCounts[g.name] > 1 ? groupCounts[g.name] : ''}` : ''}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 font-bold text-navy">{manual ? 'Tap a student:' : 'Already answered this session:'}</p>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                {pool.filter((s) => manual || counts[s.id]).map((s) => (
                  <button key={s.id} onClick={() => manual && land(s)} disabled={!manual}
                    className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 font-semibold ${counts[s.id] ? 'border-mint/40 bg-mint-50 text-mint-700' : 'border-navy-100 bg-white text-navy'} ${manual ? 'hover:border-coral' : ''}`}>
                    <Avatar student={s} size={38} /> {nameOf(s)} {counts[s.id] ? `✓${counts[s.id] > 1 ? counts[s.id] : ''}` : ''}
                  </button>
                ))}
                {!manual && !pool.some((s) => counts[s.id]) && <span className="text-navy-400">Nobody yet.</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
