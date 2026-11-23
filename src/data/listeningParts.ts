// An A1 Listening practice paper (Week N Lesson M) as three parts of questions.
// Used by the Exams page and by the "Listening" step inside each lesson, so both play
// exactly the same recorded lines (the audio is keyed by speaker + text).
import type { DialogueLine, ListeningPart } from '../types';
import type { IatcListeningExam } from './content';

const TF = ['True', 'False'];

export function listeningParts(e: IatcListeningExam): ListeningPart[] {
  const p2 = e.p2.sentences;
  // Part 2 is recorded as one talk: the sentences joined, without the {answer} braces
  const p2Script: DialogueLine[] = [[e.p2.speaker, p2.map((s) => s.text.replace(/[{}]/g, '')).join(' ')]];
  return [
    {
      id: 'l1', title: 'Listening Part 1',
      instructions: 'Listen to each short dialogue. Choose the right answer.', instructionsAr: 'استمع لكل حوار قصير واختر الإجابة الصحيحة.',
      items: e.p1.items.map((it) => ({ q: it.q, options: it.opts, answer: it.ans, say: it.lines })),
    },
    {
      id: 'l2', title: `Listening Part 2 — ${e.p2.title}`, audio: p2Script,
      instructions: 'Listen. Choose the word you hear for each gap.', instructionsAr: 'استمع واختر الكلمة التي تسمعها لكل فراغ.',
      items: p2.filter((s) => s.opts).map((s) => {
        const ans = s.text.match(/\{([^}]+)\}/)?.[1] ?? '';
        return { q: s.text.replace(/\{[^}]+\}/, '______'), options: s.opts!, answer: s.opts!.indexOf(ans) };
      }),
    },
    {
      id: 'l3', title: `Listening Part 3 — ${e.p3.title}`, audio: e.p3.lines,
      instructions: 'Listen to the conversation. Are the sentences True or False?', instructionsAr: 'استمع للمحادثة. هل الجمل صحيحة أم خاطئة؟',
      items: (e.p3.items as [string, string | boolean][]).map(([q, a]) => ({ q, options: TF, answer: a === true || a === 'True' || a === 'T' ? 0 : 1 })),
    },
  ];
}
