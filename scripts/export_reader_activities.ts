// Exports the graded-reader practice (the same activities the Reading page shows) for the printed readers.
//   node ./node_modules/vite-node/vite-node.mjs scripts/export_reader_activities.ts
// Writes EFL Instructor Agent/Graded_Readers/reader-activities.json, read by build_graded_readers_docx.py.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { READERS } from '../src/data/narrators';
import { readerActivities } from '../src/data/readerActivities';

const out = READERS.map((r) => {
  const acts = readerActivities(r);
  const pick = <K extends (typeof acts)[number]['kind']>(k: K) => acts.find((a) => a.kind === k) as Extract<(typeof acts)[number], { kind: K }>;
  return {
    week: r.week,
    questions: pick('mcq').items.map((it) => ({ q: it.q, options: it.options, answer: it.answer })),
    match: pick('match').pairs,
    gap: pick('gap').items.map((it) => ({ text: it.text, answer: it.answer, options: it.options ?? [] })),
    talk: pick('speak').task.steps,
  };
});
const file = join(process.cwd(), '..', '..', 'EFL Instructor Agent', 'Graded_Readers', 'reader-activities.json');
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`wrote ${file}: ${out.length} stories`);
