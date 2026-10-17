// Teacher / Admin / Observer preview: the answers to an activity, shown under it ("Show answers").
import { KeyRound } from 'lucide-react';
import type { Activity } from '../../types';
import { getWord } from '../../data/content';
import { stripMarkup } from '../../lib/text';

export interface KeyLine { q: string; a: string; note?: string }

const blank = (s: string) => stripMarkup(s).replace(/_{2,}|\.{3,}|…/g, '____');

/** The answers of an activity as plain lines (empty for steps with nothing to check: word cards, grammar, dialogues to watch). */
export function answerLines(a: Activity): KeyLine[] {
  switch (a.kind) {
    case 'mcq': return a.items.map((x) => ({ q: stripMarkup(x.q), a: x.options[x.answer], note: x.explain }));
    case 'reading': return a.questions.map((x) => ({ q: stripMarkup(x.q), a: x.options[x.answer], note: x.explain }));
    case 'gap': return a.items.map((x) => ({ q: blank(x.text), a: x.answer }));
    case 'order': return a.items.map((x, k) => ({ q: `Sentence ${k + 1}`, a: x.answer }));
    case 'error': return a.items.map((x) => ({ q: stripMarkup(x.sentence), a: `${x.wrong} → ${x.right}` }));
    case 'picture': return a.items.map((x, k) => ({ q: `Picture ${k + 1}`, a: getWord(x.answer)?.word ?? x.answer }));
    case 'match': return a.pairs.map(([l, r]) => ({ q: stripMarkup(l), a: stripMarkup(r) }));
    case 'sort': return a.groups.map((g, k) => ({ q: g, a: a.items.filter((x) => x.group === k).map((x) => x.text).join(' · ') }));
    case 'dialogue': return Object.entries(a.steps).map(([n, s]) => ({ q: `${a.dialogue.lines[Number(n)]?.[0] ?? 'Line'} (line ${Number(n) + 1})`, a: stripMarkup(s.options[s.answer]) }));
    case 'write': return [{ q: 'Model answer', a: a.task.model, note: a.task.bullets.length ? `Points: ${a.task.bullets.join(' · ')}` : undefined }];
    case 'speak': return a.task.model ? [{ q: 'Model answer', a: a.task.model }] : [];
    default: return [];
  }
}

export function AnswerKey({ activity, big = false }: { activity: Activity; big?: boolean }) {
  const lines = answerLines(activity);
  return (
    <section className={`rounded-3xl border-2 border-dashed border-mint bg-mint-50 p-4 ${big ? 'text-xl' : ''}`} aria-label="Answer key">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-mint-700"><KeyRound size={18} /> Answers</h3>
      {lines.length === 0
        ? <p className="text-navy-500">Nothing to check in this step ({activity.kind === 'flashcards' ? 'word cards' : activity.kind === 'grammar' ? 'grammar explanation' : activity.kind === 'watch' ? 'dialogue to watch' : 'practice'}).</p>
        : (
          <ol className="space-y-1.5">
            {lines.map((l, k) => (
              <li key={k} className="text-navy">
                <span className="text-navy-500">{k + 1}. {l.q}</span> → <b className="text-mint-700">{l.a}</b>
                {l.note && <span className="block text-sm text-navy-400">{l.note}</span>}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
