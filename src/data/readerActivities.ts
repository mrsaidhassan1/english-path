// The interactive practice after each A1 Graded Reader:
// 1) Check your understanding (multiple choice), 2) Match the words, 3) Fill the gap, 4) Talk about it (record yourself).
import type { Activity, GapItem, Tags } from '../types';
import type { Reader } from './narrators';
import { READER_QUIZ } from './readerQuiz';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The word as it appears in its example sentence (any case), or null. */
function findIn(example: string, word: string) {
  const m = new RegExp(`(?<![A-Za-z])${esc(word)}(?![A-Za-z])`, 'i').exec(example);
  return m ? { at: m.index, text: m[0] } : null;
}
/** A word that is the whole example sentence ("Don't worry.") makes no gap. */
const wholeSentence = (example: string, word: string) => example.replace(/[^a-z]/gi, '').toLowerCase() === word.replace(/[^a-z]/gi, '').toLowerCase();

export function gapItems(r: Reader, max = 5): GapItem[] {
  const usable = r.vocab.filter((v) => findIn(v.example, v.word) && !wholeSentence(v.example, v.word));
  return usable.slice(0, max).map((v, i) => {
    const hit = findIn(v.example, v.word)!;
    const others = usable.filter((_, k) => k !== i).map((o) => o.word.toLowerCase());
    // two wrong choices from the same story, picked the same way every time
    const wrong = [others[(i + 1) % others.length], others[(i + 3) % others.length]].filter((w, k, a) => w && a.indexOf(w) === k && w !== hit.text.toLowerCase());
    const answer = hit.text;
    const match = (w: string) => (answer[0] === answer[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w);
    return {
      text: v.example.slice(0, hit.at) + '___' + v.example.slice(hit.at + hit.text.length),
      answer,
      options: [answer, ...wrong.map(match)],
      hint: v.ar,
    };
  });
}

export function readerActivities(r: Reader): Activity[] {
  const tags = (skill: Tags['skill']): Tags => ({ cefr: 'A1', topic: r.title, skill, module: 0, status: 'lesson' });
  const id = (k: string) => `reader-${r.week}-${k}`;
  const gaps = gapItems(r);
  const inGap = new Set(gaps.map((g) => g.answer.toLowerCase()));
  const matchWords = [...r.vocab.filter((v) => !inGap.has(v.word.toLowerCase())), ...r.vocab.filter((v) => inGap.has(v.word.toLowerCase()))].slice(0, 6);
  const acts: Activity[] = [
    { id: id('check'), kind: 'mcq', title: 'Check your understanding', prompt: 'Choose the right answer.', promptAr: 'اختر الإجابة الصحيحة.', tags: tags('reading'), items: READER_QUIZ[r.week] ?? [] },
    { id: id('match'), kind: 'match', title: 'Match the words', prompt: 'Tap a word, then tap its meaning.', promptAr: 'اضغط على الكلمة ثم على معناها.', tags: tags('vocabulary'), pairs: matchWords.map((v) => [v.word, v.meaning]), leftLabel: 'Word', rightLabel: 'Meaning' },
    { id: id('gap'), kind: 'gap', title: 'Fill the gap', prompt: 'Choose the word for each sentence.', promptAr: 'اختر الكلمة المناسبة لكل جملة.', tags: tags('vocabulary'), items: gaps },
    { id: id('talk'), kind: 'speak', title: 'Talk about it', prompt: 'Answer the questions. Record yourself, then listen.', promptAr: 'أجب عن الأسئلة. سجّل صوتك ثم استمع.', tags: tags('speaking'),
      task: { title: 'Talk about it', steps: r.talk, usefulLanguage: r.vocab.slice(0, 4).map((v) => [v.word, v.ar]) } },
  ];
  return acts.filter((a) => (a.kind === 'mcq' ? a.items.length : a.kind === 'gap' ? a.items.length : true));
}
