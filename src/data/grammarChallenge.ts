// Foundation Grammar Challenge sets (100 multiple-choice questions each), imported by
// scripts/import_grammar_challenge.py from the answer key + exam documents.
// The explanations below are written for the app: a learner who answers wrongly sees the right
// sentence and why. Every question and every part has one (a test checks this).
import raw from './generated/grammar-challenge.json';
import type { McqItem } from '../types';
import { SET2_NOTES, SET3_NOTES, SET2_RULE_CHANGES, SET3_RULE_CHANGES, SET2_QUESTION_GRAMMAR, SET3_QUESTION_GRAMMAR } from './grammarChallengeNotes';

export interface ChallengeQuestion { n: number; q: string; options: string[]; answer: number }
export interface ChallengePart { n: number; focus: string; focusAr: string; instruction: string; instructionAr: string; questions: ChallengeQuestion[] }
export interface ChallengeSet { id: string; set: number; title: string; topic: string; parts: ChallengePart[]; src: { file: string; label: string } }

export const CHALLENGE_SETS = (raw as unknown as { sets: ChallengeSet[] }).sets;
export const getChallengeSet = (id: string): ChallengeSet | undefined => CHALLENGE_SETS.find((s) => s.id === id);
/** Score the exam asks for. */
export const CHALLENGE_TARGET = 0.8;

/** A short reminder of the rule for each part (English, then Arabic). */
export const PART_RULES: Record<string, Record<number, { en: string; ar: string }>> = {
  set1: {
    1: { en: 'An adjective describes a noun (a good student). An adverb describes a verb (speaks well). Many adverbs end in -ly.', ar: 'الصفة تصف الاسم (طالب جيّد)، والظرف يصف الفعل (يتكلم جيداً).' },
    2: { en: 'Short adjective + -er + than (taller than). Long adjective: more + adjective + than. The best: the + -est or the most.', ar: 'صفة قصيرة + er + than. صفة طويلة: more + صفة. التفضيل: the + est أو the most.' },
    3: { en: 'this / these = near. that / those = far. this / that = one thing. these / those = more than one.', ar: 'this / these للقريب، و that / those للبعيد. this / that للمفرد، و these / those للجمع.' },
    4: { en: 'Present simple: he / she / it + verb with -s. Questions and negatives use do / does + the base verb.', ar: 'المضارع البسيط: مع he / she / it نضيف s. في السؤال والنفي نستخدم do / does + الفعل الأصلي.' },
    5: { en: 'Present simple: he / she / it + verb with -s. After does / doesn’t use the base verb (does he live? he doesn’t live).', ar: 'بعد does / doesn’t نستخدم الفعل الأصلي بدون s.' },
    6: { en: 'Present simple = habits (every day). Present continuous = am / is / are + -ing = happening now.', ar: 'المضارع البسيط للعادات، والمضارع المستمر (am / is / are + ing) لما يحدث الآن.' },
    7: { en: 'Right now → am / is / are + -ing. Every day → present simple. Verbs like know, like, want do not use -ing.', ar: 'الآن → am / is / are + ing. كل يوم → مضارع بسيط. أفعال مثل know و like لا تأخذ ing.' },
    8: { en: 'Past simple: many verbs are irregular (wake → woke, leave → left). After did / didn’t use the base verb.', ar: 'الماضي البسيط: كثير من الأفعال شاذة (wake → woke). بعد did / didn’t نستخدم الفعل الأصلي.' },
    9: { en: 'Past simple: irregular verbs change (see → saw, go → went). After did / didn’t use the base verb.', ar: 'الأفعال الشاذة تتغير في الماضي (see → saw). بعد did / didn’t نستخدم الفعل الأصلي.' },
    10: { en: 'Past continuous = was / were + -ing. It shows an action in progress at a time in the past.', ar: 'الماضي المستمر = was / were + ing لفعل كان مستمراً في وقت في الماضي.' },
    11: { en: 'always (100%) · usually · often · sometimes · rarely · never (0%). The word goes before the verb, but after am / is / are.', ar: 'ظروف التكرار تأتي قبل الفعل وبعد am / is / are.' },
    12: { en: 'at + clock time / place point. on + days. in + months, years, parts of the day. between = in the middle of two things.', ar: 'at مع الساعة، on مع الأيام، in مع الشهور وأجزاء اليوم. between بين شيئين.' },
    13: { en: 'Plural: usually + s. After -s, -sh, -ch, -x add -es. Consonant + y → -ies. Some are irregular: person → people, child → children.', ar: 'الجمع: s عادةً، es بعد s / sh / ch / x، و y → ies. وبعضها شاذ: child → children.' },
    14: { en: 'his / her / our are before a noun. mine / yours stand alone. There is + one thing. There are + more than one. There isn’t any + milk, water, sugar.', ar: 'his / our قبل الاسم، و mine وحدها. there is للمفرد، و there are للجمع.' },
    15: { en: 'Learn words in pairs: arrive – leave, busy – free, before – after, difficult – easy.', ar: 'تعلّم الكلمة مع ضدها.' },
    16: { en: 'Seasons in order: spring, summer, autumn, winter. Months and days have a fixed order, too.', ar: 'ترتيب الفصول: spring، summer، autumn، winter.' },
    17: { en: 'was = I / he / she / it. were = you / we / they / plural. Negative: wasn’t / weren’t. With was / were we do not use did.', ar: 'was مع I / he / she / it، و were مع you / we / they. ولا نستخدم did مع was / were.' },
    18: { en: 'Country → person: Brazil → Brazilian, China → Chinese, the Philippines → Filipino.', ar: 'الدولة والجنسية: Brazil → Brazilian، China → Chinese.' },
    19: { en: 'Ordinal numbers end in -th (fourth, sixth). Special: first, second, third, fifth, eighth, ninth, twelfth. y → -ieth (twentieth).', ar: 'الأعداد الترتيبية تنتهي بـ th، وبعضها شاذ: first، second، third، fifth، eighth، ninth، twelfth.' },
    20: { en: 'Irregular past verbs do not end in -ed: write → wrote, teach → taught, think → thought, catch → caught, drive → drove.', ar: 'الأفعال الشاذة في الماضي لا تنتهي بـ ed.' },
  },
};

/** Why the answer is right, one line for every question. */
export const QUESTION_NOTES: Record<string, Record<number, string>> = {
  set1: {
    1: '“well” is the adverb of “good”. We use an adverb after a verb: speaks … well.',
    2: '“hard” here means with a lot of effort. “hardly” means almost not.',
    3: 'After “is / are” we use an adjective: crowded (not crowdedly).',
    4: 'After the verb “walk” we use an adverb: quietly (not quiet).',
    5: 'Short adjective + -er. Easy ends in y, so y → i: easy → easier.',
    6: 'hot has one vowel + one consonant, so we double the last letter: hot → hotter.',
    7: 'After “the” we use the superlative. Short adjective: tall → the tallest.',
    8: 'Long adjectives use more: more difficult than.',
    9: 'The superlative of a long adjective is “the most”: the most interesting.',
    10: 'Heavy ends in y, so y → i: heavy → heavier.',
    11: '“here” = near → This. “over there” = far, and classmates is plural → those.',
    12: '“over there” = far, and bag is one thing → that.',
    13: '“in my hands” = near, and books is plural → These.',
    14: '“over there” = far, and students is plural → those.',
    15: '“here on the table” = near, and ID card is one thing → this.',
    16: 'Khalid = he. With he / she / it we add -s to the verb: wakes.',
    17: 'Verbs ending in -sh take -es with he / she / it: wash → washes.',
    18: '“My classes” is plural, so there is no -s on the verb: start.',
    19: 'Your brother = he. A question with he / she / it uses Does.',
    20: 'They + not → do not. “does” is only for he / she / it.',
    21: 'The lesson = it. Question word + does + subject + base verb.',
    22: 'My sister = she, so do → does. “dos” is not a word.',
    23: 'After doesn’t we use the base verb: doesn’t live (not lives).',
    24: 'After Does we use the base verb: Does Sam study (not studies).',
    25: 'Khalid and his friends = they. No -s on the verb: play.',
    26: '“Be quiet!” — it is happening now, so we use present continuous: is talking.',
    27: '“today” shows something different from usual, happening now: am going.',
    28: '“every day” is a habit → present simple: takes.',
    29: '“Look!” — it is happening now: is running.',
    30: '“at the moment” = now → present continuous: are you doing.',
    31: '“right now” → is having (the action is happening now).',
    32: '“know” does not use -ing. We say: I know.',
    33: 'They are talking now, so: are they talking.',
    34: 'Present continuous = am / is / are + -ing: She is studying.',
    35: '“every morning” is a habit → drink. “today” is different → am drinking.',
    36: 'wake is irregular: wake → woke.',
    37: 'leave is irregular: leave → left.',
    38: 'A past question starts with Did + subject + base verb: Did you see…?',
    39: 'After didn’t we use the base verb: didn’t eat (not ate).',
    40: 'take is irregular: take → took.',
    41: 'see is irregular: see → saw. (“seen” needs have / has.)',
    42: 'play → played. go is irregular: go → went.',
    43: 'A past question uses did + base verb: What time did your class start?',
    44: 'After didn’t we use the base verb: didn’t come (not came).',
    45: 'go is irregular: go → went.',
    46: 'Past continuous = was / were + -ing. With I we use was: was having.',
    47: 'We + were + -ing: “While we were eating…” (a longer action in progress).',
    48: 'you → were. Past continuous question: What were you doing?',
    49: 'He → was: was listening.',
    50: 'Students is plural, so were. Negative: weren’t studying.',
    51: '“never late” means he arrives on time all the time → always.',
    52: 'A frequency word goes before the main verb: I usually have lunch.',
    53: 'After am / is / are the frequency word comes after: She is sometimes tired.',
    54: 'always 100% · usually about 80% · sometimes about 50% · rarely about 10%.',
    55: '“I eat at home every day” → I never eat breakfast at college.',
    56: 'We use at with clock times: at 8 o’clock.',
    57: 'We use on with days: on Friday.',
    58: 'We use in with months: in July.',
    59: 'We use in with parts of the day: in the morning.',
    60: 'between = in the middle of two things.',
    61: 'Words ending in -s add -es: class → classes.',
    62: 'Consonant + y → -ies: family → families.',
    63: 'person → people is irregular. (“peoples” is not used here.)',
    64: 'Words ending in -ch add -es: watch → watches.',
    65: 'child → children is irregular.',
    66: 'Khalid’s bag → his bag. We use his (not him / he) before a noun.',
    67: 'Sara and I → our classroom. We use our (not we / us) before a noun.',
    68: 'When there is no noun after it we use mine: It’s mine.',
    69: 'two classes is plural → There are.',
    70: 'milk is uncountable, so: There isn’t any milk.',
    71: 'arrive ↔ leave.',
    72: 'busy ↔ free (not busy).',
    73: 'before ↔ after.',
    74: 'wake up (morning) ↔ go to bed (night).',
    75: 'difficult ↔ easy. (hard means the same as difficult.)',
    76: 'March → April → May. Two months after March is May.',
    77: 'Friday → Saturday → Sunday. Two days before Sunday is Friday.',
    78: 'The order is spring, summer, autumn, winter. Autumn is between summer and winter.',
    79: 'In Riyadh summer is very hot.',
    80: 'September comes just before October.',
    81: 'My parents = they, and last month is past → were.',
    82: 'A past question with be: Were the students…? (students is plural).',
    83: 'The lesson = it → was. Negative: was not.',
    84: 'you → were. I → was.',
    85: 'Negative of were: weren’t. We do not use did with was / were.',
    86: 'Egypt is in Africa. Japan is in Asia. Brazil is in South America.',
    87: 'Brazil → Brazilian.',
    88: 'China → Chinese.',
    89: 'the Philippines → Filipino.',
    90: 'Italy is in Europe. Pakistan and India are in Asia.',
    91: 'eight → eighth (only one t before h).',
    92: 'nine → ninth (we drop the e).',
    93: 'twenty → twentieth (y → -ieth).',
    94: 'Only the last number changes: thirty-second.',
    95: 'twelve → twelfth (ve → -fth).',
    96: 'write → wrote. (“written” is another form that needs have / has.)',
    97: 'teach → taught.',
    98: 'think → thought.',
    99: 'catch → caught.',
    100: 'drive → drove. (“driven” is another form that needs have / has.)',
  },
};

/** Grammar points tracked in "My Progress" (see grammarKeys.ts). Parts with no matching key are not tracked. */
const PART_GRAMMAR: Record<string, Record<number, string>> = {
  set1: { 1: 'adverbs', 3: 'this-that', 4: 'present-simple', 5: 'present-simple', 6: 'present-continuous', 7: 'present-continuous', 8: 'past-simple', 9: 'past-simple', 11: 'frequency', 12: 'prepositions', 13: 'plurals', 17: 'was-were', 20: 'past-simple' },
};
/** Part 14 mixes two points. */
const QUESTION_GRAMMAR: Record<string, Record<number, string>> = {
  set1: { 66: 'possessive-adj', 67: 'possessive-adj', 69: 'there-is', 70: 'there-is' },
};

// Sets 2 and 3 (notes in grammarChallengeNotes.ts). Their parts are the same 20 topics as Set 1, so the same grammar points are tracked.
PART_RULES.set2 = { ...PART_RULES.set1, ...SET2_RULE_CHANGES };
PART_RULES.set3 = { ...PART_RULES.set1, ...SET3_RULE_CHANGES };
QUESTION_NOTES.set2 = SET2_NOTES;
QUESTION_NOTES.set3 = SET3_NOTES;
PART_GRAMMAR.set2 = PART_GRAMMAR.set1;
PART_GRAMMAR.set3 = PART_GRAMMAR.set1;
QUESTION_GRAMMAR.set2 = SET2_QUESTION_GRAMMAR;
QUESTION_GRAMMAR.set3 = SET3_QUESTION_GRAMMAR;

/** The question with its blanks filled in, e.g. “Khalid speaks English very well in class.” (none for questions without a blank). */
export function completedSentence(q: ChallengeQuestion): string | null {
  if (!q.q.includes('___')) return null;
  const answers = q.options[q.answer].split(' ... ');
  let i = 0;
  return q.q.replace(/___/g, () => answers[Math.min(i++, answers.length - 1)]);
}

export function toMcq(set: ChallengeSet, part: ChallengePart, q: ChallengeQuestion): McqItem {
  const done = completedSentence(q);
  const note = QUESTION_NOTES[set.id]?.[q.n] ?? '';
  return {
    q: q.q,
    options: q.options,
    answer: q.answer,
    explain: [done ? `“${done}”` : '', note].filter(Boolean).join(' — '),
    grammar: QUESTION_GRAMMAR[set.id]?.[q.n] ?? PART_GRAMMAR[set.id]?.[part.n],
  };
}
