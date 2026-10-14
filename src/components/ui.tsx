// Design-system building blocks for SH English Path.
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../store';

type Variant = 'primary' | 'accent' | 'soft' | 'ghost' | 'success' | 'outline';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-500 shadow-card',
  accent: 'bg-coral text-white hover:bg-coral-600 shadow-card',
  soft: 'bg-navy-50 text-navy hover:bg-navy-100',
  ghost: 'bg-transparent text-navy hover:bg-navy-50',
  success: 'bg-mint text-white hover:bg-mint-600 shadow-card',
  outline: 'bg-white text-navy border-2 border-navy-100 hover:border-navy-300',
};
const SIZES = { sm: 'min-h-[44px] px-4 text-sm', md: 'min-h-[48px] px-5 text-base', lg: 'min-h-[56px] px-7 text-lg', xl: 'min-h-[72px] px-9 text-2xl' };

export function Button({
  variant = 'primary', size = 'md', className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size = 'md', className = '', children }: { to: string; variant?: Variant; size?: keyof typeof SIZES; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[.98] ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ className = '', children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <As className={`min-w-0 rounded-3xl border border-navy-100/70 bg-white p-5 shadow-card ${className}`}>{children}</As>;
}

export function Pill({ children, tone = 'navy', className = '' }: { children: ReactNode; tone?: 'navy' | 'coral' | 'sky' | 'mint' | 'sun' | 'grey'; className?: string }) {
  const t = { navy: 'bg-navy-50 text-navy', coral: 'bg-coral-50 text-coral-700', sky: 'bg-sky-100 text-sky-800', mint: 'bg-mint-50 text-mint-700', sun: 'bg-sun-50 text-sun-700', grey: 'bg-slate-100 text-slate-600' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${t} ${className}`}>{children}</span>;
}

/** Arabic support line; only shows when the Arabic toggle is on. */
export function Ar({ children, className = '' }: { children?: ReactNode; className?: string }) {
  const { data } = useApp();
  if (!data.settings.arabic || !children) return null;
  // The block keeps the page direction, so the Arabic lines up with the English above it (left in normal
  // text, centred in centred blocks); only the inner text runs right-to-left.
  return <span lang="ar" className={`block font-arabic text-[0.95em] text-navy-500 ${className}`}><span dir="rtl">{children}</span></span>;
}

export function ProgressRing({ pct, size = 44, stroke = 5, colour = '#1F9D6B', label, track = '#E3E7F3', textClass = 'text-[11px]' }: { pct: number; size?: number; stroke?: number; colour?: string; label?: string; track?: string; textClass?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${p}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c - (c * p) / 100} strokeLinecap="round" />
      </svg>
      <span className={`absolute font-bold text-navy ${textClass}`}>{Math.round(p)}%</span>
    </span>
  );
}

export function ProgressBar({ pct, colour = 'bg-mint', className = '', label }: { pct: number; colour?: string; className?: string; label?: string }) {
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-navy-50 ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${colour} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false, labelledBy }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the effect on every render:
  // re-running it moved focus back to the dialog after each typed letter.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    // Focus the dialog only when nothing inside it (e.g. an autoFocus field) already has focus.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lift outline-none sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          {title ? <h2 id={labelledBy} className="text-xl font-bold text-navy">{title}</h2> : <span />}
          <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-50 text-navy hover:bg-navy-100" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-navy-100 bg-white/60 px-6 py-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-navy-50 text-3xl text-navy">{icon}</div>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {text && <p className="max-w-md text-navy-400">{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, ar, sub, children, icon }: { title: string; ar?: string; sub?: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white shadow-card">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">{title}</h1>
          <Ar>{ar}</Ar>
          {sub && <p className="mt-1 text-navy-400">{sub}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Stat({ label, value, sub, icon, tone = 'navy' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: 'navy' | 'coral' | 'mint' | 'sky' | 'sun' }) {
  const bg = { navy: 'bg-navy-50 text-navy', coral: 'bg-coral-50 text-coral-700', mint: 'bg-mint-50 text-mint-700', sky: 'bg-sky-100 text-sky-800', sun: 'bg-sun-50 text-sun-700' }[tone];
  return (
    <Card className="flex items-center gap-4 p-4">
      {icon && <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${bg}`}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-navy-400">{label}</div>
        <div className="text-2xl font-bold text-navy">{value}</div>
        {sub && <div className="text-sm text-navy-400">{sub}</div>}
      </div>
    </Card>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto rounded-2xl bg-navy-50 p-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold transition ${value === t.id ? 'bg-white text-navy shadow-card' : 'text-navy-400 hover:text-navy'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Feedback({ ok, en, ar, detail }: { ok: boolean; en: string; ar?: string; detail?: ReactNode }) {
  return (
    <div role="status" className={`animate-rise rounded-2xl border-2 p-4 ${ok ? 'border-mint/40 bg-mint-50 text-mint-700' : 'border-sun/50 bg-sun-50 text-sun-700'}`}>
      <div className="text-lg font-bold">{ok ? '✅ ' : '💪 '}{en}</div>
      <Ar className={ok ? 'text-mint-700' : 'text-sun-700'}>{ar}</Ar>
      {detail && <div className="mt-1 text-navy">{detail}</div>}
    </div>
  );
}
