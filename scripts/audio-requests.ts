// Lists every spoken line in the speaking parts of the app, for natural-voice recording.
//   npx vite-node scripts/audio-requests.ts   →  scripts/out/audio-requests.json
// Then: build_voices.py records them with the Kokoro voices from OpenVox (offline).
import { mkdirSync, writeFileSync } from 'node:fs';
import { MODULES, REVIEWS } from '../src/data/modules';
import { ROLE_PLAYS, SPEAKING_PART1 } from '../src/data/speaking';
import { IATC } from '../src/data/content';
import { EXAMS } from '../src/data/exams';
import { audioKey } from '../src/lib/audioKey';
import { NARRATORS, READERS, readerLine } from '../src/data/narrators';
import { CONVERSATIONS, convSpeaker } from '../src/data/conversations';
import { readerActivities } from '../src/data/readerActivities';
import { filledSentence } from '../src/lib/speech';
import type { Activity, DialogueLine } from '../src/types';

interface Req { key: string; text: string; speaker: string; group: string; kind: 'dialogue' | 'model' | 'teacher' | 'listening' | 'word' | 'example' | 'reading' | 'talk' | 'conversation'; cast?: string[]; bundle?: string; voice?: string }
const reqs = new Map<string, Req>();
// Short lines are packed into one bundle file per dialogue or activity (keeps the file count low for sharing);
// long texts (readings, exam talks) stay as their own files.
const bundleName = (group: string) => group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const add = (text: string, speaker: string, group: string, kind: Req['kind'], cast?: string[]) => {
  const key = audioKey(text, speaker);
  if (!key.text || reqs.has(key.id)) return;
  const bundle = kind === 'reading' || kind === 'talk' ? undefined : bundleName(group);
  reqs.set(key.id, { key: key.id, text: key.spoken, speaker, group, kind, cast, bundle });
};
const dialogue = (id: string, lines: DialogueLine[]) => {
  const cast = [...new Set(lines.map(([who]) => who))];
  lines.forEach(([who, text]) => add(text, who, id, 'dialogue', cast));
};

const acts: Activity[] = [...MODULES.flatMap((m) => m.lessons.flatMap((l) => l.activities)), ...REVIEWS.flatMap((r) => r.activities)];
for (const m of MODULES) dialogue(m.dialogue.id, m.dialogue.lines);
for (const a of acts) {
  if (a.kind === 'watch' || a.kind === 'dialogue') dialogue(a.dialogue.id, a.dialogue.lines);
  if (a.kind === 'listen') a.items.forEach((x) => add(x.text, '', a.id, 'model'));
  if (a.kind === 'speak') {
    if (a.task.model) add(a.task.model, '', a.id, 'model');
    a.task.usefulLanguage.forEach(([en]) => add(en.replace(/…/g, ''), '', a.id, 'model'));
  }
  if (a.kind === 'write') add(a.task.model, '', a.id, 'model');
  if (a.kind === 'mcq') a.items.forEach((q) => q.say && add(q.say, '', a.id, 'listening'));
}
for (const r of ROLE_PLAYS) {
  dialogue(r.dialogue.id, r.dialogue.lines);
  r.useful.forEach(([en]) => add(en.replace(/…/g, ''), '', r.id, 'model'));
}
SPEAKING_PART1.forEach((q, i) => {
  add(q.q, '', `part1-${i}`, 'teacher');
  add(`${q.model} ${q.more ?? ''}`, '', `part1-${i}`, 'model');
});

// ------------------------------------------------------------------ vocabulary (packed into bundles)
// Words and example sentences are many short clips, so they are packed into "bundle" files of about
// 30 words each (word + example together) instead of one file per clip.
const words = [...IATC.vocab].sort((a, b) => a.id.localeCompare(b.id));
const PER_BUNDLE = 30;
words.forEach((w, i) => {
  const bundle = `v${String(Math.floor(i / PER_BUNDLE)).padStart(2, '0')}`;
  addTo(bundle, w.word, 'word');
  if (w.example) addTo(bundle, w.example, 'example');
});
const oxfordExtra = IATC.oxfordA1.map((h) => h.split(',')[0].trim()).filter((h) => h && !reqs.has(audioKey(h).id));
oxfordExtra.forEach((h, i) => addTo(`ox${String(Math.floor(i / 60)).padStart(2, '0')}`, h, 'word'));

// ------------------------------------------------------------------ grammar examples (bundles) and readings
// Grammar: every example in the module grammar panels, every sentence in the A1 Grammar decks
// (used by the boosters), and the sentence-order answers.
const grammarLines: string[] = [];
for (const a of acts) {
  if (a.kind === 'grammar') a.points.forEach((p) => grammarLines.push(...p.examples));
  if (a.kind === 'order') a.items.forEach((o) => grammarLines.push(o.answer));
}
IATC.grammar.forEach((g) => g.sections.forEach((s) => grammarLines.push(...s.items)));
let gi = 0;
for (const line of grammarLines) {
  const before = reqs.size;
  addTo(`gr${String(Math.floor(gi / 40)).padStart(2, '0')}`, line, 'example');
  if (reqs.size > before) gi++;
}
// Listening exams: the same voice for each speaker as the class MP3s (the exam's own cast).
for (const e of IATC.listeningExams) {
  const cast = e.cast ?? {};
  const say = (text: string, who: string, kind: Req['kind']) => {
    const key = audioKey(text, who);
    if (!key.text || reqs.has(key.id)) return;
    reqs.set(key.id, { key: key.id, text: key.spoken, speaker: who, group: e.id, kind, voice: cast[who], bundle: kind === 'talk' ? undefined : bundleName(e.id) });
  };
  e.p1.items.forEach((it) => it.lines.forEach(([who, t]) => say(t, who, 'dialogue')));
  // Part 2 plays as one talk, exactly as the exam screen joins it
  say(e.p2.sentences.map((s) => s.text.replace(/[{}]/g, '')).join(' '), e.p2.speaker, 'talk');
  e.p3.lines.forEach(([who, t]) => say(t, who, 'dialogue'));
}

// Readings: whole texts, one file each (read at a calm pace) — module readings and the exam reading texts
// (mock emails in Reading Part 1 and the diagnostic reading), joined exactly as the exam screen shows them.
for (const a of acts) if (a.kind === 'reading') add(a.text, '', a.id, 'reading');
for (const ex of EXAMS) for (const s of ex.sections) if (s.text?.length) add(s.text.join('\n'), '', `${ex.id}/${s.id}`, 'reading');

// Graded readers (Reading page): every story read by each narrator, one file per story per narrator.
// The narrator reads each line as it is shown, with the speaker's name first ("Mr Adel: Good morning!").
for (const n of NARRATORS) {
  for (const r of READERS) {
    r.story.forEach((l) => {
      const key = audioKey(readerLine(l), n.speaker);
      if (!key.text || reqs.has(key.id)) return;
      reqs.set(key.id, { key: key.id, text: key.spoken, speaker: n.speaker, group: `reader-${r.week}`, kind: 'reading', voice: n.voice, bundle: `rd-${n.id}-w${String(r.week).padStart(2, '0')}` });
    });
  }
}

// Conversations (Conversations page): each person has their own voice, one bundle file per conversation.
for (const c of CONVERSATIONS) {
  for (const l of c.lines) {
    const speaker = convSpeaker(c, l.speaker);
    const key = audioKey(l.text, speaker);
    if (!key.text || reqs.has(key.id)) continue;
    reqs.set(key.id, { key: key.id, text: key.spoken, speaker, group: `conversation-${c.id}`, kind: 'conversation', voice: c.voices[l.speaker], bundle: `cv-${c.id}` });
  }
}

// Graded reader practice and word lists: the words, their examples, and what the activities read aloud
// (the right answer of each question, the finished gap sentence).
for (const r of READERS) {
  const b = `rq-w${String(r.week).padStart(2, '0')}`;
  for (const v of r.vocab) { addTo(b, v.word.replace(/…/g, ''), 'word'); addTo(b, v.example, 'example'); }
  for (const a of readerActivities(r)) {
    if (a.kind === 'mcq') for (const it of a.items) {
      const ans = it.options[it.answer];
      if (!/^(true|false|yes|no)$/i.test(ans.trim())) addTo(b, it.q.includes('___') ? filledSentence(it.q, ans) : ans, 'example');
    }
    if (a.kind === 'gap') for (const it of a.items) addTo(b, filledSentence(it.text, it.answer), 'example');
    if (a.kind === 'match') for (const [w] of a.pairs) addTo(b, w, 'word');
  }
}

function addTo(bundle: string, text: string, kind: 'word' | 'example') {
  const key = audioKey(text);
  if (!key.text || reqs.has(key.id)) return;
  reqs.set(key.id, { key: key.id, text: key.spoken, speaker: '', group: bundle, kind, bundle });
}

mkdirSync('scripts/out', { recursive: true });
writeFileSync('scripts/out/audio-requests.json', JSON.stringify([...reqs.values()], null, 1));
const by = [...reqs.values()].reduce<Record<string, number>>((t, r) => ({ ...t, [r.kind]: (t[r.kind] ?? 0) + 1 }), {});
console.log(`${reqs.size} lines`, by);
