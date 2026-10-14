import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Activity, Skill } from '../../types';
import { Ar, Button } from '../ui';

export interface AnswerEvent { correct: boolean; skill: Skill; grammar?: string; word?: string }
export interface ActivityResult { score: number; total: number }
export interface ActivityProps<K extends Activity['kind']> {
  activity: Extract<Activity, { kind: K }>;
  onAnswer: (a: AnswerEvent) => void;
  onDone: (r: ActivityResult) => void;
  compact?: boolean;
}

export function Shell({ activity, step, steps, children }: { activity: Activity; step?: number; steps?: number; children: ReactNode }) {
  return (
    <section className="animate-rise" aria-labelledby={`h-${activity.id}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`h-${activity.id}`} className="text-xl font-bold text-navy sm:text-2xl">{activity.title}</h2>
          <p className="text-lg text-navy-500">{activity.prompt}</p>
          <Ar>{activity.promptAr}</Ar>
        </div>
        {steps !== undefined && steps > 1 && (
          <div className="flex items-center gap-1.5 pt-2" aria-label={`Question ${(step ?? 0) + 1} of ${steps}`}>
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={`h-2.5 rounded-full transition-all ${i < (step ?? 0) ? 'w-2.5 bg-mint' : i === step ? 'w-6 bg-navy' : 'w-2.5 bg-navy-100'}`} />
            ))}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export function Option({ children, state = 'idle', onClick, disabled, big = false, dir }: { children: ReactNode; state?: 'idle' | 'correct' | 'wrong' | 'reveal' | 'selected'; onClick?: () => void; disabled?: boolean; big?: boolean; dir?: 'rtl' | 'ltr' }) {
  const s = {
    idle: 'border-navy-100 bg-white hover:border-navy-300 hover:bg-navy-50',
    selected: 'border-navy bg-navy-50 ring-2 ring-navy',
    correct: 'border-mint bg-mint-50 text-mint-700',
    wrong: 'border-coral bg-coral-50 text-coral-800 animate-wiggle',
    reveal: 'border-mint/60 bg-mint-50/60 text-mint-700',
  }[state];
  return (
    <button
      type="button"
      dir={dir}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-center font-semibold text-navy transition disabled:cursor-default ${big ? 'text-2xl sm:text-3xl' : 'text-lg'} ${s}`}
    >
      {children}
      {state === 'correct' && <span aria-label="correct">✓</span>}
    </button>
  );
}

export function NextButton({ onClick, last, label }: { onClick: () => void; last?: boolean; label?: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <Button size="lg" variant={last ? 'success' : 'primary'} onClick={onClick} autoFocus>
        {label ?? (last ? 'Finish' : 'Next')} <ArrowRight size={20} />
      </Button>
    </div>
  );
}
