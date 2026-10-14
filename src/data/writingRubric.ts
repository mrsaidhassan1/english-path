// The A1 writing rubric used at IATC (A1 Exam / A1 Writing Exam / "A1 writing rubric.pdf"):
// Content, Organisation and Language, each 0–5, total /15. Bands 5, 3, 1 and 0 have descriptors;
// band 4 shares features of 3 and 5, band 2 of 1 and 3.
// The descriptors below are short teacher-facing summaries; the PDF is the official version.
import type { SourceRef } from '../types';
import { wordCount } from '../lib/text';
import { IATC } from './content';

export type Criterion = 'content' | 'organisation' | 'language';
export type WritingMarks = Record<Criterion, number>;

export const RUBRIC_SRC: SourceRef = {
  file: 'FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Writing Exam/A1 writing rubric.pdf',
  doc: 'FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Writing Exam/A1 writing rubric.pdf',
  label: 'A1 writing rubric (Content · Organisation · Language, /15)',
};

export const WRITING_MAX = 15;

export const CRITERIA: { key: Criterion; label: string; ar: string; bands: Record<0 | 1 | 2 | 3 | 4 | 5, string> }[] = [
  {
    key: 'content', label: 'Content', ar: 'المحتوى',
    bands: {
      5: 'All content is relevant to the task. The reader is fully informed (all 3 points).',
      4: 'Between 3 and 5.',
      3: 'Small irrelevances or one point missing / unclear. The reader is informed on the whole.',
      2: 'Between 1 and 3.',
      1: 'Irrelevant parts or the task is misunderstood. The reader is only minimally informed.',
      0: 'Content is totally irrelevant. The reader is not informed.',
    },
  },
  {
    key: 'organisation', label: 'Organisation', ar: 'التنظيم',
    bands: {
      5: 'Connected and coherent: basic linking words and a few cohesive devices (so, because, there, this …).',
      4: 'Between 3 and 5.',
      3: 'Connected with basic, high-frequency linking words (and, but, because).',
      2: 'Between 1 and 3.',
      1: 'Mostly not connected; simple punctuation and “and” used now and then.',
      0: 'Below band 1.',
    },
  },
  {
    key: 'language', label: 'Language', ar: 'اللغة',
    bands: {
      5: 'Everyday vocabulary used well; simple grammar with good control. Errors are noticeable but meaning is clear.',
      4: 'Between 3 and 5.',
      3: 'Basic vocabulary used reasonably; simple grammar with some control. Errors sometimes block meaning.',
      2: 'Between 1 and 3.',
      1: 'Isolated words and phrases; few simple grammatical forms, little control.',
      0: 'Below band 1.',
    },
  },
];

export const marksTotal = (m: WritingMarks) => m.content + m.organisation + m.language;

// ------------------------------------------------------------------ automatic estimate
// A first suggestion only, from simple signals. The teacher always confirms the mark.
const STOP = new Set(('your you the a an and or to of in on at is are am be for with what where when who how about write words word one more person people '
  + 'say ask answer tell give describe which many much they there it its his her he she their our now two three thing things something place like').split(' '));
const LINKERS = ['and', 'but', 'so', 'because', 'then', 'also', 'or', 'too', 'after', 'before', 'when', 'first', 'next'];
const COHESIVE = /\b(it|he|she|they|there|this|that|these|his|her|their|him|them)\b/gi;
const VERB = /\b(am|is|are|was|were|isn't|aren't|have|has|do|does|did|don't|doesn't|can|can't|will|i'm|you're|he's|she's|it's|they're|we're|there's|let's|(like|live|work|go|study|want|play|get|eat|watch|speak|come|visit|need|love|enjoy|help|read|write|drive|walk|take|make|see|know|understand|call|buy|pay|keep|start|finish|open|close|sit|stand|listen|look|say|ask|answer|think|travel|swim|cook|drink|sleep|wear|try|meet|give|put|use|turn|stay|wash|clean|leave|arrive|fly|fix|repair|ride|run|wake|carry|spell|teach|learn|shop|cycle|camp)(s|es|ed|d|ing)?)\b/i;
// Time and sequence phrases also join ideas at A1.
const SEQUENCE = /\b(then|first|next|after that|in the morning|in the evening|at night|at the weekend|every day|sometimes|on (sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?)\b/i;
// Small words every learner uses that are not in the topic word lists.
const FUNCTION_WORDS = ("a an the and but or so because is am are was were be been has have had does do did isn't aren't don't doesn't can can't will would "
  + 'i me my mine you your he him his she her it its we us our they them their this that these those there here what where when who why how which '
  + 'very too also not no yes some any many much more most all every each other another one two three four five six seven eight nine ten '
  + 'of in on at to from with for by about into near next opposite between behind under over up down out off please thank thanks hello hi dear ok okay').split(' ');

// Common A1 mistakes the rubric's Language band looks for (each one found lowers the estimate).
const ERRORS: [RegExp, string][] = [
  [/\b(because|maybe|and|but|so)\s+is\b/i, 'missing subject: “because it is …”'],
  [/\bare you (like|agree|want|have|go|live|work|play|need)\b/i, '“Do you like …?”, not “Are you like …?”'],
  [/\b(i|you|we|they|he|she)\s+(?!(?:am|is|are|was|were|will|can|'m|'re)\b)[a-z]+ing\b/i, 'missing am / is / are before -ing'],
  [/\bgo(es)? to [a-z]+ing\b/i, '“go swimming”, not “go to swimming”'],
  [/\b(he|she|it)\s+(go|like|live|work|have|play|want|study|watch|eat|get|need|speak)\b/i, 'he / she + -s: “he goes”'],
  [/\b(i|you|we|they)\s+(has|is|goes|likes|lives|works|wants)\b/i, 'wrong verb form after I / you / we / they'],
  [/\b(he|she|it)\s+(are|am|have)\b|\bi\s+(is|are)\b/i, 'wrong form of be / have'],
  [/\b(i|we|he|she|they)\s+(go|play|eat|have|is|are|visit)\b[^.!?]*\b(yesterday|last)\b/i, 'past time needs the past: “I went”'],
];
export const a1Errors = (t: string) => ERRORS.filter(([re]) => re.test(t)).map(([, why]) => why);

// Spelling: words that are not in the app's word lists (A1 words + Oxford A1), ignoring names and numbers.
let DICT: Set<string> | null = null;
const dict = () => (DICT ??= new Set(
  [...IATC.vocab.flatMap((v) => v.word.split(/[\s/]+/)), ...IATC.oxfordA1.flatMap((h) => h.split(/[,\s]+/)), ...FUNCTION_WORDS]
    .map((w) => w.replace(/[^a-zA-Z']/g, '').toLowerCase()).filter(Boolean),
));
const FORMS = (w: string) => [
  w, w.replace(/'s$/, ''), w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ed$/, ''), w.replace(/d$/, ''),
  w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/([a-z])\1ing$/, '$1'), w.replace(/([a-z])\1ed$/, '$1'), w.replace(/ied$/, 'y'),
  w.replace(/er$/, ''), w.replace(/est$/, ''), w.replace(/ier$/, 'y'), w.replace(/n't$/, ''), w.replace(/'(m|re|ve|ll|d)$/, ''),
];
export function unknownWords(t: string): string[] {
  const d = dict();
  const out: string[] = [];
  for (const sentence of t.split(/[.!?\n]+/)) {
    (sentence.match(/[A-Za-z][A-Za-z']*/g) ?? []).forEach((w, i) => {
      if (i > 0 && /^[A-Z]/.test(w)) return; // names and places
      const lw = w.toLowerCase();
      if (lw.length > 2 && !FORMS(lw).some((f) => d.has(f))) out.push(lw);
    });
  }
  return out;
}

const stem = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '').replace(/(ies|es|s)$/, '');

/** How many of the task's bullet points the text seems to answer. */
export function bulletsCovered(text: string, bullets: string[], prompt = ''): number {
  const words = new Set(text.split(/\s+/).map(stem).filter(Boolean));
  return bullets.filter((b) => {
    const keys = b.split(/[\s/,()]+/).map(stem).filter((w) => w.length >= 3 && !STOP.has(w));
    if (keys.length === 0) return wordCount(text) >= 8; // e.g. "where you are from": judge by length
    return keys.some((k) => words.has(k) || [...words].some((w) => w.length >= 4 && (w.startsWith(k) || k.startsWith(w))));
  }).length + (bullets.length === 0 && prompt ? 1 : 0);
}

export function estimateWriting(text: string, bullets: string[], prompt = ''): WritingMarks {
  const t = text.trim();
  const n = wordCount(t);
  if (n < 3) return { content: 0, organisation: 0, language: 0 };

  // Content: the three bullet points, and enough words (about 25)
  const covered = bulletsCovered(t, bullets, prompt);
  const need = Math.max(1, bullets.length);
  const content = covered >= need ? (n >= 20 ? 5 : 4) : covered === need - 1 ? (n >= 15 ? 3 : 2) : covered >= 1 ? (n >= 12 ? 2 : 1) : n >= 10 ? 1 : 0;

  // Organisation: linking words and cohesive devices (bands 5 / 3 / 1 of the rubric)
  const sentences = (t.match(/[.!?](\s|$)/g) ?? []).length;
  const linkers = new Set(LINKERS.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(t)));
  if (SEQUENCE.test(t)) linkers.add('sequence');
  const cohesive = new Set((t.match(COHESIVE) ?? []).map((x) => x.toLowerCase())).size;
  const beyondAnd = [...linkers].some((l) => l !== 'and');
  let organisation: number;
  if (linkers.size >= 2 && beyondAnd && cohesive >= 2 && sentences >= 3) organisation = 5;
  else if ((linkers.size >= 2 && cohesive >= 1) || (beyondAnd && cohesive >= 2)) organisation = 4;
  else if ((linkers.has('and') && cohesive >= 1) || beyondAnd) organisation = 3;
  else if (linkers.size >= 1 || cohesive >= 1) organisation = 2;
  else organisation = sentences === 0 && n < 8 ? 0 : 1;

  // Language: sentences with a verb, capitals and full stops, common A1 errors, spelling
  const parts = t.split(/[.!?]+/).map((x) => x.trim().replace(/^(hi|hello|dear)\b[^,\n]*[,\n]\s*/i, '')).filter((x) => wordCount(x) >= 3); // skip "Hi Toni," and sign-offs
  const long = parts.filter((x) => wordCount(x) >= 4); // short lines ("It's amazing!", "Your friend, Fahad") may have no verb
  const withVerb = long.filter((x) => VERB.test(x)).length / Math.max(1, long.length);
  const capitals = parts.filter((x) => /^[A-Z0-9"“]/.test(x)).length / Math.max(1, parts.length);
  let language = 2 + (withVerb >= 0.99 ? 2 : withVerb >= 0.6 ? 1 : 0) + (capitals >= 0.99 && /[.!?]\s*\w*$/.test(t) ? 1 : 0);
  if (/\bi\b/.test(t)) language -= 1;
  language -= Math.min(3, a1Errors(t).length);
  if (unknownWords(t).length >= 2) language -= 1;
  language = Math.max(1, Math.min(5, language));

  return { content, organisation, language };
}

/** One short tip for the weakest part, for the student. */
export function writingTip(m: WritingMarks): { en: string; ar: string } {
  const weakest = (['content', 'organisation', 'language'] as Criterion[]).reduce((a, b) => (m[b] < m[a] ? b : a));
  if (m[weakest] >= 5) return { en: 'Excellent! Keep writing like this.', ar: 'ممتاز! استمر في الكتابة هكذا.' };
  return {
    content: { en: 'Write about all 3 points. Aim for about 25 words.', ar: 'اكتب عن النقاط الثلاث، وحاول أن تكتب حوالي ٢٥ كلمة.' },
    organisation: { en: 'Join your ideas with and, but, because or so.', ar: 'اربط أفكارك بـ and و but و because و so.' },
    language: { en: 'Check every sentence: a capital letter, a verb (am / is / have / like …) and a full stop.', ar: 'راجع كل جملة: حرف كبير، وفعل، ونقطة في النهاية.' },
  }[weakest];
}
