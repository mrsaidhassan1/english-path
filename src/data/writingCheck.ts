// The app's first check of a piece of A1 writing, with the A1 writing rubric (writingRubric.ts):
// Content, Organisation and Language, 0–5 each. It explains every mark, points to the exact words
// to fix, and drafts feedback for the student and a comment for the teacher.
// A weekly task is judged against its own Headway unit (headwayWriting.ts): the linking words and
// language met so far, and the kind of writing (postcard, place, person, routine …). A task that
// cannot be matched to a unit gets general A1 feedback. It is a suggestion from simple signals;
// the teacher always confirms the mark.
import { IATC } from './content';
import { headwayWritingGuide, unitErrorRules, type HeadwayWritingGuide } from './headwayWriting';
import { wordCount } from '../lib/text';
import type { Criterion, WritingMarks } from './writingRubric';

export interface WritingTaskInfo { prompt?: string; bullets: string[]; model?: string; frame?: string; title?: string; unitFocus?: string; headwayUnit?: number; taughtLinkers?: string[] }
export interface WritingIssue { kind: 'grammar' | 'spelling' | 'punctuation'; text: string; why: string; whyAr: string; fix?: string; unit?: number }
export type WritingGenre = 'message' | 'conversation' | 'directions' | 'place' | 'person' | 'routine' | 'past' | 'plans' | 'general';
export const GENRE_LABEL: Record<WritingGenre, string> = {
  message: 'message / postcard', conversation: 'conversation', directions: 'directions', place: 'description of a place',
  person: 'description of a person', routine: 'daily routine', past: 'past events', plans: 'plans', general: 'general',
};
export interface WritingReference { word: string; sentence: number; to?: string; why?: string; whyAr?: string }
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
  /** The Headway unit the task belongs to (undefined = no reliable match: general feedback). */
  unit?: number;
  genre: WritingGenre;
  /** he / she / it / they …: what each one refers to, or why it is unclear. */
  references: { clear: WritingReference[]; unclear: WritingReference[] };
  /** The unit's target language found in the text. */
  targetUsed: string[];
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
    const sents = text.split(/(?<=[.!?]['’"”]?)\s+/);
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
const TRACKED_LINKERS = ['and', 'but', 'also', 'then', 'because', 'so']; // the ones dated in the book (headwayWriting.ts)
const LINKERS = ['and','but', 'so', 'because', 'then', 'also', 'or', 'too', 'after', 'before', 'when', 'first', 'next', 'finally'];
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

/**
 * Grammar mistakes: the general A1 rules, plus the mistakes with each Headway unit's language
 * (from the book's "Check it" exercises) up to the task's unit. Without a unit, all of them (general A1).
 */
export function grammarIssues(t: string, unit?: number): WritingIssue[] {
  const out: WritingIssue[] = [];
  const spans: [number, number][] = [];
  const rules: { rule: Rule; unit?: number }[] = [...RULES.map((rule) => ({ rule })), ...unitErrorRules(unit ?? 14).map((x) => ({ rule: x.rule, unit: unit === undefined ? undefined : x.unit }))];
  for (const { rule: r, unit: u } of rules) {
    for (const m of t.matchAll(r.re)) {
      const a = m.index ?? 0;
      const b = a + m[0].length;
      // one mistake, one report: skip a match that overlaps one already found
      if (spans.some(([x, y]) => a < y && b > x) || out.some((o) => o.text.toLowerCase() === m[0].toLowerCase())) continue;
      spans.push([a, b]);
      out.push({ kind: 'grammar', text: m[0], why: r.why, whyAr: r.whyAr, fix: r.fix?.(m[0]), unit: u });
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
    for (const u of IATC.units) for (const d of u.days) if (d.writing?.prompt) {
      // Only explicit instruction is evidence that a linker was taught; model answers alone are not.
      const instruction = [u.focus, d.grammarTitle, ...(d.grammar?.rules ?? [])];
      const linkerInstruction = instruction.filter((line) => /\b(link(?:ing|ers?)?|connect(?:ing|ors?)?|conjunctions?)\b/i.test(line));
      const taughtLinkers = ['and', 'but', 'because', 'so'].filter(
        (word) => linkerInstruction.some((line) => new RegExp(`\\b${word}\\b`, 'i').test(line))
          || (word === 'because' && instruction.some((line) => /answer:\s*because\b/i.test(line))),
      );
      TASKS.set(taskKey(d.writing.prompt, d.writing.bullets), { ...d.writing, bullets: d.writing.bullets ?? [], unitFocus: `${u.focus} · ${d.grammarTitle}`, headwayUnit: u.headwayUnit, taughtLinkers });
    }
    for (const m of IATC.mocks) if (m.writing?.prompt) TASKS.set(taskKey(m.writing.prompt, m.writing.bullets), { ...m.writing });
  }
  return TASKS.get(taskKey(prompt, bullets)) ?? { prompt, bullets };
}

// ------------------------------------------------------------------ the kind of writing
/** What kind of text the task asks for: it decides what a sensible order looks like. */
export function writingGenre(task: Pick<WritingTaskInfo, 'title' | 'prompt' | 'bullets'>): WritingGenre {
  const t = [task.title, task.prompt, ...(task.bullets ?? [])].filter(Boolean).join(' ').toLowerCase();
  if (MESSAGE_TASK.test(t)) return 'message';
  if (/\b(conversation|what you say|write what you say|order a meal|questions and answers)\b/.test(t)) return 'conversation';
  if (/\bdirections?\b/.test(t)) return 'directions';
  if (/\b(plans?|future|going to|abroad)\b/.test(t)) return 'plans';
  if (/\b(yesterday|last|you took|you had|happened|a race|a competition|from the past|grandparents)\b/.test(t)) return 'past';
  if (/\b(your day|your week|lifestyle|your friday|a day in|every day)\b/.test(t)) return 'routine';
  if (/\b(about you|yourself|introduce)\b/.test(t)) return 'general';
  if (/\b(friend|family|father|brother|grandparents|neighbours|a man in your family|classmate|famous person)\b/.test(t)) return 'person';
  if (/\b(town|city|home|room|college|shops|country|place|world)\b/.test(t)) return 'place';
  return 'general';
}

// ------------------------------------------------------------------ references (he / she / it / they)
// A pronoun only connects the text if the reader can tell who or what it means. Each one is checked
// against the people and things already named (or named in the task).
const MALE_N = new Set('father brother son uncle grandfather man boy husband mr king prince dad grandpa nephew grandson'.split(' '));
const FEMALE_N = new Set('mother sister daughter aunt grandmother woman girl wife mrs ms miss queen mum mom grandma niece'.split(' '));
const PERSON_N = new Set(('friend teacher classmate cousin neighbour doctor pilot engineer student person manager player captain officer driver nurse mechanic chef '
  + 'instructor partner boss writer waiter technician soldier farmer businessman accountant receptionist guide winner policeman shopkeeper baby child').split(' '));
const PLURAL_N = new Set(('parents grandparents people children friends brothers sisters cousins neighbours students family team classmates men boys police staff teachers '
  + 'sons daughters uncles aunts players pilots engineers doctors workers visitors tourists').split(' '));
const NOT_THING = new Set([...STOP, 'lot', 'bit', 'little', 'way', 'time', 'day', 'week', 'year', 'morning', 'evening', 'afternoon', 'night', 'weekend', 'today', 'tomorrow', 'yesterday']);
const DAYS_MONTHS = /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday|january|february|march|april|may|june|july|august|september|october|november|december|english|arabic|i|ok|dear|hi|hello)$/i;
const DUMMY_IT = /^\s*(is|'s|was|isn't|wasn't)\s+(very |really |so |a little |not |too |always |usually |often )?(hot|cold|warm|cool|sunny|rainy|windy|cloudy|foggy|late|early|time|\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|easy|difficult|hard|important|nice|great|good|fun|lovely|beautiful|wonderful|amazing|interesting|boring|exciting|terrible|awful|bad|ok|okay|safe|dangerous|expensive|cheap|far|near|a (good|great|nice|lovely|long|short|busy|fun|beautiful|wonderful|hot|cold|happy|bad|terrible) (day|time|trip|week|weekend|holiday|journey|morning|evening|night|meal|game|race)|my (birthday|holiday)|the (weekend|holiday))/i;
const GENERIC_THEY = /^\s*(speak|say|sell|make|call|eat|drink|wear|live|play|grow)\b/i;
const DET = /^(a|an|the|my|your|his|her|our|their|this|that|these|those|its|one|two|three|four|five|some|many|every)$/i;
const OBJ_VERB = /^(play|plays|played|eat|eats|ate|drink|drinks|drank|buy|buys|bought|watch|watched|like|likes|love|loves|want|need|use|uses|used|visit|visited|read|learn|study|wear|wears|cook|make|made|take|took|get|got|see|saw|have|has|had)$/i;
const PLACE_NOUN = /^(mountains?|park|tower|mall|centre|center|street|road|beach|lake|palace|museum|hospital|airport|station|college|university|school|mosque|market|souq|hotel|restaurant|city|village|town|island|sea|river|desert|valley|garden|zoo|stadium|base)$/i;
const PREP_PLACE = /^(in|at|from|to|near|visit|visited|visiting|of)$/i;

export function checkReferences(text: string, task: Pick<WritingTaskInfo, 'title' | 'prompt' | 'bullets'>): WritingAnalysis['references'] {
  const clear: WritingReference[] = [];
  const unclear: WritingReference[] = [];
  const taskText = [task.title, task.prompt, ...(task.bullets ?? [])].filter(Boolean).join(' ').toLowerCase();
  const fromTask = {
    male: /\b(he|his|him|father|brother|uncle|grandfather|a man|famous person|son)\b/.test(taskText),
    female: /\b(she|her|mother|sister|aunt|grandmother|a woman|daughter)\b/.test(taskText),
    person: /\b(friend|classmate|teacher|person|cousin|neighbour)\b/.test(taskText),
    plural: /\b(they|their|them|neighbours|parents|grandparents|family|people|shops|brothers|cousins)\b/.test(taskText),
    thing: /\b(it|its)\b/.test(taskText),
  };
  type Ent = { name: string; kind: 'male' | 'female' | 'person' | 'plural' | 'thing'; sentence: number };
  const ents: Ent[] = [];
  const pairs = new Map<number, string[]>(); // sentence → two people joined by "and" (… and … → they)
  const sentences = text.split(/(?<=[.!?]['’"”]?)\s+|\n+/).filter((x) => x.trim());
  let placeSeen = false;
  sentences.forEach((sent, si) => {
    const toks = [...sent.matchAll(/[A-Za-z][A-Za-z']*/g)];
    const words = toks.map((m) => m[0]);
    for (let i = 0; i < words.length; i++) {
      const o = words[i];
      const w = o.toLowerCase().replace(/'s$/, '');
      const prev = (words[i - 1] ?? '').toLowerCase();
      const rest = sent.slice((toks[i].index ?? 0) + o.length);
      const latest = (kinds: Ent['kind'][]) => [...ents].reverse().find((e) => kinds.includes(e.kind));
      const ref = (to?: Ent) => clear.push({ word: o, sentence: si + 1, to: to?.name });
      const bad = (why: string, whyAr: string) => unclear.push({ word: o, sentence: si + 1, why, whyAr });
      if (/^(he|him|his|himself)$/.test(w)) {
        const pair = pairs.get(si - 1);
        const to = latest(['male', 'person']);
        if (pair && i <= 1 && !ents.some((e) => e.sentence === si && (e.kind === 'male' || e.kind === 'person')))
          bad(`“${o}” could mean ${pair[0]} or ${pair[1]}: use the name, or “they”.`, `من المقصود بـ ${o}؟ اكتب الاسم أو they.`);
        else if (to) ref(to);
        else if (latest(['female'])) bad(`“${o}” is for a man, but you wrote about a woman or a girl (${latest(['female'])!.name}).`, `${o} للمذكر، لكنك كتبت عن أنثى.`);
        else if (!(fromTask.male || fromTask.person)) bad(`“${o}”: who is he? Say who the person is first (“My brother Ali …”).`, `من هو؟ اذكر الشخص أولاً.`);
        continue;
      }
      if (/^(she|her|hers|herself)$/.test(w)) {
        const to = latest(['female', 'person']);
        if (to) ref(to);
        else if (latest(['male'])) bad(`“${o}” is for a woman or a girl, but you wrote about a man or a boy (${latest(['male'])!.name}): use “${w === 'she' ? 'he' : 'his'}”.`, `${o} للمؤنث، لكنك كتبت عن مذكر.`);
        else if (!(fromTask.female || fromTask.person)) bad(`“${o}”: who is she? Say who the person is first.`, `من هي؟ اذكري الشخص أولاً.`);
        continue;
      }
      if (/^(they|them|their|theirs|themselves)$/.test(w)) {
        const to = latest(['plural']);
        if (to) ref(to);
        else if (placeSeen && w === 'they' && GENERIC_THEY.test(rest)) continue; // "In Riyadh they speak Arabic"
        else if (!fromTask.plural) bad(`“${o}”: who are they? Name the people or things first (“My parents …”).`, `من هم؟ اذكرهم أولاً.`);
        continue;
      }
      if (/^(it|its|itself)$/.test(w)) {
        const to = latest(['thing']);
        if (to) ref(to);
        else if (w === 'it' && DUMMY_IT.test(rest)) continue; // "It is hot", "It was a great day"
        else if (!fromTask.thing) bad(`“${o}”: what is “it”? Name the thing or place first.`, `ما المقصود بـ it؟ اذكر الشيء أولاً.`);
        continue;
      }
      // people and things that later words can refer to
      // a capital inside a sentence is a name; at the start, only a word the word lists don't know ("Ali is …")
      const capital = /^[A-Z]/.test(o) && !DAYS_MONTHS.test(o) && !STOP.has(w) && (i > 0 || !dict().has(w));
      let chainEnd = i;
      while (chainEnd + 1 < words.length && /^[A-Z]/.test(words[chainEnd + 1]) && !DAYS_MONTHS.test(words[chainEnd + 1])) chainEnd++;
      const placeName = /^[A-Z]/.test(o) && chainEnd > i && PLACE_NOUN.test(words[chainEnd]); // "King Fahd Hospital", "Al Naseem Park"
      if (placeName) {
        ents.push({ name: `${prev === 'the' ? 'the ' : ''}${words.slice(i, chainEnd + 1).join(' ')}`, kind: 'thing', sentence: si });
        placeSeen = true;
        i = chainEnd;
      } else if (MALE_N.has(w)) ents.push({ name: `${DET.test(prev) ? `${prev} ` : ''}${w}`, kind: 'male', sentence: si });
      else if (FEMALE_N.has(w)) ents.push({ name: `${DET.test(prev) ? `${prev} ` : ''}${w}`, kind: 'female', sentence: si });
      else if (PLURAL_N.has(w)) ents.push({ name: `${DET.test(prev) ? `${prev} ` : ''}${w}`, kind: 'plural', sentence: si });
      else if (PERSON_N.has(w)) {
        // "He was a farmer": the same person again, not a new one
        if (!(/^(a|an)$/.test(prev) && /^(is|was|am|are|were|he's|she's|i'm)$/i.test(words[i - 2] ?? '') && ents.length)) ents.push({ name: `${DET.test(prev) ? `${prev} ` : ''}${w}`, kind: 'person', sentence: si });
      }
      else if (capital && (PREP_PLACE.test(prev) || prev === 'the' || PLACE_NOUN.test(w) || (i + 1 < words.length && /^[A-Z]/.test(words[i + 1]) && PLACE_NOUN.test(words[i + 1])))) {
        // a place: "in Abha", "the Green Mountain", "King Fahd Hospital"
        let name = o;
        while (i + 1 < words.length && /^[A-Z]/.test(words[i + 1]) && !DAYS_MONTHS.test(words[i + 1])) name += ` ${words[++i]}`;
        ents.push({ name: prev === 'the' ? `the ${name}` : name, kind: 'thing', sentence: si }); placeSeen = true;
      } else if (capital && (i > 0 || /^\s*(is|was|has|lives|works|likes|comes|plays|studies|and)\b/i.test(rest))) {
        const before = ents[ents.length - 1];
        // "my brother Ali": one person, not two
        if (!(before && before.sentence === si && (before.kind === 'male' || before.kind === 'person') && (MALE_N.has(prev) || PERSON_N.has(prev)))) {
          const placeLike = PLACE_WORD.test(o);
          ents.push({ name: o, kind: placeLike ? 'thing' : 'person', sentence: si });
          if (placeLike) placeSeen = true; else if (/^\s*(is|was)\b/i.test(rest)) ents.push({ name: o, kind: 'thing', sentence: si }); // "Abha is …": a place or a person
        }
      } else if ((DET.test(prev) || OBJ_VERB.test(prev)) && !NOT_THING.has(w) && w.length >= 3) {
        // "a big house", "my favourite place": the noun is the last word of the group
        let head = w;
        let name = `${prev} ${w}`;
        const nx = (words[i + 1] ?? '').toLowerCase();
        if (/^[a-z]+$/.test(words[i + 1] ?? '') && !STOP.has(nx) && !VERB.test(nx) && nx.length >= 3) { head = nx; name += ` ${nx}`; i++; }
        if (MALE_N.has(head) || FEMALE_N.has(head) || PERSON_N.has(head)) ents.push({ name, kind: MALE_N.has(head) ? 'male' : FEMALE_N.has(head) ? 'female' : 'person', sentence: si });
        else {
          const plural = PLURAL_N.has(head) || (/[^s]s$/.test(head) && !/(ss|us|is)$/.test(head)) || /^(two|three|four|five|some|many|these|those)$/.test(prev);
          ents.push({ name, kind: plural ? 'plural' : 'thing', sentence: si });
        }
        if (PLACE_WORD.test(head)) placeSeen = true;
      }
      // "X and Y" (two people) → later "they"
      if (w === 'and' && ents.length && ents[ents.length - 1].sentence === si && ['male', 'female', 'person'].includes(ents[ents.length - 1].kind)) {
        const next = words.slice(i + 1, i + 4).map((x) => x.toLowerCase().replace(/'s$/, ''));
        const k = next.findIndex((x) => MALE_N.has(x) || FEMALE_N.has(x) || PERSON_N.has(x));
        const nextPerson = k >= 0 ? `${k > 0 && DET.test(next[k - 1]) ? `${next[k - 1]} ` : ''}${next[k]}` : words.slice(i + 1, i + 2).find((x) => /^[A-Z]/.test(x) && !DAYS_MONTHS.test(x));
        if (nextPerson) {
          const pair = [ents[ents.length - 1].name, nextPerson];
          pairs.set(si, pair);
          ents.push({ name: `${pair[0]} and ${pair[1]}`, kind: 'plural', sentence: si });
        }
      }
    }
  });
  return { clear, unclear: unclear.slice(0, 4) };
}

// ------------------------------------------------------------------ order
const partOfDay = (s: string) => (/\b(at night|night)\b/i.test(s) ? 4 : /\bevening\b/i.test(s) ? 3 : /\bafternoon\b|\blunch\b/i.test(s) ? 2 : /\bmorning\b|\bbreakfast\b|\bget up\b|\bwake up\b/i.test(s) ? 1 : 0);
/** The part of the day (1 morning … 4 night) each sentence is about, in the order written (to check a routine). */
function timeline(sentences: string[]): number[] {
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return sentences.map((s) => {
    const day = partOfDay(s);
    if (day) return day; // "in the evening", "breakfast" say it best
    const clock = s.match(/\b(\d{1,2})(?:[:.](\d\d))?\s*(am|pm)\b|\bat\s+(\d{1,2})\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) o'clock\b|\b(?:half past|quarter past|quarter to) (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
    if (!clock) return -1;
    let h = Number(clock[1] ?? clock[4] ?? 0) || words.indexOf((clock[5] ?? clock[6] ?? '').toLowerCase()) + 1;
    if (!h || h > 24) return -1;
    if (/pm/i.test(clock[3] ?? '') && h < 12) h += 12;
    else if (!clock[3] && h < 7) h += 12; // "at 4": the afternoon
    return h < 12 ? 1 : h < 17 ? 2 : h < 21 ? 3 : 4;
  });
}
/** Which task point each sentence is about (only when it is about one point). */
function sentenceTopics(sentences: string[], bullets: string[]): number[] {
  return sentences.map((s) => {
    const st = contentStems(s);
    // only the point's own key words count here (a point like "what there is in it" cannot tell sentences apart)
    const hits = bullets.map((b, i) => {
      const own = pointWords(b);
      const shared = new Set(bullets.filter((_, j) => j !== i).flatMap(pointWords));
      const distinctive = own.filter((w) => !shared.has(w));
      const keys = expandHead(distinctive.length ? distinctive : own);
      return !/^\s*ask\b/i.test(b) && keys.length > 0 && keys.some((k) => st.some((x) => same(x, k)));
    });
    return hits.filter(Boolean).length === 1 ? hits.indexOf(true) : -1;
  });
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
  const full = { ...lookupTask(task.prompt, task.bullets), ...Object.fromEntries(Object.entries(task).filter(([, v]) => v !== undefined && v !== '')) } as WritingTaskInfo;
  const empty: WritingAnalysis = {
    marks: { content: 0, organisation: 0, language: 0 }, words: n, sentences: 0, bullets: task.bullets.map((b) => ({ text: b, covered: false })),
    linkers: [], issues: [], offTopic: false, relevance: 0, timeMismatch: '', unit: headwayWritingGuide(full.headwayUnit)?.unit, genre: writingGenre(full),
    references: { clear: [], unclear: [] }, targetUsed: [], reasons, tips: [{ en: 'Write about 25 words about the topic.', ar: 'اكتب حوالي ٢٥ كلمة عن الموضوع.' }], comment: '',
  };
  if (n < 3) { reasons.content.push('Almost nothing written.'); return empty; }

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
  // Rubric: band 3 = connected with basic linking words; band 5 = connected and coherent, with linking words
  // and a few cohesive devices. Judged against what the unit has studied, and the kind of writing.
  const guide: HeadwayWritingGuide | undefined = headwayWritingGuide(full.headwayUnit);
  const genre = writingGenre(full);
  const sentenceParts = t.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
  const sentenceList = t.split(/(?<=[.!?]['’"”]?)\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  const sentences = (t.match(/[.!?]['’"”]?(\s|$)/g) ?? []).length;
  const linkers = LINKERS.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(t));
  const studied = guide ? [...new Set([...guide.linkers, ...(full.taughtLinkers ?? [])])] : ['and', 'but', 'because', 'so', 'also', 'then'];
  const usedStudied = linkers.filter((l) => studied.includes(l));
  const beyondAndAvailable = studied.some((l) => l !== 'and');
  const andChain = sentenceParts.some((x) => (x.match(/\band\b/gi) ?? []).length >= 3 && wordCount(x) > 18);
  // links: up to 2 (only "and" counts in full while "and" is all the class has met)
  let link = linkers.some((l) => l !== 'and') ? 2 : linkers.includes('and') ? (beyondAndAvailable ? 1 : 2) : 0;
  if (link === 0 && !beyondAndAvailable && sentences >= 3) link = 1; // Units 1–2: short separate sentences are what the book models
  if (andChain && link > 0 && !linkers.some((l) => l !== 'and')) link -= 1;
  // cohesion: up to 2 (references that really point back, there / this, repeated key words, message frame)
  const references = checkReferences(t, full);
  const sStems = sentenceParts.map((x) => new Set(contentStems(x)));
  const pairs = sStems.slice(1).filter((cur, k) => [...cur].some((w) => sStems[k].has(w))).length;
  // "there" pointing back to a place (not "there is"), "this / that" pointing back (not "this evening")
  const backWords = sentenceParts.slice(1).some((x) => (/\bthere\b(?!\s+(is|are|was|were|'s)\b)/i.test(x) || /\b(this|that|these|those)\b(?!\s+(morning|afternoon|evening|week|weekend|year|month|time|day)\b)/i.test(x)) && !/^\s*(this|that) is\b/i.test(x));
  const messageTask = genre === 'message';
  const opening = /^(hi|hello|dear|to|for|(a )?(phone )?(message|note) (for|to)|good (morning|afternoon|evening)|salam|assalamu)\b/i.test(t);
  const ending = /\b(bye|goodbye|see you|love|best wishes|thanks|thank you|take care|regards|from|your friend|call me)\b[^.!?]*[.!?]?\s*([A-Z][a-z]+)?\s*$/i.test(t) || /(\n|[.!?]\s+)[A-Z][a-z]+\s*[.!]?\s*$/.test(t);
  // time phrases that frame the order ("In the morning … At night …")
  const timeFrames = sentenceList.filter((s) => SEQUENCE.test(s) || /^(in|on|at|after|before|then|first|next|finally|last|yesterday|today|tomorrow|every)\b/i.test(s)).length >= 2;
  // a dialogue is joined by question and answer
  const qa = sentenceList.some((s, i) => /\?['’"]?\s*$/.test(s) && /^(yes|no|i|we|it|sure|ok|okay|fine|thank|that's|of course)\b/i.test(sentenceList[i + 1] ?? ''));
  if (genre === 'conversation' && link === 0 && (qa || sentences >= 3)) link = 1; // dialogue lines connect by turns, not linking words
  const kinds = Number(references.clear.length > 0) + Number(backWords) + Number(pairs >= 2) + Number(messageTask && opening && ending) + Number(timeFrames) + Number(qa);
  const cohesion = Math.max(0, Math.min(2, kinds) - (references.unclear.length ? 1 : 0));
  // order: the task's points in a sensible order, without jumping back and forth (explained below)
  const topics = sentenceTopics(sentenceList, full.bullets);
  const seq = topics.filter((x) => x >= 0).filter((x, i, a) => i === 0 || a[i - 1] !== x);
  const back = seq.findIndex((x, i) => seq.indexOf(x) < i);
  // A B A B … is a pattern repeated for each person or place ("My brother … He is tall. My cousin … He is short."): fine.
  const periodic = seq.length >= 4 && seq.every((x, i) => i < 2 || x === seq[i - 2]);
  // … and so is returning to a point after starting on a new person or place ("My cousin Saleh …", "Next to the library …")
  const newSubject = (s: string) => {
    const m = s.match(/^(?:my|his|her|our|their|the|a|an)\s+([a-z]+)/i);
    return !!m && (MALE_N.has(m[1].toLowerCase()) || FEMALE_N.has(m[1].toLowerCase()) || PERSON_N.has(m[1].toLowerCase()) || PLURAL_N.has(m[1].toLowerCase()) || PLACE_WORD.test(m[1]))
      || /^(next to|near|opposite|behind|in front of|at the|in the (centre|city|village|town|north|south|east|west))\b/i.test(s);
  };
  const returnAt = back > 0 ? topics.findIndex((x, i) => x === seq[back] && topics.slice(0, i).some((y) => y >= 0 && y !== x) && topics.slice(0, i).includes(x)) : -1;
  const firstAt = back > 0 ? topics.indexOf(seq[back]) : -1;
  const regrouped = returnAt > 0 && sentenceList.slice(firstAt + 1, returnAt + 1).some(newSubject);
  const backAndForth = back > 0 && seq.length >= 3 && sentenceList.length >= 4 && !periodic && !regrouped && !messageTask ? full.bullets[seq[back]] : '';
  const convOrder = genre === 'conversation' && seq.length >= 2 && seq.some((x, i) => i > 0 && x < seq[i - 1]);
  const times = timeline(sentenceList).filter((x) => x >= 0);
  const timeBack = times.some((x, i) => i > 0 && x < times[i - 1]);
  const timed = (genre === 'routine' || (genre === 'past' && (guide?.unit ?? 14) >= 6)) && times.length >= 2;
  const inOrder = covered >= need && !offTopic && !backAndForth && !convOrder && !(timed && timeBack) && references.unclear.length === 0;
  const total = link + cohesion + Number(inOrder);
  let organisation = sentences >= 3 ? [1, 2, 3, 4, 5, 5][total] : [1, 1, 2, 3, 3, 3][total];
  // clear, relevant and in a sensible order is band 3 at least, with or without linking words
  if (inOrder && sentences >= 3) organisation = Math.max(organisation, 3);
  if (sentences === 0 && n < 8) organisation = Math.min(organisation, 1);

  if (guide) reasons.organisation.push(`Headway Unit ${guide.unit} (${guide.title}), ${GENRE_LABEL[genre]}: ${guide.organisation}`);
  else reasons.organisation.push(`General A1 check (${GENRE_LABEL[genre]}): this task is not matched to a Headway unit.`);
  const notMet = guide ? linkers.filter((l) => TRACKED_LINKERS.includes(l) && !studied.includes(l)) : [];
  if (linkers.length) reasons.organisation.push(`Linking words: ${linkers.join(', ')}.${notMet.length ? ` (${notMet.join(', ')}: not used in the book before this unit; fine if used well.)` : ''}`);
  else if (sentences >= 2) reasons.organisation.push(beyondAndAvailable
    ? `No linking words. ${guide ? `Met in the book by Unit ${guide.unit}` : 'Basic A1 linking words'}: ${studied.join(', ')}; one could join two ideas here, but none is compulsory.`
    : 'No linking words: short, separate sentences are fine at this point in the book (Units 1–2).');
  if (guide && usedStudied.length && link === 2) reasons.organisation.push(`Uses linking words this unit has met: ${usedStudied.join(', ')}.`);
  if (andChain) reasons.organisation.push('One sentence strings ideas together with “and … and … and”: use full stops.');
  if (references.clear.length) reasons.organisation.push(`Clear references: ${references.clear.slice(0, 4).map((r) => (r.to ? `${r.word} → ${r.to}` : r.word)).join('; ')}.`);
  for (const r of references.unclear) reasons.organisation.push(`Unclear reference (sentence ${r.sentence}): ${r.why}`);
  if (backWords) reasons.organisation.push('Uses there / this / that to point back to an idea.');
  if (pairs >= 2) reasons.organisation.push('Key words are picked up from one sentence to the next.');

  // the kind of writing
  if (messageTask) {
    if (opening && ending) reasons.organisation.push(`${/postcard/i.test(taskText) ? 'Postcard' : 'Message'} format: a greeting and an ending.`);
    else {
      organisation = Math.min(organisation, 4);
      reasons.organisation.push(`${/postcard/i.test(taskText) ? 'A postcard' : 'A message'} needs ${!opening && !ending ? 'a greeting (Dear … / Hi …) and an ending (See you soon. / From …)' : !opening ? 'a greeting (Dear … / Hi …)' : 'an ending (See you soon. / From … + name)'}.`);
    }
  }
  if (timeFrames) reasons.organisation.push('Time phrases frame the order of the ideas.');
  if (qa) reasons.organisation.push('Questions are followed by answers.');
  if (inOrder) reasons.organisation.push('The points are clear, on the task and in a sensible order.');
  if (backAndForth) {
    organisation = Math.max(1, organisation - 1);
    reasons.organisation.push(`The ideas jump back to “${backAndForth}” after “${full.bullets[seq[back - 1]]}”: put the sentences about each point together${genre === 'place' ? ' (group the information by place)' : ''}.`);
  }
  if (convOrder) {
    organisation = Math.max(1, organisation - 1);
    reasons.organisation.push('The conversation is not in a sensible order (hello → question → thank you).');
  }
  if (genre === 'directions' && !/\b(first|then|next|after that|turn|go straight|until|at the)\b/i.test(t)) reasons.organisation.push('Directions are easier to follow with first / then / turn left / go straight on.');
  if (timed) {
    if (timeBack) { organisation = Math.max(1, organisation - 1); reasons.organisation.push('The times are not in order: tell the day from morning to evening.'); }
    else reasons.organisation.push('The day is told in time order.');
  } else if ((genre === 'routine' || genre === 'past') && (guide?.unit ?? 14) >= 6 && !SEQUENCE.test(t) && !TIMEW.test(t)) {
    reasons.organisation.push('No time expressions (in the morning, then, last Friday …): they would make the order clear.');
  }
  const longest = Math.max(0, ...sentenceParts.map((x) => wordCount(x)));
  if (longest > 30) { organisation = Math.max(1, organisation - 1); reasons.organisation.push(`One very long sentence (${longest} words): use full stops.`); }
  if (sentences === 0 && n >= 8) { organisation = Math.min(organisation, 2); reasons.organisation.push('No full stops: the sentences are not separated.'); }

  // ---------------- Language
  const issues: WritingIssue[] = grammarIssues(t, guide?.unit);
  const targetUsed = guide ? guide.targets.filter((x) => x.re.test(t)).map((x) => x.label) : [];
  if (guide) {
    const unitErr = issues.filter((i) => i.unit !== undefined);
    reasons.language.push(`Unit ${guide.unit} language: ${guide.language}.`);
    if (targetUsed.length) reasons.language.push(`Uses this unit's language: ${targetUsed.join(', ')}${unitErr.some((i) => i.unit === guide.unit) ? ', with some mistakes' : ''}.`);
    else reasons.language.push('This unit\'s language is not used here; that is fine if the task does not need it.');
    if (unitErr.length) reasons.language.push(`Mistakes with language from the book (Units ${[...new Set(unitErr.map((i) => i.unit))].sort((a, b) => a! - b!).join(', ')}): ${unitErr.slice(0, 3).map((i) => `“${i.text}”`).join(', ')}.`);
  }
  const parts = sentenceParts.map((x) => x.replace(/^(hi|hello|dear)\b[^,\n]*[,\n]\s*/i, '')).filter((x) => wordCount(x) >= 3);
  const long = parts.filter((x) => wordCount(x) >= 4);
  const withVerb = long.filter((x) => VERB.test(x)).length / Math.max(1, long.length);
  const lowerStarts = t.split(/(?<=[.!?]['’"”]?)\s+/).filter((x) => /^[a-z]/.test(x.trim())).length;
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
  const a: WritingAnalysis = { marks, words: n, sentences, bullets, linkers, issues, offTopic, relevance: rel, timeMismatch, unit: guide?.unit, genre, references, targetUsed, reasons, tips: [], comment: '' };
  a.tips = tipsFor(a, full, guide, backAndForth);
  a.comment = commentFor(a, guide, backAndForth);
  return a;
}

/** Backwards-compatible: just the three marks. */
export const estimateWriting = (text: string, bullets: string[], prompt = '', model?: string) => analyseWriting(text, { bullets, prompt, model }).marks;

// ------------------------------------------------------------------ feedback
const JOINERS = (links: string[]) => links.filter((l) => l !== 'also' && l !== 'then');

function tipsFor(a: WritingAnalysis, task: WritingTaskInfo, guide?: HeadwayWritingGuide, backAndForth = ''): { en: string; ar: string }[] {
  const tips: { en: string; ar: string }[] = [];
  if (a.offTopic) tips.push({ en: `Read the task again and write about: ${task.title || task.prompt}`, ar: 'اقرأ السؤال مرة أخرى واكتب عن الموضوع المطلوب.' });
  for (const b of a.bullets.filter((x) => !x.covered).slice(0, 2)) tips.push({ en: `Also write about: ${b.text}.`, ar: `اكتب أيضاً عن: ${b.text}` });
  if (a.timeMismatch === 'past-for-future') tips.push({ en: 'This task is about the future: use going to / will.', ar: 'هذا السؤال عن المستقبل: استخدم going to أو will.' });
  if (a.timeMismatch === 'present-for-past') tips.push({ en: 'This task is about the past: use was / were and past verbs (went, played).', ar: 'هذا السؤال عن الماضي: استخدم was / were والأفعال الماضية.' });
  if (a.words < 20) tips.push({ en: `Write more: about 25 words (you wrote ${a.words}).`, ar: `اكتب أكثر: حوالي ٢٥ كلمة (كتبت ${a.words}).` });
  for (const i of a.issues.filter((x) => x.kind === 'grammar').slice(0, 2)) tips.push({ en: `“${i.text}”${i.fix ? ` → “${i.fix}”` : ''}: ${i.why}`, ar: i.whyAr });
  const r = a.references.unclear[0];
  if (r) tips.push({ en: r.why!, ar: r.whyAr! });
  const format = a.reasons.organisation.find((x) => /needs (a greeting|an ending)/.test(x));
  if (format) tips.push({ en: format, ar: 'ابدأ بتحية (Dear / Hi) واختم بعبارة ختام واسمك.' });
  if (backAndForth) tips.push({ en: `Put all your sentences about “${backAndForth}” together.`, ar: `اجمع الجمل عن «${backAndForth}» معاً.` });
  if (a.marks.organisation <= 2 && !r && !backAndForth && !format) {
    const links = JOINERS(guide ? guide.linkers : ['and', 'but', 'because', 'so']);
    tips.push(links.length > 1
      ? { en: `Put your ideas in a clear order. You can join two ideas with ${links.join(', ')} when it fits.`, ar: `رتّب أفكارك بوضوح، ويمكنك ربط فكرتين بـ ${links.join(' أو ')} عندما يناسب ذلك.` }
      : { en: 'Write short, clear sentences in a good order, each with a full stop.', ar: 'اكتب جملاً قصيرة وواضحة بترتيب جيد، وفي نهاية كل جملة نقطة.' });
  }
  const p = a.issues.find((x) => x.kind === 'punctuation');
  if (p) tips.push({ en: p.why, ar: p.whyAr });
  const sp = a.issues.filter((x) => x.kind === 'spelling').map((x) => x.text);
  if (sp.length) tips.push({ en: `Check these words (spelling): ${sp.slice(0, 4).join(', ')}.`, ar: 'راجع كتابة هذه الكلمات.' });
  if (guide && !a.targetUsed.length && tips.length < 4 && a.marks.language < 5) tips.push({ en: `Try this unit's language: ${guide.studentFocus.en.replace(/^I used /, '')}`, ar: guide.studentFocus.ar });
  if (!tips.length) tips.push({ en: 'Excellent! All the points, clear and in a good order. Keep writing like this.', ar: 'ممتاز! كتبت عن كل النقاط بوضوح وترتيب جيد. استمر.' });
  return tips.slice(0, 4);
}

/** A short, kind comment for the teacher to edit: one strength, one next step, from the actual writing. */
function commentFor(a: WritingAnalysis, guide?: HeadwayWritingGuide, backAndForth = ''): string {
  const good: string[] = [];
  if (a.bullets.length && a.bullets.every((b) => b.covered)) good.push(`you answered all ${a.bullets.length} points`);
  if (a.marks.organisation >= 4) good.push(a.references.clear.length && !a.references.unclear.length ? 'your ideas are clearly connected' : 'your ideas are in a clear order');
  if (guide && a.targetUsed.length && !a.issues.some((i) => i.unit === guide.unit)) good.push(`you used ${a.targetUsed[0]} well`);
  else if (a.marks.language >= 4) good.push('your sentences are clear');
  const praise = good.length ? `Well done: ${good.slice(0, 2).join(' and ')}.` : 'Good try. Thank you for your writing.';
  const missing = a.bullets.find((b) => !b.covered);
  const g = a.issues.find((i) => i.kind === 'grammar');
  const r = a.references.unclear[0];
  let next = '';
  if (a.offTopic) next = 'Next time, read the task again and write about the topic.';
  else if (missing) next = `Next time, also write about “${missing.text}”.`;
  else if (a.timeMismatch === 'past-for-future') next = 'Next time, use going to / will for plans.';
  else if (r) next = `Next time, make it clear who or what “${r.word}” is (sentence ${r.sentence}).`;
  else if (a.reasons.organisation.some((x) => /needs (a greeting|an ending)/.test(x))) next = 'Next time, start with a greeting and finish with an ending and your name.';
  else if (backAndForth) next = `Next time, keep the sentences about “${backAndForth}” together.`;
  else if (g) next = `Next time, check “${g.text}”${g.fix ? ` (→ “${g.fix}”)` : ''}.`;
  else if (a.words < 20) next = 'Next time, write a little more (about 25 words).';
  else if (a.marks.organisation <= 3) next = guide && JOINERS(guide.linkers).length > 1
    ? `Next time, join some ideas with words you have studied (${JOINERS(guide.linkers).join(', ')}) where they fit.`
    : 'Next time, put your ideas in a clear order.';
  return next ? `${praise} ${next}` : `${praise} Keep it up!`;
}

/** The student's checklist before sending: the A1 rubric, in the words of the task's unit and kind of writing. */
export function writingChecklist(task: WritingTaskInfo): { area: 'Content' | 'Organisation' | 'Language'; en: string; ar: string }[] {
  const full = { ...lookupTask(task.prompt, task.bullets), ...Object.fromEntries(Object.entries(task).filter(([, v]) => v !== undefined && v !== '')) } as WritingTaskInfo;
  const guide = headwayWritingGuide(full.headwayUnit);
  const genre = writingGenre(full);
  const points = full.bullets.length || 3;
  const order: Record<WritingGenre, [string, string]> = {
    message: ['I started with a greeting (Dear … / Hi …) and finished with an ending (See you soon. / From …) and my name.', 'بدأت بتحية (Dear / Hi) وختمت بعبارة ختام واسمي.'],
    conversation: ['My conversation is in a sensible order (hello → question → thank you).', 'المحادثة بترتيب منطقي (تحية ← سؤال ← شكر).'],
    directions: ['My directions are in order (first … then … turn …).', 'الإرشادات بالترتيب (first ثم then).'],
    place: ['I put the information about each place together.', 'جمعت المعلومات عن كل مكان معاً.'],
    person: ['I said who the person is before I wrote he / she / they.', 'ذكرت الشخص قبل أن أكتب he / she / they.'],
    routine: ['My day is in time order (morning → evening).', 'يومي بترتيب الوقت (الصباح ← المساء).'],
    past: ['I told what happened in a clear order.', 'رويت ما حدث بترتيب واضح.'],
    plans: ['My plans are in a clear order.', 'خططي بترتيب واضح.'],
    general: ['My ideas are clear and in a sensible order.', 'أفكاري واضحة وبترتيب منطقي.'],
  };
  const links = JOINERS(guide ? guide.linkers : ['and', 'but', 'because', 'so']);
  const out: ReturnType<typeof writingChecklist> = [
    { area: 'Content', en: `I wrote about the topic and all ${points} points (about 25 words).`, ar: 'كتبت عن الموضوع وعن كل النقاط (حوالي ٢٥ كلمة).' },
    { area: 'Organisation', en: order[genre][0], ar: order[genre][1] },
    links.length > 1
      ? { area: 'Organisation', en: `Where it fits, I joined ideas with words I studied: ${links.join(', ')}.`, ar: 'ربطت الأفكار بكلمات الربط التي درستها عندما يناسب ذلك.' }
      : { area: 'Organisation', en: 'I wrote short sentences, each with one idea and a full stop.', ar: 'كتبت جملاً قصيرة، في كل جملة فكرة واحدة ونقطة.' },
  ];
  if (genre !== 'message' && genre !== 'conversation' && genre !== 'directions' && genre !== 'person') out.push({ area: 'Organisation', en: 'When I wrote he / she / it / they, it is clear who or what I mean.', ar: 'عندما كتبت he / she / it / they فالمقصود واضح.' });
  out.push(guide
    ? { area: 'Language', en: `${guide.studentFocus.en.replace(/\.$/, '')} where it fits (Unit ${guide.unit}).`, ar: guide.studentFocus.ar }
    : { area: 'Language', en: 'Every sentence has a subject and a verb.', ar: 'كل جملة فيها فاعل وفعل.' });
  out.push({ area: 'Language', en: 'I used words I know, spelled well, with capital letters and full stops.', ar: 'استخدمت كلمات أعرفها وكتبتها صحيحة، مع الحروف الكبيرة والنقاط.' });
  return out;
}
