// Render IATC text markup: **vocab** bold, {grammar} coloured, [[slot]] personalisable.
import { Fragment } from 'react';

const COLOURS: Record<string, string> = {
  navy: 'bg-navy-100 text-navy',
  coral: 'bg-coral-100 text-coral-800',
  sky: 'bg-sky-200 text-sky-900',
  mint: 'bg-mint-100 text-mint-700',
  sun: 'bg-sun-100 text-sun-700',
};

export function Markup({ text, colour = 'coral', className = '' }: { text: string; colour?: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\{[^}]+\}|\[\[[^\]]+\]\])/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('**')) return <strong key={i} className="font-bold text-navy">{p.slice(2, -2)}</strong>;
        if (p.startsWith('{')) return <mark key={i} className={`rounded-md px-0.5 font-bold ${COLOURS[colour] ?? COLOURS.coral}`}>{p.slice(1, -1)}</mark>;
        if (p.startsWith('[[')) return <span key={i} className="border-b-2 border-dotted border-coral font-semibold">{p.slice(2, -2)}</span>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}
