// The app's first check of a piece of A1 writing, with the A1 writing rubric (writingRubric.ts):
// Content, Organisation and Language, 0–5 each. It explains every mark, points to the exact words
// to fix, and drafts feedback for the student and a comment for the teacher.
// It is a suggestion from simple signals; the teacher always confirms the mark.
import { IATC } from './content';
import { wordCount } from '../lib/text';
import type { Criterion, WritingMarks } from './writingRubric';

export interface WritingTaskInfo { prompt?: string; bullets: string[]; model?: string; frame?: string; title?: string }
export interface WritingIssue { kind: 'grammar' | 'spelling' | 'punctuation'; text: string; why: string; whyAr: string; fix?: string }
export interface WritingAnalysis {
  marks: WritingMarks;
  words: number;
  sentences: number;
  bullets: { text: string; covered: boolean }[];
  linkers: string[];
  issues: WritingIssue[];
  offTopic: boolean;
  relevance: number; // share of the student's content words that belong to the task (0–1)
  timeMismatch: '' | 'past-for-future' | 'present-for-past';
  reasons: Record<Criterion, string[]>;
  tips: { en: string; ar: string }[];
  comment: string;
}

// ------------------------------------------------------------------ words
const STOP = new Set(('a an the and but or so because is am are was were be been being has have had do does did not no yes i me my mine you your yours he him his she her '
  + 'it its we us our they them their this that these those there here what where when who why how which very too also some any many much more most all every '
  + 'each other one two three four five six seven eight nine ten of in on at to from with for by about into near next than then just only can could will would '
  + 'should please thank thanks hello dear write words word talk say tell ask answer give describe person people thing things something place like now today idea ideas detail details more').split(' '));
const stem = (w: string) => {
  let s = w.toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '');
  if (s.length > 4) s = s.replace(/ies$/, 'y').replace(/(ss|sh|ch|x)es$/, '$1').replace(/([^s])s$/, '$1').replace(/ing$/, '').replace(/ed$/, '');
  return s;
};
const contentStems = (t: string) => (t.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem).filter((s) => s.length >= 3);
const same = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

// Words that answer the same bullet point (a student may answer "your job" with "pilot").
const GROUPS: string[][] = [
  ['job', 'work', 'worker', 'engineer', 'pilot', 'teacher', 'doctor', 'nurse', 'police', 'officer', 'student', 'mechanic', 'driver', 'technician', 'businessman', 'manager', 'accountant', 'builder', 'soldier', 'farmer', 'receptionist', 'company', 'office', 'hospital', 'study', 'college'],
  ['family', 'father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'cousin', 'grandfather', 'grandmother', 'son', 'daughter', 'parent', 'wife', 'children'],
  ['home', 'house', 'flat', 'apartment', 'room', 'bedroom', 'kitchen', 'living', 'bathroom', 'garden', 'live'],
  ['food', 'eat', 'kabsa', 'chicken', 'rice', 'bread', 'pizza', 'fish', 'meat', 'breakfast', 'lunch', 'dinner', 'drink', 'juice', 'tea', 'coffee', 'water', 'restaurant', 'delicious', 'date'],
  ['like', 'love', 'favourite', 'enjoy', 'hobby', 'fun'],
  ['weather', 'hot', 'cold', 'sunny', 'rainy', 'windy', 'cool', 'warm', 'rain', 'sun', 'snow', 'cloudy', 'season', 'summer', 'winter', 'spring', 'autumn'],
  ['sport', 'football', 'basketball', 'swimming', 'swim', 'tennis', 'volleyball', 'run', 'play', 'game', 'team', 'match', 'gym'],
  ['city', 'town', 'riyadh', 'jeddah', 'dammam', 'abha', 'taif', 'hail', 'mecca', 'makkah', 'medina', 'qassim', 'buraidah', 'alula', 'country', 'village'],
  ['plan', 'going', 'will', 'next', 'tomorrow', 'future', 'want', 'hope'],
  ['travel', 'trip', 'visit', 'fly', 'drive', 'bus', 'car', 'plane', 'train', 'taxi', 'journey', 'holiday', 'airport', 'ticket'],
  ['friend', 'classmate', 'partner', 'neighbour'],
  ['clothes', 'wear', 'thobe', 'shirt', 'jacket', 'shoe', 'colour', 'white', 'black', 'blue', 'red'],
  ['time', 'morning', 'afternoon', 'evening', 'night', 'clock', 'early', 'late', 'day', 'week', 'weekend'],
  ['phone', 'computer', 'laptop', 'internet', 'message', 'call', 'email', 'online', 'video'],
  ['shop', 'buy', 'market', 'mall', 'price', 'riyal', 'cheap', 'expensive', 'pay', 'cash', 'card', 'cost'],
  ['visit', 'place', 'market', 'park', 'museum', 'mall', 'mosque', 'beach', 'desert', 'tower', 'zoo', 'centre', 'souq', 'palace', 'farm', 'lake', 'mountain'],
  ['activity', 'sport', 'exercise', 'camping', 'camp', 'cycling', 'fishing', 'hiking', 'walk', 'swim', 'gym', 'run', 'game'],
  ['problem', 'matter', 'lost', 'lose', 'broken', 'ill', 'sick', 'late', 'wrong', 'help', 'headache', 'cold', 'forgot'],
];
const groupOf = (s: string) => GROUPS.find((g) => g.some((w) => same(stem(w), s)));
const headGroup = (s: string) => GROUPS.find((g) => g.slice(0, 2).some((w) => stem(w) === s));
/** Broad: every word related to the task (to judge relevance). */
const expand = (stems: string[]) => [...new Set(stems.flatMap((s) => [s, ...(groupOf(s)?.map(stem) ?? [])]))];
const EXAMPLES: Record<string, string[]> = {
  parent: ['father', 'mother', 'dad', 'mum'], colour: ['white', 'black', 'blue', 'red', 'green', 'yellow', 'brown', 'grey', 'orange', 'pink', 'purple', 'gold'],
  drink: ['tea', 'coffee', 'juice', 'water', 'milk', 'cola', 'laban'], dessert: ['cake', 'ice', 'cream', 'kunafa', 'dates', 'chocolate', 'sweet'],
  hobby: ['reading', 'football', 'swimming', 'drawing', 'camping', 'fishing', 'cycling', 'games', 'cooking'], exercise: ['walk', 'run', 'gym', 'football', 'swim', 'cycle'],
  wish: ['hope', 'luck', 'enjoy', 'good', 'great', 'nice', 'safe', 'care', 'wish'], meal: ['breakfast', 'lunch', 'dinner', 'kabsa', 'chicken', 'rice'],
  transport: ['bus', 'car', 'plane', 'train', 'taxi', 'foot', 'metro'], future: ['want', 'going', 'will', 'hope', 'plan', 'become', 'later', 'one day'], age: ['old', 'years'], nationality: ['saudi', 'egyptian', 'indian', 'british', 'american'],
};
/** Narrow: a general word in a point ("job", "family", "sport") accepts its examples. */
const expandHead = (stems: string[]) => [...new Set(stems.flatMap((s) => [s, ...(headGroup(s)?.map(stem) ?? []), ...(Object.entries(EXAMPLES).find(([k]) => same(stem(k), s))?.[1].map(stem) ?? [])]))];

const PLACE_NAME = /\b(in|at|from|near|to)\s+(the\s+)?[A-Z][a-z]+/;
const PLACE_WORD = /\b(riyadh|jeddah|dammam|abha|taif|hail|mecca|makkah|medina|qassim|alula|saudi arabia|home|college|iatc|beach|park|pool|sports centre|mall|desert|mosque|market|restaurant|caf[eé]|museum)\b/i;
const PLACE = { test: (t: string) => PLACE_NAME.test(t) || PLACE_WORD.test(t) };
const TIMEW = /\b(\d{1,2}(:\d\d)?\s*(am|pm|o'clock)?|o'clock|half past|morning|afternoon|evening|night|every|always|usually|sometimes|on (sun|mon|tues|wednes|thurs|fri|satur)days?|in (january|february|march|april|may|june|july|august|september|october|november|december|summer|winter|spring|autumn)|today|tomorrow|yesterday|weekend|week|january|february|march|april|may|june|july|august|september|october|november|december|(19|20)\d\d|first|second|third|\d+(st|nd|rd|th)|ago|last)\b/i;
const NUMBERW = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|many|a lot)\b/i;
const PEOPLE = /\b(father|mother|brother|sister|friend|uncle|aunt|cousin|family|teacher|classmate|wife|son|mr|he|she|they)\b/i;

const pointWords = (bullet: string) => contentStems(bullet.replace(/\b[A-Z][a-z]+\b/g, (w, i: number) => (i === 0 ? w : ''))); // not the person the task names ("ask Toni …")

function bulletCovered(bullet: string, text: string, stems: string[], others: string[] = []): boolean {
  const b = bullet.toLowerCase();
  // judge a point by what makes it different from the other points ("your FATHER's job", "your job in the FUTURE")
  const own = pointWords(bullet);
  const shared = new Set(others.flatMap(pointWords));
  const distinctive = own.filter((w) => !shared.has(w));
  const keys = expandHead(distinctive.length ? distinctive : own);
  // "ask …" points need a question
  if (/^\s*ask\b/.test(b) && !/\?/.test(text)) return false;
  if (/^\s*ask\b/.test(b) && /(\?|\blet's\b|\blet us\b)/i.test(text)) {
    const sents = text.split(/(?<=[.!?])\s+/);
    const questions = sents.flatMap((x, i) => (x.includes('?') || /\blet'?s\b/i.test(x) ? [sents[i - 1] ?? '', x] : [])).join(' ');
    const qStems = contentStems(questions);
    if (keys.length === 0 || keys.some((k) => qStems.some((s) => same(s, k))) || /\b(how much|what time|where|when)\b/i.test(questions) && /\b(price|cost|time|where|when)\b/i.test(b)) return true;
  }
  if (/^\s*ask\b/.test(b)) return false;
  // phrases quoted in the point: 'Excuse me', "Did you …?"
  for (const q of bullet.match(/['‘“"]([^'’”"]+)['’”"]/g) ?? []) {
    const phrase = q.slice(1, -1).replace(/…|\.\.\./g, '').replace(/[?!.]/g, '').trim().toLowerCase();
    if (phrase && text.toLowerCase().includes(phrase)) return true;
  }
  // grammar words the point asks for
  for (const [w, re] of [['can', /\bcan\b/i], ['going to', /\bgoing to\b/i], ['did you', /\bdid you\b/i], ['was', /\b(was|were)\b/i], ['did', /\b(did|didn't)\b/i], ['will', /\b(will|'ll)\b/i], ["I'd like", /\b(i'd like|i would like)\b/i], ['would you like', /\bwould you like\b/i], ['present continuous', /\b(am|is|are)\s+\w+ing\b/i]] as [string, RegExp][]) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(b) && re.test(text)) return true;
  }
  if (keys.some((k) => stems.some((s) => same(s, k)))) return true;
  // question words in the bullet: look for the kind of answer
  if (/\bwhere\b/.test(b) && PLACE.test(text)) return true;
  if (/\b(when|what time|time|days?)\b/.test(b) && TIMEW.test(text)) return true;
  if (/\b(how old|age)\b/.test(b) && /\b(\d+|[a-z]+teen|twenty[- a-z]*)\s+years?\b|\byears old\b/i.test(text)) return true;
  if (/\b(how many|number)\b/.test(b) && NUMBERW.test(text)) return true;
  if (/\bwhy\b/.test(b) && /\b(because|so|as)\b/i.test(text)) return true;
  if (/\bwho\b/.test(b) && PEOPLE.test(text)) return true;
  if (/\bhow (you |they |he )?(go|travel|get)\b/.test(b) && /\b(by (car|bus|plane|train|taxi|bike)|on foot|walk|drive|fly)\b/i.test(text)) return true;
  if (keys.length === 0) return wordCount(text) >= 8;
  return false;
}

// ------------------------------------------------------------------ linking
const LINKERS = ['and', 'but', 'so', 'because', 'then', 'also', 'or', 'too', 'after', 'before', 'when', 'first', 'next', 'finally'];
const COHESIVE = /\b(it|he|she|they|there|this|that|these|his|her|their|him|them)\b/gi;
const SEQUENCE = /\b(then|first|next|after that|finally|in the morning|in the evening|at night|at the weekend|every day|sometimes|at the moment|right now|on (sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?|in (january|february|march|april|may|june|july|august|september|october|november|december|summer|winter|spring|autumn))\b/i;

// ------------------------------------------------------------------ language
const VERB = /\b(am|is|are|was|were|isn't|aren't|wasn't|weren't|have|has|had|do|does|did|don't|doesn't|didn't|can|can't|will|won't|i'm|you're|he's|she's|it's|they're|we're|there's|let's|(like|live|work|go|study|want|play|get|eat|watch|speak|come|visit|need|love|enjoy|help|read|write|drive|walk|take|make|see|know|understand|call|buy|pay|keep|start|finish|open|close|sit|stand|listen|look|say|ask|answer|think|travel|swim|cook|drink|sleep|wear|try|meet|give|put|use|turn|stay|wash|clean|leave|arrive|fly|fix|repair|ride|run|wake|carry|spell|teach|learn|shop|cycle|camp|hope|plan|send|show|bring|win|lose|feel|change|move)(s|es|ed|d|ing)?|went|saw|ate|drank|met|left|woke|won|made|took|bought|came|got|flew|wrote|read|sat|spoke|swam|ran|gave|told|found|thought|lost|felt|heard|knew|said|paid|sent|wore|became|began|brought|built|caught|chose|drove|fell|forgot|grew|kept|meant|rode|rang|sang|slept|sold|spent|stood|taught|understood|happened|tried|stayed|studied)\b/i;

interface Rule { re: RegExp; why: string; whyAr: string; fix?: (m: string) => string }
const BASE = 'go|like|live|work|have|play|want|study|watch|eat|get|need|speak|drink|read|come|visit|love|make|take|drive|teach|help|know|wear|cook|sleep|wake|walk|use';
const RULES: Rule[] = [
  { re: /\b(because|maybe|and|but|so)\s+is\b/gi, why: 'Every sentence needs a subject: “because it is …”', whyAr: 'كل جملة تحتاج فاعلاً: because it is', fix: (m) => m.replace(/\s+is$/i, ' it is') },
  { re: /\bare you (like|agree|want|have|go|live|work|play|need|know)\b/gi, why: 'Questions with a verb use do: “Do you like …?”', whyAr: 'السؤال مع فعل يبدأ بـ Do: Do you like', fix: (m) => m.replace(/^are you/i, 'Do you') },
  { re: /\b(i|you|we|they|he|she)\s+(?!(?:am|is|are|was|were|will|can|'m|'re|thing|morning|evening|king|bring|sing)\b)[a-z]+ing\b/gi, why: 'Use am / is / are before -ing: “I am going”', whyAr: 'استخدم am / is / are قبل الفعل المنتهي بـ ing', fix: (m) => m.replace(/^(\w+)\s+/i, (_, p: string) => `${p} ${/^i$/i.test(p) ? 'am' : /^(he|she)$/i.test(p) ? 'is' : 'are'} `) },
  { re: /\bgo(es)? to (swimming|shopping|fishing|camping|running|cycling|walking)\b/gi, why: 'Say “go swimming”, not “go to swimming”', whyAr: 'نقول go swimming بدون to', fix: (m) => m.replace(/ to /i, ' ') },
  { re: new RegExp(`\\b(he|she|it|my (father|mother|brother|sister|friend|uncle|teacher))\\s+(${BASE})\\b`, 'gi'), why: 'he / she + verb-s: “he goes”, “she likes”', whyAr: 'مع he / she نضيف s للفعل: he goes', fix: (m) => m.replace(/(\w+)$/, (v) => (v === 'have' ? 'has' : /(o|ch|sh|s|x)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`)) },
  { re: /\b(i|you|we|they)\s+(has|goes|likes|lives|works|wants|plays|studies|watches)\b/gi, why: 'No -s after I / you / we / they: “I like”', whyAr: 'لا نضيف s بعد I / you / we / they', fix: (m) => m.replace(/has$/i, 'have').replace(/(ch|sh|o)es$/i, '$1').replace(/ies$/i, 'y').replace(/s$/i, '') },
  { re: /\b(he|she|it)\s+(are|am)\b|\b(i)\s+(is|are)\b|\b(we|they|you)\s+(is|am)\b/gi, why: 'I am • he / she / it is • we / you / they are', whyAr: 'I am و he / she / it is و we / you / they are', fix: (m) => m.replace(/^(\w+)\s+\w+$/i, (_, p: string) => `${p} ${/^i$/i.test(p) ? 'am' : /^(he|she|it)$/i.test(p) ? 'is' : 'are'}`) },
  { re: new RegExp(`\\b(i am|i'm|he is|she is|we are|they are|you are)\\s+(${BASE})\\b`, 'gi'), why: 'Do not use am / is / are with another verb: “I go”, not “I am go”', whyAr: 'لا نستخدم am / is / are مع فعل آخر: I go', fix: (m) => m.replace(/\s+(am|is|are)\b|'m/i, '') },
  { re: /\b(he|she|it)\s+don't\b/gi, why: 'he / she / it doesn’t', whyAr: 'مع he / she / it نستخدم doesn’t', fix: (m) => m.replace(/don't/i, "doesn't") },
  { re: /\b(i|you|we|they)\s+doesn't\b/gi, why: 'I / you / we / they don’t', whyAr: 'مع I / you / we / they نستخدم don’t', fix: (m) => m.replace(/doesn't/i, "don't") },
  { re: /\ba\s+(?!uni|use|usu|eu|one|once|u\b)[aeiou][a-z]+/gi, why: 'Use an before a vowel sound: “an apple”, “an engineer”', whyAr: 'نستخدم an قبل الصوت المتحرك: an engineer', fix: (m) => m.replace(/^a\b/i, 'an') },
  { re: /\ban\s+(?!hour|honest|heir|[aeiou])[bcdfgjklmnpqrstvwxyz][a-z]+/gi, why: 'Use a before a consonant sound: “a book”', whyAr: 'نستخدم a قبل الحرف الساكن: a book', fix: (m) => m.replace(/^an\b/i, 'a') },
  { re: /\b(two|three|four|five|six|seven|eight|nine|ten|many|\d+)\s+(book|brother|sister|room|car|friend|student|day|hour|bedroom|bathroom|chair|table|riyal|minute|cousin|son|daughter|teacher|class)\b(?!s)/gi, why: 'Plural after a number: “two brothers”', whyAr: 'الاسم بعد العدد يكون جمعاً: two brothers', fix: (m) => `${m}s` },
  { re: /\bhave\s+(\d+|[a-z]+teen|twenty[- a-z]*)\s+years\b/gi, why: 'Age: “I am 19 years old”, not “I have 19 years”', whyAr: 'العمر: I am 19 years old', fix: (m) => m.replace(/^have/i, 'am') + ' old' },
  { re: /\bgo(es)? the (bus|car|train|plane|taxi|metro)\b/gi, why: 'Transport: “go by bus”', whyAr: 'وسائل النقل: go by bus', fix: (m) => m.replace(/ the /i, ' by ') },
  { re: /\blike to the (beach|park|desert|mall|sea|cinema|zoo)\b/gi, why: '“I like the beach” or “I like going to the beach”', whyAr: 'نقول I like the beach', fix: (m) => m.replace(/like to the/i, 'like the') },
  { re: /\b(my|his|her|our|their|the)\s+(name|father|mother|brother|sister|friend|house|home|city|teacher|phone|room|family|job|car|school|college|class)\s+are\b/gi, why: 'One person or thing: “my name is”', whyAr: 'للمفرد نستخدم is: my name is', fix: (m) => m.replace(/are$/i, 'is') },
  // one person or thing as the subject + are: "My first name are", "My brother Saleh are", "The weather are"
  { re: /(?<=(?:^|[.!?]\s+|\b(?:and|but|because|so)\s+))(the|this|that|my|his|her|our|their)(\s+[A-Za-z]+){0,2}?\s+(?!people\b|children\b|men\b|women\b|police\b|staff\b|family\b|team\b|parents\b)[A-Za-z]*[^sS\W]\s+are\b/gi, why: 'One person or thing: “my name is”, “the weather is”', whyAr: 'للمفرد نستخدم is', fix: (m) => m.replace(/are$/i, 'is') },
  // a name or a subject at the start of a sentence: "Jeddah are", "English are"
  { re: /(?<=(?:^|[.!?]\s+))(?!(?:We|They|You|These|Those|People|Children|Students|Men|Women|My|His|Her|Our|Their|The|This|That|There|Here|What|Where|When|How|Who|Why|Are|Is|Both|All|Some|Many)\b)[A-Z][a-z]+[^s\W]\s+are\b/g, why: 'One person or thing: “Jeddah is”', whyAr: 'للمفرد نستخدم is', fix: (m) => m.replace(/are$/, 'is') },
  { re: /\bthere are (a|an|one)\b/gi, why: 'One thing: “there is a …”', whyAr: 'للمفرد نقول there is a', fix: (m) => m.replace(/are/i, 'is') },
  { re: /\bare (it|he|she)\b/gi, why: '“is it”, “is he”', whyAr: 'نقول is it و is he', fix: (m) => m.replace(/are/i, 'is') },
  // question about one thing: "Where are the bus station?"
  { re: /\b(where|what|how much|how old) are (the|my|your|his|her|this|that)\s+([a-z]+\s+)?[a-z]*[^s\W](?=[\s,?.!]|$)/gi, why: 'One thing: “Where is the station?”', whyAr: 'للمفرد نستخدم is', fix: (m) => m.replace(/\bare\b/i, 'is') },
  { re: /\b(it|this|that)\s+are\b/gi, why: '“it is”, “this is”', whyAr: 'نقول it is و this is', fix: (m) => m.replace(/are$/i, 'is') },
  { re: /\bwe are (very )?(funny|bored|boring) day\b|\b(it|this) (is|was) (very )?fun day\b/gi, why: '“It was a fun day”', whyAr: 'نقول It was a fun day', fix: () => 'it was a fun day' },
  { re: /\b(i|we|he|she|they)\s+(go|play|eat|have|is|are|visit|see|watch)\b[^.!?]*\b(yesterday|last (week|year|month|night|weekend|friday|saturday))\b/gi, why: 'Past time needs the past: “I went”, “I played”', whyAr: 'مع الماضي نستخدم صيغة الماضي: I went', fix: undefined },
];

// Spelling: words that are not in the app's word lists (A1 words + Oxford A1), ignoring names and numbers.
const IRREGULAR_PAST = 'went saw ate drank met left woke won made took bought came got flew wrote sat spoke swam ran gave told found thought lost felt heard knew said paid sent wore became began brought built caught chose drove fell forgot grew kept meant rode rang sang slept sold spent stood taught understood threw hurt held cost put read let shut hit cut set happened';
const FUNCTION_WORDS = ("a an the and but or so because is am are was were be been has have had does do did isn't aren't don't doesn't didn't can can't will would "
  + 'i me my mine you your he him his she her it its we us our they them their this that these those there here what where when who why how which '
  + 'very too also not no yes some any many much more most all every each other another one two three four five six seven eight nine ten '
  + 'of in on at to from with for by about into near next opposite between behind under over up down out off please thank thanks hello hi dear ok okay ' + IRREGULAR_PAST).split(' ');
let DICT: Set<string> | null = null;
const dict = () => (DICT ??= new Set(
  [...IATC.vocab.flatMap((v) => v.word.split(/[\s/]+/)), ...IATC.vocab.flatMap((v) => v.example.split(/[\s/]+/)), ...IATC.oxfordA1.flatMap((h) => h.split(/[,\s]+/)), ...FUNCTION_WORDS]
    .map((w) => w.replace(/[^a-zA-Z']/g, '').toLowerCase()).filter(Boolean),
));
const FORMS = (w: string) => [
  w, w.replace(/'s$/, ''), w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ed$/, ''), w.replace(/d$/, ''),
  w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/([a-z])\1ing$/, '$1'), w.replace(/([a-z])\1ed$/, '$1'), w.replace(/ied$/, 'y'),
  w.replace(/er$/, ''), w.replace(/est$/, ''), w.replace(/ier$/, 'y'), w.replace(/n't$/, ''), w.replace(/'(m|re|ve|ll|d)$/, ''), w.replace(/ly$/, ''),
];
export function unknownWords(t: string): string[] {
  const d = dict();
  const out: string[] = [];
  for (const sentence of t.split(/[.!?\n]+/)) {
    (sentence.match(/[A-Za-z][A-Za-z']*/g) ?? []).forEach((w, i) => {
      if (i > 0 && /^[A-Z]/.test(w)) return; // names and places
      const lw = w.toLowerCase();
      if (lw.length > 2 && !FORMS(lw).some((f) => d.has(f)) && !out.includes(lw)) out.push(lw);
    });
  }
  return out;
}

export function grammarIssues(t: string): WritingIssue[] {
  const out: WritingIssue[] = [];
  for (const r of RULES) {
    for (const m of t.matchAll(r.re)) {
      if (out.some((o) => o.text.toLowerCase() === m[0].toLowerCase())) continue;
      out.push({ kind: 'grammar', text: m[0], why: r.why, whyAr: r.whyAr, fix: r.fix?.(m[0]) });
      if (out.length >= 8) return out;
    }
  }
  return out;
}
/** The rule names found (kept for older callers and tests). */
export const a1Errors = (t: string) => [...new Set(grammarIssues(t).map((i) => i.why))];

// ------------------------------------------------------------------ the task's model answer
let TASKS: Map<string, WritingTaskInfo> | null = null;
const taskKey = (prompt = '', bullets: string[] = []) => `${prompt}|${bullets.join('|')}`.toLowerCase().replace(/\s+/g, ' ').trim();
/** Find the model answer and frame for a task (units and mock exams), so relevance can be judged. */
export function lookupTask(prompt = '', bullets: string[] = []): WritingTaskInfo {
  if (!TASKS) {
    TASKS = new Map();
    for (const u of IATC.units) for (const d of u.days) if (d.writing?.prompt) TASKS.set(taskKey(d.writing.prompt, d.writing.bullets), { ...d.writing, bullets: d.writing.bullets ?? [] });
    for (const m of IATC.mocks) if (m.writing?.prompt) TASKS.set(taskKey(m.writing.prompt, m.writing.bullets), { ...m.writing });
  }
  return TASKS.get(taskKey(prompt, bullets)) ?? { prompt, bullets };
}

// ------------------------------------------------------------------ analysis
const FUTURE_TASK = /\b(going to|will|plan|plans|next|tomorrow|future|want to|holiday plans|this weekend)\b/i;
const PAST_TASK = /\b(yesterday|last|ago|was|were|did|went|visited|a trip|a day out|weekend trip|when you were)\b/i;
const PAST_TEXT = /\b(yesterday|last|ago|was|were|did|went|had|saw|visited|played|watched|ate|met|bought|took|came|stayed|enjoyed)\b/i;
const FUTURE_TEXT = /\b(going to|will|tomorrow|next|plan|want to|hope to|'ll)\b/i;
const MESSAGE_TASK = /\b(note|email|e-mail|message|postcard|letter|write to)\b/i;

export function analyseWriting(text: string, task: WritingTaskInfo): WritingAnalysis {
  const t = text.trim();
  const n = wordCount(t);
  const reasons: Record<Criterion, string[]> = { content: [], organisation: [], language: [] };
  const empty: WritingAnalysis = {
    marks: { content: 0, organisation: 0, language: 0 }, words: n, sentences: 0, bullets: task.bullets.map((b) => ({ text: b, covered: false })),
    linkers: [], issues: [], offTopic: false, relevance: 0, timeMismatch: '', reasons, tips: [{ en: 'Write about 25 words about the topic.', ar: 'اكتب حوالي ٢٥ كلمة عن الموضوع.' }], comment: '',
  };
  if (n < 3) { reasons.content.push('Almost nothing written.'); return empty; }

  const full = { ...lookupTask(task.prompt, task.bullets), ...Object.fromEntries(Object.entries(task).filter(([, v]) => v)) } as WritingTaskInfo;
  const stems = contentStems(t);
  const unique = [...new Set(stems)];

  // ---------------- Content
  const bullets = full.bullets.map((b, i) => ({ text: b, covered: bulletCovered(b, t, stems, full.bullets.filter((_, j) => j !== i)) }));
  const covered = bullets.filter((b) => b.covered).length;
  const need = Math.max(1, bullets.length);
  const taskWords = expand(contentStems([full.title, full.prompt, ...full.bullets, full.model, full.frame].filter(Boolean).join(' ')));
  const onTask = unique.filter((s) => taskWords.some((k) => same(s, k))).length;
  const rel = unique.length ? onTask / unique.length : 0;
  const offTopic = unique.length >= 4 && (rel < 0.2 || (rel < 0.35 && covered <= 1));
  let content = covered >= need ? 5 : covered === need - 1 ? 3 : covered >= 1 ? (n >= 15 ? 2 : 1) : n >= 10 ? 1 : 0;
  if (covered >= need) reasons.content.push(`Answers all ${need} points.`);
  else reasons.content.push(`Answers ${covered} of ${need} points. Missing: ${bullets.filter((b) => !b.covered).map((b) => `“${b.text}”`).join(', ')}.`);
  const cap = n < 10 ? 2 : n < 15 ? 3 : n < 20 ? 4 : 5;
  if (content > cap) { content = cap; reasons.content.push(`Short (${n} words; about 25 needed).`); }
  if (offTopic) {
    content = Math.min(content, covered >= 2 ? 1 : 0);
    reasons.content.length = 0;
    reasons.content.push(`Mostly not about the task (“${full.title || full.prompt}”).`);
    bullets.forEach((x) => { x.covered = false; });
  }
  const taskText = [full.prompt, ...full.bullets].join(' ');
  let timeMismatch: WritingAnalysis['timeMismatch'] = '';
  if (FUTURE_TASK.test(taskText) && !PAST_TASK.test(taskText) && PAST_TEXT.test(t) && !FUTURE_TEXT.test(t)) {
    timeMismatch = 'past-for-future'; content = Math.max(0, content - 2); reasons.content.push('The task is about the future, but the text is about the past.');
  } else if (PAST_TASK.test(taskText) && !FUTURE_TASK.test(taskText) && !PAST_TEXT.test(t)) {
    timeMismatch = 'present-for-past'; content = Math.max(0, content - 1); reasons.content.push('The task is about the past, but the text has no past verbs.');
  }

  // ---------------- Organisation
  const sentenceParts = t.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
  const sentences = (t.match(/[.!?](\s|$)/g) ?? []).length;
  const linkers = LINKERS.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(t));
  const linkSet = new Set(linkers);
  if (SEQUENCE.test(t)) linkSet.add('sequence');
  let cohesive = new Set((t.match(COHESIVE) ?? []).map((x) => x.toLowerCase())).size;
  // lexical links: the next sentence picks up a word from the one before
  const sStems = sentenceParts.map((x) => new Set(contentStems(x)));
  const pairs = sStems.slice(1).filter((cur, k) => [...cur].some((w) => sStems[k].has(w))).length;
  if (pairs >= 2) cohesive += 1;
  if (MESSAGE_TASK.test(taskText) && /^(hi|hello|dear)\b/i.test(t) && /\b(bye|see you|love|best wishes|thanks|your friend)\b|\n\s*[A-Z][a-z]+\s*$/i.test(t)) cohesive += 1;
  const beyondAnd = [...linkSet].some((l) => l !== 'and');
  let organisation: number;
  if (linkSet.size >= 2 && beyondAnd && cohesive >= 2 && sentences >= 3) organisation = 5;
  else if ((linkSet.size >= 2 && cohesive >= 1) || (beyondAnd && cohesive >= 2)) organisation = 4;
  else if ((linkSet.has('and') && cohesive >= 1) || beyondAnd) organisation = 3;
  else if (linkSet.size >= 1 || cohesive >= 1) organisation = 2;
  else organisation = sentences === 0 && n < 8 ? 0 : 1;
  if (sentences >= 3 && cohesive >= 2) organisation = Math.max(organisation, 3);
  else if (sentences >= 3 && cohesive >= 1) organisation = Math.max(organisation, 2);
  reasons.organisation.push(linkers.length ? `Linking words: ${linkers.join(', ')}.` : 'No linking words (and, but, because, so).');
  if (cohesive) reasons.organisation.push('Uses words like it / he / they / there to connect sentences.');
  const longest = Math.max(0, ...sentenceParts.map((x) => wordCount(x)));
  if (longest > 30) { organisation = Math.max(1, organisation - 1); reasons.organisation.push(`One very long sentence (${longest} words): use full stops.`); }
  if (sentences === 0 && n >= 8) { organisation = Math.min(organisation, 2); reasons.organisation.push('No full stops: the sentences are not separated.'); }

  // ---------------- Language
  const issues: WritingIssue[] = grammarIssues(t);
  const parts = sentenceParts.map((x) => x.replace(/^(hi|hello|dear)\b[^,\n]*[,\n]\s*/i, '')).filter((x) => wordCount(x) >= 3);
  const long = parts.filter((x) => wordCount(x) >= 4);
  const withVerb = long.filter((x) => VERB.test(x)).length / Math.max(1, long.length);
  const lowerStarts = t.split(/(?<=[.!?])\s+/).filter((x) => /^[a-z]/.test(x.trim())).length;
  const ends = /[.!?]["”']?(\s+[A-Za-z,']+){0,3}\s*$/.test(t) && /[.!?]/.test(t);
  if (/\bi\b/.test(t)) issues.push({ kind: 'punctuation', text: 'i', why: 'Write “I” as a capital letter.', whyAr: 'اكتب I بحرف كبير دائماً.', fix: 'I' });
  if (lowerStarts) issues.push({ kind: 'punctuation', text: '', why: 'Start every sentence with a capital letter.', whyAr: 'ابدأ كل جملة بحرف كبير.' });
  if (!ends) issues.push({ kind: 'punctuation', text: '', why: 'End with a full stop.', whyAr: 'أنهِ الجملة بنقطة.' });
  const known = new Set((`${full.prompt ?? ''} ${full.bullets.join(' ')} ${full.title ?? ''}`.match(/[A-Za-z']+/g) ?? []).map((w) => w.toLowerCase()));
  const lastWord = (t.match(/([A-Z][a-z]+)\s*$/) ?? [])[1]?.toLowerCase(); // sign-off name
  const spelling = unknownWords(t).filter((w) => !known.has(w) && w !== lastWord);
  spelling.slice(0, 6).forEach((w) => issues.push({ kind: 'spelling', text: w, why: 'Check the spelling.', whyAr: 'راجع الإملاء.' }));

  let language = 2 + (withVerb >= 0.99 ? 2 : withVerb >= 0.6 ? 1 : 0) + (lowerStarts === 0 && ends ? 1 : 0);
  if (withVerb < 0.99) reasons.language.push('Some sentences have no verb (am / is / have / like …).');
  if (/\bi\b/.test(t)) reasons.language.push('“i” instead of “I”.');
  if (lowerStarts) reasons.language.push(`${lowerStarts} ${lowerStarts === 1 ? 'sentence starts' : 'sentences start'} without a capital letter.`);
  if (!ends) reasons.language.push('No full stop at the end.');
  if (/\bi\b/.test(t)) language -= 1;
  const g = issues.filter((i) => i.kind === 'grammar').length;
  const density = g / Math.max(1, n / 10); // mistakes per 10 words
  if (g) { language -= density >= 1.5 ? 3 : density >= 0.8 ? 2 : 1; reasons.language.push(`${g} grammar ${g === 1 ? 'mistake' : 'mistakes'}: ${issues.filter((i) => i.kind === 'grammar').slice(0, 3).map((i) => `“${i.text}”`).join(', ')}.`); }
  const spellShare = spelling.length / Math.max(1, n);
  if (spelling.length >= 6 || spellShare >= 0.12) language -= 2; else if (spellShare >= 0.05) language -= 1;
  if (spelling.length) reasons.language.push(`Spelling to check: ${spelling.slice(0, 5).join(', ')}.`);
  if (unique.length < 5 && n >= 10) { language -= 1; reasons.language.push('Very few different words.'); }
  if (timeMismatch === 'present-for-past') language -= 1;
  language = Math.max(1, Math.min(5, language));
  if (language >= 5) reasons.language.push('Simple sentences with good control.');

  const marks = { content, organisation, language };
  const a: WritingAnalysis = { marks, words: n, sentences, bullets, linkers, issues, offTopic, relevance: rel, timeMismatch, reasons, tips: [], comment: '' };
  a.tips = tipsFor(a, full);
  a.comment = commentFor(a);
  return a;
}

/** Backwards-compatible: just the three marks. */
export const estimateWriting = (text: string, bullets: string[], prompt = '', model?: string) => analyseWriting(text, { bullets, prompt, model }).marks;

// ------------------------------------------------------------------ feedback
function tipsFor(a: WritingAnalysis, task: WritingTaskInfo): { en: string; ar: string }[] {
  const tips: { en: string; ar: string }[] = [];
  if (a.offTopic) tips.push({ en: `Read the task again and write about: ${task.title || task.prompt}`, ar: 'اقرأ السؤال مرة أخرى واكتب عن الموضوع المطلوب.' });
  for (const b of a.bullets.filter((x) => !x.covered).slice(0, 2)) tips.push({ en: `Also write about: ${b.text}.`, ar: `اكتب أيضاً عن: ${b.text}` });
  if (a.timeMismatch === 'past-for-future') tips.push({ en: 'This task is about the future: use going to / will.', ar: 'هذا السؤال عن المستقبل: استخدم going to أو will.' });
  if (a.timeMismatch === 'present-for-past') tips.push({ en: 'This task is about the past: use was / were and past verbs (went, played).', ar: 'هذا السؤال عن الماضي: استخدم was / were والأفعال الماضية.' });
  if (a.words < 20) tips.push({ en: `Write more: about 25 words (you wrote ${a.words}).`, ar: `اكتب أكثر: حوالي ٢٥ كلمة (كتبت ${a.words}).` });
  for (const i of a.issues.filter((x) => x.kind === 'grammar').slice(0, 2)) tips.push({ en: `“${i.text}”${i.fix ? ` → “${i.fix}”` : ''}: ${i.why}`, ar: i.whyAr });
  if (a.marks.organisation <= 2) tips.push({ en: 'Join your ideas with and, but, because or so.', ar: 'اربط أفكارك بـ and و but و because و so.' });
  const p = a.issues.find((x) => x.kind === 'punctuation');
  if (p) tips.push({ en: p.why, ar: p.whyAr });
  const sp = a.issues.filter((x) => x.kind === 'spelling').map((x) => x.text);
  if (sp.length) tips.push({ en: `Check these words (spelling): ${sp.slice(0, 4).join(', ')}.`, ar: 'راجع كتابة هذه الكلمات.' });
  if (!tips.length) tips.push({ en: 'Excellent! All three points, clear and connected. Keep writing like this.', ar: 'ممتاز! كتبت عن النقاط الثلاث بوضوح وترابط. استمر.' });
  return tips.slice(0, 4);
}

/** A short, kind comment for the teacher to edit: one strength, one next step. */
function commentFor(a: WritingAnalysis): string {
  const good: string[] = [];
  if (a.bullets.length && a.bullets.every((b) => b.covered)) good.push('you answered all three points');
  if (a.marks.organisation >= 4) good.push('your ideas are well connected');
  if (a.marks.language >= 4) good.push('your sentences are clear');
  const praise = good.length ? `Well done: ${good.join(' and ')}.` : 'Good try. Thank you for your writing.';
  const missing = a.bullets.find((b) => !b.covered);
  const g = a.issues.find((i) => i.kind === 'grammar');
  let next = '';
  if (a.offTopic) next = 'Next time, read the task again and write about the topic.';
  else if (missing) next = `Next time, also write about “${missing.text}”.`;
  else if (a.timeMismatch === 'past-for-future') next = 'Next time, use going to / will for plans.';
  else if (g) next = `Next time, check “${g.text}”${g.fix ? ` (→ “${g.fix}”)` : ''}.`;
  else if (a.words < 20) next = 'Next time, write a little more (about 25 words).';
  else if (a.marks.organisation <= 3) next = 'Next time, join your ideas with because or so.';
  return next ? `${praise} ${next}` : `${praise} Keep it up!`;
}
