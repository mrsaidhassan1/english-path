// "My Learning Path": completed, current, recommended, locked and revision lessons.
import { Link } from 'react-router-dom';
import { Check, Lock, Star, RefreshCcw, Play } from 'lucide-react';
import type { Student } from '../types';
import { MODULES, reviewAfterModule, UNITS_PER_REVIEW } from '../data/modules';
import { lessonDone, lessonUnlocked, moduleProgress, moduleUnlocked, reviewUnlocked } from '../lib/progress';
import { ModuleIcon } from './ModuleIcon';
import { Ar } from './ui';

export function LearningPath({ s, recommendedId, unlockAll, assigned, limit }: { s: Student; recommendedId?: string; unlockAll: boolean; assigned: Set<string>; limit?: number }) {
  const opts = { unlockAll, assigned };
  const mods = limit ? MODULES.slice(0, limit) : MODULES;
  // Current = first lesson not done; recommended = the engine's pick, or the lesson after the current one.
  const ordered = MODULES.flatMap((m) => m.lessons.map((l) => ({ m, l })));
  const ci = ordered.findIndex(({ m, l }) => !lessonDone(s, l.id) && lessonUnlocked(s, m, l, opts));
  const currentId = ci >= 0 ? ordered[ci].l.id : undefined;
  const recId = recommendedId && recommendedId !== currentId ? recommendedId : ordered[ci + 1]?.l.id;
  return (
    <ol className="space-y-4">
      {mods.map((m) => {
        const open = moduleUnlocked(s, m, opts);
        const prog = moduleProgress(s, m);
        const review = reviewAfterModule(m.n) ?? null;
        return (
          <li key={m.id} className={`rounded-3xl border bg-white p-4 shadow-card ${open ? 'border-navy-100' : 'border-dashed border-navy-100 opacity-75'}`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: m.colour }}><ModuleIcon name={m.icon} size={22} /></span>
              <div className="min-w-0 flex-1">
                <Link to={`/lessons/${m.id}`} className="font-bold text-navy hover:underline">Unit {m.n}: {m.title}</Link>{m.week && <span className="ml-2 rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-500">Week {m.week}</span>}
                <Ar className="text-sm">{m.titleAr}</Ar>
              </div>
              <span className="text-sm font-bold text-navy-400">{prog.done}/{prog.total}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {m.lessons.map((l) => {
                const done = lessonDone(s, l.id);
                const unlocked = lessonUnlocked(s, m, l, opts);
                const current = l.id === currentId;
                const rec = !current && !done && l.id === recId;
                const cls = done
                  ? 'bg-mint-50 text-mint-700 border-mint/30'
                  : current
                    ? 'bg-navy text-white border-navy shadow-card'
                    : rec
                      ? 'bg-coral-50 text-coral-700 border-coral'
                      : unlocked
                        ? 'bg-white text-navy border-navy-100 hover:border-navy-300'
                        : 'bg-slate-50 text-slate-400 border-slate-200';
                const icon = done ? <Check size={16} /> : current ? <Play size={16} /> : rec ? <Star size={16} /> : unlocked ? null : <Lock size={14} />;
                const label = `${l.title}${done ? ' (completed)' : rec ? ' (recommended)' : current ? ' (current)' : unlocked ? '' : ' (locked)'}`;
                return unlocked || done ? (
                  <Link key={l.id} to={`/lessons/${m.id}/${l.id}`} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border-2 px-3 text-sm font-bold transition ${cls}`} aria-label={label}>
                    {icon} {l.day ?? l.title}
                  </Link>
                ) : (
                  <span key={l.id} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border-2 px-3 text-sm font-bold ${cls}`} aria-label={label}>{icon} {l.title}</span>
                );
              })}
              {review && (
                reviewUnlocked(s, m.n / UNITS_PER_REVIEW - 1, unlockAll) ? (
                  <Link to={`/review/${review.id}`} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border-2 px-3 text-sm font-bold ${lessonDone(s, review.id) ? 'border-mint/30 bg-mint-50 text-mint-700' : 'border-sun bg-sun-50 text-sun-700'}`}>
                    <RefreshCcw size={15} /> Review
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"><Lock size={14} /> Review</span>
                )
              )}
            </div>
            {!open && <p className="mt-2 text-sm text-navy-400">Finish Unit {m.n - 1} to open this unit.</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function PathLegend() {
  const chip = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold';
  return (
    <div className="flex flex-wrap gap-2" aria-label="Legend">
      <span className={`${chip} bg-mint-50 text-mint-700`}><Check size={12} /> Completed</span>
      <span className={`${chip} bg-navy text-white`}><Play size={12} /> Current</span>
      <span className={`${chip} border border-coral bg-coral-50 text-coral-700`}><Star size={12} /> Recommended next</span>
      <span className={`${chip} bg-slate-100 text-slate-500`}><Lock size={12} /> Locked</span>
      <span className={`${chip} bg-sun-50 text-sun-700`}><RefreshCcw size={12} /> Revision</span>
    </div>
  );
}
