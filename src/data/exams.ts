// Exam mode: timed A1 practice built from the IATC mocks and listening papers.
import type { DialogueLine, Skill, SourceRef } from '../types';
import { IATC, getUnitData } from './content';
import { MODULES } from './modules';
import { SPEAKING_PART1, SPEAKING_SRC } from './speaking';
import { WRITING_MAX } from './writingRubric';
import { listeningParts } from './listeningParts';

export interface ExamQuestion {
  q: string;
  options?: string[]; // missing → typed answer
  answer: number | string;
  say?: DialogueLine[]; // audio for listening questions
}

export interface ExamSection {
  id: string;
  title: string;
  skill: Skill;
  instructions: string;
  instructionsAr?: string;
  text?: string[]; // reading text
  audio?: DialogueLine[]; // one recording for the whole section
  kind: 'choice' | 'typed' | 'write' | 'speak';
  items: ExamQuestion[];
  write?: { title: string; prompt: string; bullets: string[]; model: string };
}

export interface Exam {
  id: string;
  title: string;
  kind: 'mock' | 'listening' | 'diagnostic' | 'speaking';
  description: string;
  minutes: number;
  sections: ExamSection[];
  src?: SourceRef;
}

const TF = ['True', 'False'];

function mockExam(m: (typeof IATC.mocks)[number]): Exam {
  const sections: ExamSection[] = [
    {
      id: 'p1', title: 'Reading Part 1', skill: 'reading', kind: 'choice',
      instructions: m.p1intro || 'Read the email. Are the sentences True or False?', instructionsAr: 'اقرأ الرسالة. هل الجمل صحيحة أم خاطئة؟',
      text: m.email, items: m.p1.map(([q, a]) => ({ q, options: TF, answer: a === 'True' ? 0 : 1 })),
    },
    {
      id: 'p2', title: 'Reading Part 2 — Opposites', skill: 'vocabulary', kind: 'choice',
      instructions: 'Choose the opposite of the word.', instructionsAr: 'اختر الكلمة المضادة.',
      items: m.p2.map(([w, opts, a]) => ({ q: w, options: opts, answer: opts.indexOf(a) })),
    },
    {
      id: 'p3', title: 'Reading Part 3 — Plurals', skill: 'grammar', kind: 'typed',
      instructions: 'Write the word in the plural.', instructionsAr: 'اكتب الكلمة بصيغة الجمع.',
      items: m.p3.map(([pre, w, post, a]) => ({ q: `${pre}[${w}]${post}`, answer: a })),
    },
    {
      id: 'p4', title: 'Reading Part 4 — Choose the word', skill: 'grammar', kind: 'choice',
      instructions: 'Choose the correct word.', instructionsAr: 'اختر الكلمة الصحيحة.',
      items: m.p4.map(([q, opts, a]) => ({ q, options: opts, answer: opts.indexOf(a) })),
    },
    {
      id: 'p5', title: 'Reading Part 5 — Past simple', skill: 'grammar', kind: 'choice',
      instructions: 'Choose the correct past form.', instructionsAr: 'اختر صيغة الماضي الصحيحة.',
      items: m.p5.map(([q, opts, a]) => ({ q, options: opts, answer: opts.indexOf(a) })),
    },
  ];
  if (m.writing) {
    sections.push({
      id: 'w', title: `Writing — ${m.writing.title}`, skill: 'writing', kind: 'write',
      instructions: 'Write about 25 words. Talk about all three points.', instructionsAr: 'اكتب حوالي ٢٥ كلمة وتحدث عن النقاط الثلاث.',
      items: [], write: m.writing,
    });
  }
  return {
    id: m.id, kind: 'mock', minutes: 45, src: m.src,
    title: m.title.replace(/—.*$/, '').replace(/\bWeek (\d+)/, 'Unit $1').trim(),
    description: `ELEM-style Reading (Parts 1–5, 25 marks)${m.writing ? ' + Writing (15 marks: Content, Organisation, Language)' : ''}.`,
    sections,
  };
}

function listeningExam(e: (typeof IATC.listeningExams)[number]): Exam {
  return {
    id: e.id, kind: 'listening', minutes: 20, src: e.src,
    title: `Listening: ${e.theme}`,
    description: `A1 Listening practice (${e.day}). Every recording plays twice.`,
    sections: listeningParts(e).map((p) => ({ ...p, skill: 'listening' as const, kind: 'choice' as const })),
  };
}

function diagnostic(): Exam {
  // Units 1–3 "Check yourself" items, sorted by what they test.
  const items = MODULES.slice(0, 3).flatMap((m) => {
    const a = m.lessons.find((l) => l.type === 'quiz')?.activities[0];
    return a && a.kind === 'mcq' ? a.items.map((x) => ({ ...x, unit: m.n })) : [];
  });
  const pick = (f: (x: (typeof items)[number]) => boolean, perUnit: number) =>
    [1, 2, 3].flatMap((n) => items.filter((x) => x.unit === n && f(x)).slice(0, perUnit));
  const reading = getUnitData(1)!.days[1].reading;
  const toQ = (m: { q: string; options: string[]; answer: number; say?: string }) => ({
    q: m.q, options: m.options, answer: m.answer, say: m.say ? ([['Speaker', m.say]] as DialogueLine[]) : undefined,
  });
  return {
    id: 'diagnostic-1', kind: 'diagnostic', minutes: 20,
    title: 'Starting Point Check (Units 1–3)',
    description: 'A short diagnostic test. It shows your strong skills and what to practise next.',
    src: reading.src,
    sections: [
      { id: 'd-g', title: 'Grammar', skill: 'grammar', kind: 'choice', instructions: 'Choose the right answer.', instructionsAr: 'اختر الإجابة الصحيحة.', items: pick((x) => !!x.grammar && !x.say, 3).map(toQ) },
      { id: 'd-v', title: 'Vocabulary', skill: 'vocabulary', kind: 'choice', instructions: 'Choose the right answer.', instructionsAr: 'اختر الإجابة الصحيحة.', items: pick((x) => !!x.word && !x.say, 2).map(toQ) },
      { id: 'd-l', title: 'Listening', skill: 'listening', kind: 'choice', instructions: 'Listen. Choose the right answer.', instructionsAr: 'استمع واختر الإجابة الصحيحة.', items: pick((x) => !!x.say, 2).map(toQ) },
      {
        id: 'd-r', title: `Reading — ${reading.title}`, skill: 'reading', kind: 'choice', text: reading.text.split('\n'),
        instructions: 'Read the text. True or False?', instructionsAr: 'اقرأ النص. صح أم خطأ؟',
        items: reading.tf.map(([q, a]) => ({ q, options: TF, answer: a === 'True' ? 0 : 1 })),
      },
    ],
  };
}

function speakingExam(): Exam {
  return {
    id: 'speaking-part1', kind: 'speaking', minutes: 10, src: SPEAKING_SRC,
    title: 'Speaking Part 1: Questions About You',
    description: 'Listen to each question. Record your answer. Answer in a full sentence and add one more idea.',
    sections: [{
      id: 's1', title: 'Questions about you', skill: 'speaking', kind: 'speak',
      instructions: 'Listen. Answer in a full sentence. Add one more idea.', instructionsAr: 'استمع وأجب بجملة كاملة وأضف فكرة أخرى.',
      items: SPEAKING_PART1.slice(0, 8).map((s) => ({ q: s.q, answer: s.model + (s.more ? ` ${s.more}` : '') })),
    }],
  };
}

export const EXAMS: Exam[] = [diagnostic(), ...IATC.mocks.map(mockExam), ...IATC.listeningExams.map(listeningExam), speakingExam()];
export const getExam = (id: string) => EXAMS.find((e) => e.id === id);

export const examTotal = (e: Exam) => e.sections.reduce((t, s) => t + (s.kind === 'write' ? WRITING_MAX : s.kind === 'speak' ? s.items.length * 2 : s.items.length), 0);
