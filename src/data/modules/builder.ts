// Activity helpers shared by the units (units.ts builds Units 1–8 from the weekly materials).
import type { Activity, ContentStatus, Dialogue, GapItem, GrammarPoint, OrderItem, PictureItem, Skill, Tags } from '../../types';
import { getGrammar, getWord } from '../content';
import { hasImage } from '../images';
import { rngFrom, shuffle } from '../../lib/rng';
import { stripMarkup } from '../../lib/text';

export const tag = (module: number, skill: Skill, topic: string, grammar?: string, status: ContentStatus = 'lesson'): Tags => ({
  cefr: module <= 2 ? 'A0' : module <= 5 ? 'A0-A1' : 'A1',
  topic,
  grammar,
  skill,
  module,
  status,
});

/** Distinct, shuffled options that always include the answer. */
export function optionsWith(answer: string, pool: string[], count = 3, seed = 1): string[] {
  const others = shuffle([...new Set(pool.filter((p) => p.toLowerCase() !== answer.toLowerCase()))], rngFrom(seed)).slice(0, count - 1);
  return shuffle([answer, ...others], rngFrom(seed + 7));
}

// --------------------------------------------------------------- auto activity makers
export function autoMatch(id: string, n: number, topic: string, words: string[], count = 6): Activity {
  const ws = words.slice(0, count).map((w) => getWord(w)!).filter(Boolean);
  return {
    kind: 'match', id, title: 'Match the words', prompt: 'Match the English word to the Arabic.', promptAr: 'صِل الكلمة الإنجليزية بمعناها العربي.',
    pairs: ws.map((w) => [w.word, w.ar]), leftLabel: 'English', rightLabel: 'العربية', rtlRight: true,
    tags: tag(n, 'vocabulary', topic), src: ws[0]?.src,
  };
}

export function autoPicture(id: string, n: number, topic: string, words: string[], count = 5): Activity | null {
  // Pictures only for concrete words (not phrases like "How are you?").
  const pics = words.filter((w) => hasImage(w) && ['noun', 'adjective', 'verb', 'noun (plural)'].includes(getWord(w)?.pos ?? ''));
  if (pics.length < 4) return null;
  const items: PictureItem[] = pics.slice(0, count).map((w, i) => ({ word: w, answer: w, options: optionsWith(w, pics, 3, n * 100 + i) }));
  return {
    kind: 'picture', id, title: 'Choose the picture', prompt: 'Listen. Choose the right picture.', promptAr: 'استمع واختر الصورة الصحيحة.',
    items, tags: tag(n, 'vocabulary', topic),
  };
}

export function autoOrder(id: string, n: number, topic: string, sentences: string[], grammar?: string): Activity {
  const items: OrderItem[] = sentences.map((s) => ({ answer: stripMarkup(s), grammar }));
  return {
    kind: 'order', id, title: 'Make the sentence', prompt: 'Put the words in order.', promptAr: 'رتّب الكلمات لتكوين جملة.',
    items, tags: tag(n, 'grammar', topic, grammar),
  };
}

/** Gap-fill from an A1 Grammar deck's practice list (answers stay exactly as in the deck). */
export function gapsFromDeck(deckId: string, grammar: string, limit = 8): GapItem[] {
  const deck = getGrammar(deckId);
  if (!deck) return [];
  const answers = deck.practice.map(([, a]) => a);
  return deck.practice.slice(0, limit).map(([q, a], i) => ({
    text: q.replace(/_{2,}/g, '___'),
    answer: a,
    options: optionsWith(a, answers, 3, i + deckId.length * 13),
    grammar,
  }));
}

/** Choose-the-word items from the {highlighted} words in a deck's example sentences. */
export function clozeFromDeck(deckId: string, grammar: string, limit = 8, seed = 3): GapItem[] {
  const deck = getGrammar(deckId);
  if (!deck) return [];
  const items = deck.sections.flatMap((s) => s.items).filter((t) => /\{[^}]+\}/.test(t));
  const pool = items.map((t) => (t.match(/\{([^}]+)\}/)?.[1] ?? '').trim());
  return shuffle(items, rngFrom(seed)).slice(0, limit).map((t, i) => {
    const answer = (t.match(/\{([^}]+)\}/)?.[1] ?? '').trim();
    return { text: t.replace(/\{[^}]+\}/, '___').replace(/\{|\}/g, ''), answer, options: optionsWith(answer, pool, 3, seed + i), grammar };
  });
}

/** Grammar explanation built from an A1 Grammar deck. */
export function pointFromDeck(deckId: string, colour: GrammarPoint['colour'], opts: { sections?: number; title?: string } = {}): GrammarPoint | null {
  const d = getGrammar(deckId);
  if (!d) return null;
  return {
    title: opts.title ?? d.title,
    titleAr: d.ar,
    explain: d.rules.slice(0, 4).map((r) => `${r[0]}: ${r[1]}`),
    table: d.table ? { head: d.table.head, rows: d.table.rows } : undefined,
    examples: d.sections.slice(0, opts.sections ?? 3).flatMap((s) => s.items.slice(0, 2)),
    watch: d.watch,
    colour,
    src: d.src,
  };
}

/** Dialogue builder: the learner chooses the right next line for some turns. */
export function dialogueBuilder(id: string, n: number, topic: string, d: Dialogue, distractors: string[], every = 2): Activity {
  const steps: Record<number, { options: string[]; answer: number }> = {};
  d.lines.forEach(([, text], i) => {
    if (i === 0 || i % every !== 1) return;
    const options = optionsWith(stripMarkup(text), distractors.map(stripMarkup), 3, n * 31 + i);
    steps[i] = { options, answer: options.indexOf(stripMarkup(text)) };
  });
  return {
    kind: 'dialogue', id, title: 'Build the dialogue', prompt: 'Choose the next line.', promptAr: 'اختر الجملة التالية في الحوار.',
    dialogue: d, steps, tags: tag(n, 'speaking', topic), src: d.src,
  };
}
