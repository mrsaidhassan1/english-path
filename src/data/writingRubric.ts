// The A1 writing rubric used at IATC (A1 Exam / A1 Writing Exam / "A1 writing rubric.pdf"):
// Content, Organisation and Language, each 0–5, total /15. Bands 5, 3, 1 and 0 have descriptors;
// band 4 shares features of 3 and 5, band 2 of 1 and 3.
// The descriptors below are short teacher-facing summaries; the PDF is the official version.
import type { SourceRef } from '../types';

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

// The automatic first check (marks, reasons, feedback) is in writingCheck.ts.
