// Units 1–8 = Weeks 1–8 of the A0 – A1 Weekly Materials (aligned to New Headway Beginner Units 1–8).
// Each unit has one lesson per class day (Sunday–Thursday): the day's words, grammar, reading, word work
// and writing, all from that day's deck and reading handout. Then a conversation + listening lesson
// and a "Check yourself" quiz. To change a unit's content, edit the weekly source files and re-run
// scripts/import_iatc_content.py; this file only holds the titles, Arabic goals and chosen dialogues.
import type { Activity, Dialogue, GapItem, Lesson, McqItem, Module, SourceRef, SpeakingTask } from '../../types';
import { existingWords, getDialogue, getListening, getUnitData, getWord, IATC, type IatcUnitDay } from '../content';
import { autoMatch, autoOrder, autoPicture, dialogueBuilder, optionsWith, tag } from './builder';
import { stripMarkup } from '../../lib/text';

interface UnitCfg {
  n: number;
  title: string;
  titleAr: string;
  icon: string;
  colour: string;
  goalsAr: string[];
  grammarKeys: string[];
  open?: boolean; // open to every student now (all its lessons), without finishing the units before it
  // From the Week N Conversations / Listening / Speaking pack (Headway-aligned since Oct 2026).
  // Defaults: Sunday's conversation, Monday's listening, Sunday's speaking questions.
  dialogue?: string | Dialogue;
  listening?: string;
  speaking?: string;
}
const convId = (c: UnitCfg) => c.dialogue ?? `dlg-s${c.n}d1`;
const listeningId = (c: UnitCfg) => c.listening ?? `lst-s${c.n}d2`;
const speakingId = (c: UnitCfg) => c.speaking ?? `spk-s${c.n}d1`;

export const UNIT_CFG: UnitCfg[] = [
  {
    n: 1, title: 'Hello!', titleAr: 'مرحباً!', icon: 'hand', colour: '#FF5151',
    grammarKeys: ['be', 'possessive-adj', 'a-an', 'plurals', 'numbers'],
    goalsAr: ['أستطيع أن أُلقي التحية وأعرّف بنفسي.', 'أستطيع أن أسأل عن الحال وأجيب.', 'أستطيع أن أستخدم تحيات الصباح والمساء والوداع.', 'أستطيع أن أسأل «ما هذا؟» وأجيب بـ a / an.', 'أستطيع أن أعدّ من ١ إلى ١٠ وأكوّن الجمع.', 'أستطيع أن أكتب ٢٥ كلمة عن نفسي وعن فصلي.'],
  },
  {
    n: 2, title: 'Your World', titleAr: 'عالمك', icon: 'globe', colour: '#25AFC7',
    grammarKeys: ['pronouns', 'possessive-adj', 'wh-questions', 'numbers', 'be'],
    goalsAr: ['أستطيع أن أسأل «من أين أنت؟» وأجيب.', 'أستطيع أن أتحدث عن الآخرين باستخدام he / she و his / her.', 'أستطيع أن أسأل «هل هو من …؟» وأجيب إجابة قصيرة.', 'أستطيع أن أقول الأرقام من ١١ إلى ٣٠ وأسأل عن العمر.', 'أستطيع أن أصف الأماكن والطقس.', 'أستطيع أن أكتب ٢٥ كلمة عن المكان الذي أنا منه.'],
  },
  {
    n: 3, title: 'All About You', titleAr: 'كل شيء عنك', icon: 'briefcase', colour: '#4F5BA8',
    grammarKeys: ['be', 'a-an', 'wh-questions'],
    goalsAr: ['أستطيع أن أسأل عن الوظيفة وأجيب.', 'أستطيع أن أسأل عن المعلومات الشخصية: الاسم والعنوان والهاتف والعمر.', 'أستطيع أن أستخدم isn’t و aren’t لتصحيح المعلومات.', 'أستطيع أن أستخدم عبارات الاعتذار والشكر.', 'أستطيع أن أكوّن أسئلة بـ am / is / are وأجيب إجابات قصيرة.', 'أستطيع أن أكتب ٢٥ كلمة عن وظائف عائلتي.'],
  },
  {
    n: 4, title: 'Family and Friends', titleAr: 'العائلة والأصدقاء', icon: 'users', colour: '#FF6B6B',
    grammarKeys: ['possessive-s', 'have-has', 'possessive-adj', 'spelling'],
    goalsAr: ['أستطيع أن أصف عائلتي باستخدام our و their و ’s.', 'أستطيع أن أعرف إن كانت ’s تعني is أو الملكية.', 'أستطيع أن أستخدم has / have.', 'أستطيع أن أقول ما أحبه وما أريده.', 'أستطيع أن أتهجّى اسمي وأعطي رقم هاتفي.', 'أستطيع أن أكتب ٢٥ كلمة عن صديقي المقرّب.'],
  },
  {
    n: 5, title: 'The Way I Live', titleAr: 'طريقة حياتي', icon: 'utensils', colour: '#1F9D6B',
    grammarKeys: ['present-simple', 'a-an', 'numbers'],
    goalsAr: ['أستطيع أن أقول ما أحبه وما لا أحبه.', 'أستطيع أن أسأل «هل تحب …؟» وأجيب.', 'أستطيع أن أتحدث عن حياتي: أسكن وأعمل وأتكلم.', 'أستطيع أن أربط الدول بالجنسيات واللغات.', 'أستطيع أن أسأل عن السعر وأقول الأسعار حتى ١٠٠ ريال.', 'أستطيع أن أكتب ٢٥ كلمة عن الطعام والرياضة التي أحبها.'],
  },
  {
    n: 6, title: 'Every Day', titleAr: 'كل يوم', icon: 'sun', colour: '#FFC14D',
    grammarKeys: ['present-simple', 'frequency', 'prepositions'],
    goalsAr: ['أستطيع أن أقول الوقت وأستخدم at / on / in.', 'أستطيع أن أصف يوم شخص: He gets up at six.', 'أستطيع أن أستخدم always و usually و often و sometimes و never.', 'أستطيع أن أتهجّى أفعال he / she: watches, goes, studies.', 'أستطيع أن أسأل «Does he …?» وأجيب.', 'أستطيع أن أكتب ٢٥ كلمة عن الروتين اليومي لشخص.'],
  },
  {
    n: 7, title: 'My Favourites', titleAr: 'أشيائي المفضلة', icon: 'star', colour: '#C8322F',
    grammarKeys: ['wh-questions', 'this-that', 'can', 'object-pronouns'],
    goalsAr: ['أستطيع أن أسأل بأدوات الاستفهام: What و Where و When و Who و Why و How many.', 'أستطيع أن أستخدم this / that والصفات قبل الأسماء.', 'أستطيع أن أطلب بأدب في المحلات: Can I have …?', 'أستطيع أن أصف رحلة بكلمات مثل fast و cheap و expensive.', 'أستطيع أن أستخدم me و him و her و us و them.', 'أستطيع أن أكتب ٢٥ كلمة عن أشيائي المفضلة.'],
  },
  {
    n: 8, title: 'Where I Live', titleAr: 'أين أسكن', icon: 'home', colour: '#161E54', open: true,
    grammarKeys: ['there-is', 'prepositions', 'countable'],
    goalsAr: ['أستطيع أن أصف بيتي باستخدام There is / There are.', 'أستطيع أن أقول أين توجد الأشياء: in و on و under و next to.', 'أستطيع أن أسأل «Is there …?» وأستخدم some / any.', 'أستطيع أن أعطي الاتجاهات: Turn left. Go straight on.', 'أستطيع أن أتحدث عن الطقس والفصول.', 'أستطيع أن أكتب ٢٥ كلمة عن مدينتي.'],
  },
  {
    n: 9, title: 'Times Past', titleAr: 'أيام مضت', icon: 'history', colour: '#25AFC7',
    grammarKeys: ['was-were', 'past-simple', 'numbers'],
    goalsAr: ['أستطيع أن أقول السنوات: nineteen ninety-six.', 'أستطيع أن أقول متى وُلد الناس: He was born in 1980.', 'أستطيع أن أقول الشهور وتاريخ ميلادي.', 'أستطيع أن أقول التواريخ بالأعداد الترتيبية: the fifth of May.', 'أستطيع أن أستخدم was / were للحديث عن الماضي.', 'أستطيع أن أستخدم went و had و did و saw للحديث عن الأمس.'],
  },
  {
    n: 10, title: 'We Had a Great Time!', titleAr: 'قضينا وقتاً رائعاً!', icon: 'camera', colour: '#FF6B6B',
    grammarKeys: ['past-simple', 'wh-questions'],
    goalsAr: ['أستطيع أن أتهجّى وأنطق الأفعال الماضية المنتظمة: played, watched, studied.', 'أستطيع أن أسأل «Did you …?» وأجيب إجابة قصيرة.', 'أستطيع أن أسأل بأدوات الاستفهام في الماضي: Where did you go?', 'أستطيع أن أستخدم ago و last week و in مع السنة.', 'أستطيع أن أتحدث عن الرياضة وأنشطة وقت الفراغ.', 'أستطيع أن أكتب ٢٥ كلمة عن رحلة أو يوم خارج البيت.'],
  },
  {
    n: 11, title: 'I Can Do That!', titleAr: 'أستطيع فعل ذلك!', icon: 'trophy', colour: '#1F9D6B',
    grammarKeys: ['can', 'adverbs', 'adjectives'],
    goalsAr: ['أستطيع أن أقول ما يستطيع الناس فعله وما لا يستطيعون في أعمالهم.', 'أستطيع أن أسأل «Can you …?» وأجيب إجابة قصيرة.', 'أستطيع أن أستخدم الظروف: well و fast و slowly و fluently.', 'أستطيع أن أضع الصفة قبل الاسم: a dangerous sport.', 'أستطيع أن أتحدث عن الإنترنت وكيف أستخدمه.', 'أستطيع أن أسأل «What’s the matter?» وأطلب المساعدة.'],
  },
  {
    n: 12, title: 'Please and Thank You', titleAr: 'من فضلك وشكراً', icon: 'shopping-bag', colour: '#FFC14D',
    grammarKeys: ['would-like', 'countable', 'can'],
    goalsAr: ['أستطيع أن أقول ما يمكن شراؤه في المحلات المختلفة.', 'أستطيع أن أطلب بأدب: I’d like … / Would you like …?', 'أستطيع أن أستخدم some و any مع الطعام.', 'أستطيع أن أطلب وجبة في مطعم.', 'أستطيع أن أفهم اللافتات الشائعة: Push و Pull و No entry.', 'أستطيع أن أعطي نصيحة صحية بـ too much و too many.'],
  },
  {
    n: 13, title: 'Here and Now', titleAr: 'هنا والآن', icon: 'shirt', colour: '#C8322F',
    grammarKeys: ['present-continuous', 'present-simple'],
    goalsAr: ['أستطيع أن أصف الملابس والألوان: He’s wearing a white thobe.', 'أستطيع أن أقول ما يفعله الناس الآن: am / is / are + -ing.', 'أستطيع أن أسأل بالمضارع المستمر: Where are you going?', 'أستطيع أن أختار بين المضارع البسيط والمضارع المستمر.', 'أستطيع أن أستخدم الأفعال المتضادة: arrive / leave و open / close.', 'أستطيع أن أتحدث عن المشاعر والمرض: I’m worried. I have a cold.'],
  },
  {
    n: 14, title: 'It’s Time to Go!', titleAr: 'حان وقت الرحيل!', icon: 'plane', colour: '#161E54',
    grammarKeys: ['going-to', 'past-simple', 'present-simple'],
    goalsAr: ['أستطيع أن أقول كيف أسافر: by car و by plane و on foot.', 'أستطيع أن أتحدث عن خططي المستقبلية بـ going to.', 'أستطيع أن أسأل بـ going to: What are you going to study?', 'أستطيع أن أستخدم المضارع والماضي و going to في نص واحد.', 'أستطيع أن أستخدم العبارات الاجتماعية: Same to you! و My pleasure.', 'أستطيع أن أكتب ٢٥ كلمة عن خططي للإجازة.'],
  },
];

export const DAY_AR: Record<string, string> = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس' };

/** Grammar key for a day's grammar title (most specific first). */
export function grammarKeyFor(title: string, fallback: string): string {
  const rules: [RegExp, string][] = [
    [/present continuous|wearing|what are you doing|where are they going/i, 'present-continuous'], [/going to/i, 'going-to'],
    [/i'd like|would you like/i, 'would-like'], [/too much|too many/i, 'countable'], [/was \/ were|were born|past of be|saying years/i, 'was-were'],
    [/past simple|did you|-ed\b|\bago\b|went|yesterday/i, 'past-simple'], [/adverb/i, 'adverbs'], [/can't|can you|can \+/i, 'can'],
    [/ordinal|date of birth|months/i, 'numbers'],
    [/plural/i, 'plurals'], [/possessive 's|'s =/i, 'possessive-s'], [/has \/ have/i, 'have-has'], [/alphabet|spell/i, 'spelling'],
    [/always|usually|never/i, 'frequency'], [/there is|is there/i, 'there-is'], [/some \/ any/i, 'countable'], [/prepositions|at \/ on \/ in|directions/i, 'prepositions'],
    [/me • him|me \/ him/i, 'object-pronouns'], [/this \/ that/i, 'this-that'], [/adjective/i, 'adjectives'], [/can i/i, 'can'], [/how much|numbers/i, 'numbers'],
    [/present simple|like|do you|does he|-s •|-es/i, 'present-simple'], [/a \/ an/i, 'a-an'], [/my \/ your|his \/ her|our \/ their|he \/ she/i, 'possessive-adj'],
    [/question words|where|how old|what's his/i, 'wh-questions'], [/am \/ is \/ are|isn't|i'm/i, 'be'],
  ];
  return rules.find(([re]) => re.test(title))?.[1] ?? fallback;
}

/** "It's ___ computer. (a / an)" → a gap with the options from the brackets. */
function practiceToGap(q: string, a: string, grammar: string): GapItem {
  const m = q.match(/\(([^)]+\/[^)]+)\)\s*$/);
  let options = m ? m[1].split('/').map((s) => s.trim()) : undefined;
  // "___ name's Omar. (my / your)" → answer "My": capitalise the choices at the start of a sentence
  if (options && /^[A-Z]/.test(a) && options.some((o) => o === a.toLowerCase())) options = options.map((o) => o.charAt(0).toUpperCase() + o.slice(1));
  return {
    text: q.replace(/\s*\([^)]*\/[^)]*\)\s*$/, '').replace(/_{2,}/g, '___'),
    answer: a,
    options: options && options.some((o) => o.toLowerCase() === a.toLowerCase()) ? options : undefined,
    grammar,
  };
}

/** A day's grammar practice → gap items, plus "Put in order: …" items for the sentence builder. */
function practiceOf(d: IatcUnitDay, gKey: string): { gaps: GapItem[]; order: string[] } {
  const gaps: GapItem[] = [];
  const order: string[] = [];
  for (const [q, a] of d.grammar?.practice ?? []) {
    if (/^put in order:/i.test(q)) order.push(a);
    else if (/'s = \?$/.test(q)) gaps.push({ text: q.replace(/\?$/, '___'), answer: a, options: ['is', 'possessive'], grammar: gKey });
    else if (q.includes('__')) gaps.push(practiceToGap(q, a, gKey)); // "Correct it: …" items stay in the handout only
  }
  return { gaps, order };
}

function dayLesson(n: number, d: IatcUnitDay, k: number, key0: string): Lesson {
  const id = (s: string) => `u${n}-d${k + 1}-${s}`;
  const topic = d.theme;
  const words = existingWords(d.words);
  const gKey = grammarKeyFor(d.grammarTitle, key0);
  const acts: Activity[] = [];

  if (words.length) {
    acts.push({ kind: 'flashcards', id: id('cards'), title: 'New words', prompt: 'Look, listen and say each word.', promptAr: 'انظر واستمع وقل كل كلمة.', words: words.slice(0, 12), tags: tag(n, 'vocabulary', topic), src: getWord(words[0])?.src });
    if (words.length >= 4) acts.push(autoMatch(id('match'), n, topic, words, 6));
    const pic = autoPicture(id('pic'), n, topic, words, 4);
    if (pic) acts.push(pic);
  }
  if (d.grammar) {
    acts.push({
      kind: 'grammar', id: id('gram'), title: d.grammarTitle, prompt: 'Read and listen. Look at the examples.', promptAr: 'اقرأ واستمع، وانظر إلى الأمثلة.',
      points: [{ title: d.grammarTitle, explain: d.grammar.rules, examples: d.grammar.examples, colour: (['coral', 'sky', 'mint', 'sun', 'navy'] as const)[k % 5], src: d.src }],
      tags: tag(n, 'grammar', topic, gKey), src: d.src,
    });
    const { gaps, order } = practiceOf(d, gKey);
    if (gaps.length) acts.push({ kind: 'gap', id: id('gap'), title: 'Grammar practice', prompt: 'Write or choose the right word.', promptAr: 'اكتب أو اختر الكلمة الصحيحة.', items: gaps, tags: tag(n, 'grammar', topic, gKey), src: d.src });
    // short example sentences (one sentence, 3–9 words) → put the words in order
    const sentences = d.grammar.examples.map(stripMarkup).filter((t) => { const w = t.split(' ').length; return w >= 3 && w <= 9 && (t.match(/[.?!]/g) ?? []).length <= 1; });
    const toOrder = [...order, ...sentences].slice(0, 3);
    if (toOrder.length >= 2) acts.push({ ...autoOrder(id('order'), n, topic, toOrder, gKey), src: d.src });
  }

  const r = d.reading;
  if (r.text) {
    const tf: McqItem[] = r.tf.map(([s, a]) => ({ q: s, options: ['True', 'False'], answer: a === 'True' ? 0 : 1 }));
    const answers = r.comp.map(([, a]) => a);
    const comp: McqItem[] = answers.length >= 3 ? r.comp.map(([q, a], i) => {
      const options = optionsWith(a, answers, 3, n * 40 + k * 7 + i);
      return { q, options, answer: options.indexOf(a) };
    }) : [];
    acts.push({
      kind: 'reading', id: id('read'), title: `Read: ${r.title}`, prompt: 'Read the text. Then answer the questions.', promptAr: 'اقرأ النص ثم أجب عن الأسئلة.',
      text: r.text, textTitle: r.title, questions: [...tf, ...comp], tags: tag(n, 'reading', topic), src: r.src,
    });
  }

  if (d.opp.length >= 4) {
    const pool = d.opp.map(([, b]) => b);
    acts.push({
      kind: 'mcq', id: id('opp'), title: 'Opposites', prompt: 'Choose the opposite.', promptAr: 'اختر الكلمة المضادة.',
      items: d.opp.map(([a, b], i) => { const options = optionsWith(b, pool, 3, n * 17 + k * 5 + i); return { q: `What is the opposite of “${a}”?`, options, answer: options.indexOf(b) }; }),
      tags: tag(n, 'vocabulary', topic, undefined, 'exam'), src: r.src,
    });
  }
  const groups = ['+ s', '+ es', 'y → ies', 'different'];
  const rule = ([s, p]: [string, string]): number => (p === `${s}s` ? 0 : p === `${s}es` ? 1 : /y$/.test(s) && p === `${s.slice(0, -1)}ies` ? 2 : 3);
  const used = new Set<number>(d.plur.map(rule));
  if (d.plur.length >= 4 && k % 2 === 1 && used.size >= 2) {
    acts.push({
      kind: 'sort', id: id('plur-sort'), title: 'Plurals: sort the words', prompt: 'How do we make the plural? Put each word in the right box.', promptAr: 'كيف نكوّن الجمع؟ ضع كل كلمة في المربع الصحيح.',
      groups: groups.filter((_, g) => used.has(g)), items: d.plur.map((pr) => ({ text: `${pr[0]} → ${pr[1]}`, group: [...used].sort((x, y) => x - y).indexOf(rule(pr)) })),
      tags: tag(n, 'grammar', topic, 'plurals', 'exam'), src: r.src,
    });
  } else if (d.plur.length >= 4) {
    acts.push({
      kind: 'gap', id: id('plur'), title: 'Plurals', prompt: 'Write the plural.', promptAr: 'اكتب صيغة الجمع.',
      items: d.plur.map(([s, p]) => ({ text: `one ${s} → two ___`, answer: p, grammar: 'plurals' })), tags: tag(n, 'grammar', topic, 'plurals', 'exam'), src: r.src,
    });
  }

  const w = d.writing;
  if (w?.prompt && w.model) {
    acts.push({
      kind: 'write', id: id('write'), title: w.title || 'Writing', prompt: w.prompt, promptAr: 'اكتب حوالي ٢٥ كلمة.',
      task: { title: w.title || 'Writing', prompt: w.prompt, bullets: w.bullets ?? [], frame: w.frame, model: w.model, minWords: 20 },
      tags: tag(n, 'writing', topic), src: r.src,
    });
  }

  return {
    id: `u${n}-d${k + 1}`, module: n, title: `${d.day}: ${r.title || d.theme}`, titleAr: DAY_AR[d.day], day: d.day, type: 'day',
    minutes: Math.max(10, acts.length * 3), activities: acts,
  };
}

function listeningActs(n: number, lstId: string, topic: string): Activity[] {
  const l = getListening(lstId);
  if (!l) return [];
  const dlg: Dialogue = { id: l.id, title: l.title, setting: l.type ? `Listen: ${l.type}.` : undefined, lines: l.script, src: l.src };
  const items: McqItem[] = l.mc.map(([q, a, b, c, letter]) => ({ q, options: [a, b, c], answer: Math.max(0, 'ABC'.indexOf(letter)) }));
  return [
    { kind: 'watch', id: `u${n}-lst`, title: `Listen: ${l.title}`, prompt: 'Listen. Read the words if you need them.', promptAr: 'استمع، واقرأ الكلمات إذا احتجت.', dialogue: dlg, tags: tag(n, 'listening', topic), src: l.src },
    { kind: 'mcq', id: `u${n}-lst-q`, title: 'Listening questions', prompt: 'Choose the right answer.', promptAr: 'اختر الإجابة الصحيحة.', items, tags: tag(n, 'listening', topic, undefined, 'exam'), src: l.src },
  ];
}

function speakingTask(cfg: UnitCfg, days: IatcUnitDay[], unitTitle: string): SpeakingTask {
  const sp = IATC.speaking.find((s) => s.id === speakingId(cfg));
  if (sp?.p1?.length) {
    // Speaking Part 1 style: the week's questions, with Arabic and a model answer
    return {
      title: `Speak: ${unitTitle}`,
      steps: sp.p1.slice(0, 5).map(([q]) => `Answer: ${stripMarkup(q)}`),
      usefulLanguage: sp.p1.slice(0, 5).map(([q, ar]) => [stripMarkup(q), ar] as [string, string]),
      model: sp.p1.slice(0, 2).map(([, , m]) => stripMarkup(m)).join(' '),
    };
  }
  const qs = days.map((d) => d.speaking[0]).filter(Boolean).map(stripMarkup);
  return { title: `Speak: ${unitTitle}`, steps: qs.map((q) => `Answer: ${q}`), usefulLanguage: sp?.lang?.slice(0, 5) ?? [] };
}

function quizFor(n: number, days: IatcUnitDay[], words: string[], key0: string): McqItem[] {
  const grammar: McqItem[] = [];
  days.forEach((d) => {
    const gKey = grammarKeyFor(d.grammarTitle, key0);
    practiceOf(d, gKey).gaps.filter((g) => g.options && g.options.length >= 2).slice(0, 2)
      .forEach((g) => grammar.push({ q: g.text, options: g.options!, answer: g.options!.findIndex((o) => o.toLowerCase() === g.answer.toLowerCase()), grammar: g.grammar }));
  });
  const ws = words.map((w) => getWord(w)!).filter((w) => w && w.meaning && !/\s/.test(w.word));
  const pool = ws.map((w) => w.word);
  const vocab: McqItem[] = ws.filter((_, i) => i % 9 === 4).slice(0, 2).map((w, i) => {
    const options = optionsWith(w.word, pool, 3, n * 61 + i);
    return { q: `“${w.meaning}”`, options, answer: options.indexOf(w.word), word: w.id, explain: w.example };
  });
  const listen: McqItem[] = ws.filter((_, i) => i % 11 === 7).slice(0, 2).map((w, i) => {
    const options = optionsWith(w.word, pool, 3, n * 73 + i);
    return { q: 'Listen. Which word do you hear?', options, answer: options.indexOf(w.word), say: w.word, word: w.id };
  });
  return [...grammar.slice(0, 6), ...vocab, ...listen].slice(0, 10);
}

function buildUnit(cfg: UnitCfg, distractors: string[]): Module | null {
  const u = getUnitData(cfg.n);
  if (!u) return null;
  const { n } = cfg;
  const key0 = cfg.grammarKeys[0];
  const words = existingWords(u.days.flatMap((d) => d.words));
  const want = convId(cfg);
  const conv = typeof want === 'string' ? getDialogue(want) : null;
  if (typeof want === 'string' && !conv) return null;
  const dialogue: Dialogue = typeof want === 'string'
    ? { id: conv!.id, title: conv!.title, setting: conv!.setting, lines: conv!.lines, src: conv!.src }
    : want;
  const subtitle = u.focus.split('•').slice(1).map((s) => s.trim()).filter(Boolean).join(' • ');

  const lessons: Lesson[] = u.days.map((d, k) => dayLesson(n, d, k, key0));
  const repeat = u.days.flatMap((d) => d.grammar?.examples.slice(0, 1) ?? []).map((t) => ({ text: stripMarkup(t) }));
  lessons.push({
    id: `u${n}-talk`, module: n, title: 'Conversation & listening', titleAr: 'محادثة واستماع', type: 'dialogue', minutes: 15,
    activities: [
      { kind: 'watch', id: `u${n}-dlg`, title: dialogue.title, prompt: 'Listen to the conversation. Read the words.', promptAr: 'استمع إلى المحادثة واقرأ الكلمات.', dialogue, tags: tag(n, 'listening', cfg.title), src: dialogue.src },
      dialogueBuilder(`u${n}-build`, n, cfg.title, dialogue, distractors.filter((t) => !dialogue.lines.some(([, l]) => stripMarkup(l) === t))),
      ...listeningActs(n, listeningId(cfg), cfg.title),
      ...(repeat.length ? [{ kind: 'listen' as const, id: `u${n}-repeat`, title: 'Listen and repeat', prompt: 'Listen. Then say it.', promptAr: 'استمع ثم كرّر.', items: repeat, tags: tag(n, 'speaking', cfg.title) }] : []),
      { kind: 'speak', id: `u${n}-speak`, title: `Speak: ${cfg.title}`, prompt: 'Your turn to speak.', promptAr: 'دورك في التحدث.', task: speakingTask(cfg, u.days, cfg.title), tags: tag(n, 'speaking', cfg.title) },
    ],
  });
  lessons.push({
    id: `u${n}-check`, module: n, title: 'Check yourself', titleAr: 'اختبر نفسك', type: 'quiz', minutes: 8,
    activities: [{ kind: 'mcq', id: `u${n}-quiz`, title: 'Check yourself', prompt: 'Choose the right answer.', promptAr: 'اختر الإجابة الصحيحة.', items: quizFor(n, u.days, words, key0), tags: tag(n, 'grammar', cfg.title, key0, 'revision') }],
  });

  const sources: SourceRef[] = [u.src, ...u.days.flatMap((d) => [d.reading.src, d.src]), ...(dialogue.src ? [dialogue.src] : []), ...(getListening(listeningId(cfg)) ? [getListening(listeningId(cfg))!.src] : [])];
  return {
    n, id: `u${n}`, title: cfg.title, titleAr: cfg.titleAr, subtitle, icon: cfg.icon, colour: cfg.colour,
    goals: u.review, goalsAr: cfg.goalsAr, grammarKeys: cfg.grammarKeys, vocab: words, dialogue, lessons, full: true, sources,
    week: u.week, collegeWeek: u.collegeWeek, dates: u.dates, headwayUnit: u.headwayUnit, open: cfg.open,
  };
}

const convLines = UNIT_CFG.flatMap((c) => { const d = convId(c); return typeof d === 'string' ? getDialogue(d)?.lines ?? [] : d.lines; }).map(([, t]) => stripMarkup(t));
export const UNITS: Module[] = UNIT_CFG.map((c) => buildUnit(c, convLines)).filter((m): m is Module => !!m);
