// New Headway Plus Beginner, Special Edition, Student's Book (Units 1–14): what each unit teaches,
// used by the writing check (writingCheck.ts) to judge a weekly task against ITS unit.
// Sources: the contents pages (pp. 2–5) and the unit pages, read from
// FND68/CLass FND 68/A0 - A1 Resources/A0 - A`1 Books/01. Headway Beginner/01–05 Book-NHWP-Beg-*.pdf.
//
// Linking words are "studied" from the unit where the book first uses them in its models:
//   and: Unit 1 onwards · but: Unit 3 (p. 20 "I am a student, but I'm not from Scotland"), common from Unit 5
//   also: Unit 4 (p. 28 "My best friend") · then: Unit 6 (daily routines)
//   because: Unit 7 (p. 48 "Why …? Because …") · so: Unit 8 (p. 61 Vancouver: "a cosmopolitan city so there …")
// They are never compulsory: the check only asks for links the class has met, and only where they fit.

export interface UnitRule { re: RegExp; why: string; whyAr: string; fix?: (m: string) => string }
export interface HeadwayWritingGuide {
  unit: number;
  title: string;
  /** Teacher-facing summary of the unit's grammar. */
  language: string;
  /** The unit's vocabulary areas. */
  vocabulary: string;
  /** The book's own writing task in this unit, if there is one. */
  bookWriting?: string;
  /** What good organisation looks like at this point in the book. */
  organisation: string;
  /** Linking words met in the book by the end of this unit. */
  linkers: string[];
  /** The unit's target language, as it appears in a student's writing (used to give feedback, never required). */
  targets: { label: string; re: RegExp }[];
  /** Short student-facing reminder of the unit's language (checklist). */
  studentFocus: { en: string; ar: string };
  /** Common mistakes with this unit's language (from the book's "Check it" exercises). */
  errors: UnitRule[];
}

const LINK_FROM: [string, number][] = [['and', 1], ['but', 3], ['also', 4], ['then', 6], ['because', 7], ['so', 8]];
export const studiedLinkers = (unit: number) => LINK_FROM.filter(([, u]) => unit >= u).map(([w]) => w);

const NATION = 'German|Japanese|Italian|Spanish|French|American|Chinese|Saudi|English|Korean|Indian|Turkish|Egyptian|British|Swiss|Brazilian|Mexican|Portuguese';
const JOBS = 'teacher|student|doctor|nurse|pilot|engineer|mechanic|driver|businessman|accountant|technician|manager|soldier|farmer|police officer';
const PAST_BASE = 'go|eat|buy|see|have|make|take|come|drink|swim|meet|get|do|visit|play|watch|study|stay|travel|write|drive|fly|sleep|leave';

const UNITS: Omit<HeadwayWritingGuide, 'unit' | 'linkers'>[] = [
  { // 1
    title: 'Hello!', language: 'am / are / is; my / your; This is …', vocabulary: 'greetings, everyday objects, numbers 1–10 and plurals',
    organisation: 'Short, separate sentences about you in a clear order; “and” where it fits.',
    targets: [{ label: 'am / is / are', re: /\b(I'm|I am|is|are|it's|what's)\b/i }, { label: 'my / your', re: /\b(my|your)\b/i }, { label: 'This is …', re: /\bthis is\b/i }],
    studentFocus: { en: 'I used am / is / are and my / your.', ar: 'استخدمت am / is / are و my / your.' },
    errors: [
      { re: /\b(I'm|I am) is\b/gi, why: 'Use only one verb: “I’m Nawaf” or “My name is Nawaf”', whyAr: 'استخدم فعلاً واحداً: I’m Nawaf', fix: (m) => m.replace(/\s+is$/i, '') },
      { re: /\b[Mm]y name\s+(?!is\b|was\b)[A-Z][a-z]+/g, why: '“My name is …” needs is', whyAr: 'نقول My name is', fix: (m) => m.replace(/^my name/i, 'My name is') },
    ],
  },
  { // 2
    title: 'Your world', language: 'he / she / they; his / her; questions with What / Where', vocabulary: 'countries, cities, adjectives (beautiful, fantastic), places in a city',
    organisation: 'Say who or what you describe first, then use he / she / it / they so the reader knows who you mean.',
    targets: [{ label: 'he / she / they is / are', re: /\b(he's|she's|they're|he is|she is|they are)\b/i }, { label: 'his / her', re: /\b(his|her)\b/i }, { label: 'from + country', re: /\bfrom\s+[A-Z]/ }],
    studentFocus: { en: 'I used he / she / they and his / her correctly.', ar: 'استخدمت he / she / they و his / her بشكل صحيح.' },
    errors: [
      { re: /\b(she's|he's) (name|job|phone|address|surname|father|mother|brother|sister|city|country)\b/gi, why: 'Possession: “her name”, “his job” (not “she’s name”)', whyAr: 'للملكية نقول her name و his job', fix: (m) => m.replace(/^she's/i, 'her').replace(/^he's/i, 'his') },
      { re: /(?<!\b(?:is|are|was|were)\s)\b(he|she|it|they)\s+from\b/gi, why: 'Use is / are: “He is from …”', whyAr: 'نستخدم is / are: He is from', fix: (m) => m.replace(/^(\w+)/, (p) => `${p} ${/^they$/i.test(p) ? 'are' : 'is'}`) },
    ],
  },
  { // 3
    title: 'All about you', language: 'am / are / is: negatives (isn’t, aren’t, I’m not), questions and short answers', vocabulary: 'jobs, personal information (surname, address, phone number, married)',
    bookWriting: 'p. 21: write about another student (name, where from, phone number, job, married).',
    organisation: 'Personal details in a clear order; make it clear who “he / she” is.',
    targets: [{ label: 'negatives (isn’t / aren’t / I’m not)', re: /\b(isn't|aren't|I'm not|is not|are not|am not)\b/i }, { label: 'a + job', re: /\b(a|an)\s+(teacher|student|doctor|nurse|pilot|engineer|police officer|mechanic|driver|businessman|accountant|technician|manager|soldier|farmer)\b/i }],
    studentFocus: { en: 'I used isn’t / aren’t / I’m not and a + job (a pilot).', ar: 'استخدمت isn’t / aren’t / I’m not و a مع المهنة.' },
    errors: [
      { re: /\bI amn't\b/gi, why: '“I’m not”, not “I amn’t”', whyAr: 'نقول I’m not', fix: () => "I'm not" },
      { re: /\b(they're|we're|you're|he's|she's|is|are|am)\s+no\s+(married|single|from|in|at|here|there|happy|tired|very|a|an|students?|teachers?|engineers?|pilots?)\b/gi, why: 'Negative: “isn’t / aren’t / I’m not”, not “no”', whyAr: 'النفي: isn’t / aren’t وليس no', fix: (m) => m.replace(/\bno\b/i, 'not') },
      { re: new RegExp(`\\b(I am|I'm|he is|he's|she is|she's|my (?:father|brother|uncle|friend|cousin) is)\\s+(${JOBS})\\b`, 'gi'), why: 'A job needs a / an: “He is a pilot”', whyAr: 'المهنة تحتاج a / an: He is a pilot', fix: (m) => m.replace(new RegExp(`\\s(${JOBS})$`, 'i'), (_, j: string) => ` ${/^[aeiou]/i.test(j) ? 'an' : 'a'} ${j}`) },
      { re: /\b(his|her|my|your) job is (a |an )?(teacher|student|doctor|nurse|pilot|engineer|mechanic|driver)\b/gi, why: 'Say “He’s a pilot” (or “His job: pilot”)', whyAr: 'نقول He’s a pilot' },
    ],
  },
  { // 4
    title: 'Family and friends', language: 'possessive adjectives (our, their); possessive ’s; has / have; adjective + noun', vocabulary: 'the family, describing a friend (very funny, a lot of friends, favourite team)',
    bookWriting: 'p. 29: write about a good friend: his / her family, job, favourite shop and sport (model: “My best friend”, p. 28).',
    organisation: 'Group the facts about each person together; use he / she / they clearly; and / also where they fit.',
    targets: [{ label: 'possessive ’s', re: /\b[A-Za-z]+'s\s+(name|job|car|house|wife|son|daughter|brother|sister|father|mother|friend|office|team|family|favourite)\b/i }, { label: 'has / have', re: /\b(has|have)\b/i }, { label: 'our / their', re: /\b(our|their)\b/i }],
    studentFocus: { en: 'I used has / have and ’s (my father’s car).', ar: 'استخدمت has / have و ’s للملكية.' },
    errors: [
      { re: /\b(my|his|her|your|our)\s+(father|mother|brother|sister|friend|uncle|daughter|son|wife|cousin)\s+(name|job|car|house|phone|office|city|team)\b/gi, why: 'Possessive ’s: “my father’s name”', whyAr: 'الملكية بـ ’s: my father’s name', fix: (m) => m.replace(/(\w+)\s+(\w+)$/, "$1's $2") },
      { re: /\bthey're\s+(parents|house|car|names?|children|father|mother|family|home|city)\b/gi, why: '“their parents” (their = for them)', whyAr: 'their للملكية: their parents', fix: (m) => m.replace(/they're/i, 'their') },
      { re: /\btheir\s+(from|in|at|very|students?|teachers?|engineers?|happy|married|brothers)\b/gi, why: '“They’re from …” (they’re = they are)', whyAr: 'they’re = they are', fix: (m) => m.replace(/their/i, "they're") },
    ],
  },
  { // 5
    title: 'The way I live', language: 'Present Simple with I / you / we / they (like, live, work, speak); do / don’t; a / an; adjective + noun (a German car)', vocabulary: 'sports, food and drinks, verbs (live, work, play, speak, want), languages and nationalities',
    organisation: 'Group likes, dislikes and facts; but for a contrast (I like …, but I don’t like …).',
    targets: [{ label: 'Present Simple (I like / I live)', re: /\b(I|we|they|you)\s+(like|love|live|work|play|speak|want|eat|drink|study|have|go)\b/i }, { label: 'don’t', re: /\b(don't|do not)\b/i }, { label: 'adjective + noun', re: new RegExp(`\\b(${NATION})\\s+[a-z]+`, 'i') }],
    studentFocus: { en: 'I used I like / I don’t like and adjective + noun (a German car).', ar: 'استخدمت I like / I don’t like والصفة قبل الاسم.' },
    errors: [
      { re: /\b(I|we|they|you)\s+not\s+(like|live|work|play|speak|want|eat|drink|have|go|know)\b/gi, why: 'Negative: “I don’t like …”', whyAr: 'النفي: I don’t like', fix: (m) => m.replace(/\bnot\b/i, "don't") },
      { re: new RegExp(`\\b(car|cars|food|phone|tea|coffee|restaurant|oranges|cheese|watch|team|film|films|clothes)\\s+(${NATION})\\b`, 'gi'), why: 'The adjective comes first: “a German car”', whyAr: 'الصفة قبل الاسم: a German car', fix: (m) => m.split(/\s+/).reverse().join(' ') },
    ],
  },
  { // 6
    title: 'Every day', language: 'Present Simple with he / she (gets up, has, doesn’t); adverbs of frequency (always, never); the time', vocabulary: 'the time, daily routines (have breakfast, leave school, get home), days of the week, on / at / in',
    organisation: 'Put the day in time order (in the morning … then … in the evening) and use time expressions.',
    targets: [{ label: 'he / she + verb-s', re: /\b(he|she|my (?:father|brother|uncle|friend))\s+(\w+s)\b/i }, { label: 'always / usually / never', re: /\b(always|usually|often|sometimes|never)\b/i }, { label: 'times (at 7 o’clock)', re: /\bat\s+(\d{1,2}([:.]\d\d)?|half past|quarter|[a-z]+ o'clock)/i }],
    studentFocus: { en: 'I used times (at 7 o’clock), always / never and he / she + -s.', ar: 'استخدمت الأوقات و always / never و s مع he / she.' },
    errors: [
      { re: /\b(go|goes|get|gets|have|has|work|works|eat|eats|play|plays|watch|watches|come|comes|study|studies) (always|usually|often|never|sometimes)\b/gi, why: 'Frequency words go before the verb: “He always works late”', whyAr: 'ظرف التكرار قبل الفعل: He always works', fix: (m) => m.split(/\s+/).reverse().join(' ') },
      { re: /\bat the (morning|afternoon|evening)\b/gi, why: '“in the morning”', whyAr: 'نقول in the morning', fix: (m) => m.replace(/^at/i, 'in') },
      { re: /\bin (sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/gi, why: 'Days: “on Friday”', whyAr: 'الأيام: on Friday', fix: (m) => m.replace(/^in/i, 'on') },
    ],
  },
  { // 7
    title: 'My favourites', language: 'question words (who, where, why, how); subject / object / possessive pronouns; this / that', vocabulary: 'adjectives (lovely, comfortable, friendly), opposites (new / old, big / small), places in town',
    bookWriting: 'p. 53: a holiday postcard (model: “A postcard from San Francisco”): Dear …, the hotel, the people, the food, the city, the weather; See you …, From …',
    organisation: 'A postcard starts with Dear / Hi … and ends with See you … / From + name. Group what you say about each thing; but / because where they fit.',
    targets: [{ label: 'adjectives (lovely, friendly …)', re: /\b(lovely|comfortable|friendly|beautiful|delicious|wonderful|amazing|awful|terrible|expensive|cheap|great|fantastic|nice|big|small|old|new|modern|busy|quiet)\b/i }, { label: 'him / her / them / it', re: /\b(him|them|us|me)\b/i }, { label: 'because', re: /\bbecause\b/i }],
    studentFocus: { en: 'I used adjectives (lovely, friendly) and him / her / them.', ar: 'استخدمت الصفات و him / her / them.' },
    errors: [
      { re: /\b(like|love|know|meet|see|visit|help|call)\s+(he|she|they|I|we)\b(?!'|\s+(is|are|am|was|were|can|can't|do|does|don't|doesn't|did|will|have|has|had|go|like|live|work|\w+s|\w+ed)\b)/gi, why: 'After a verb: him / her / them / me / us', whyAr: 'بعد الفعل: him / her / them', fix: (m) => m.replace(/\b(he|she|they|I|we)$/i, (p) => ({ he: 'him', she: 'her', they: 'them', i: 'me', we: 'us' } as Record<string, string>)[p.toLowerCase()]) },
      { re: /\b(this|that)\s+(shoes|clothes|trousers|jeans|people|books|shops|places|glasses|cars)\b/gi, why: 'Plural: “these shoes”, “those people”', whyAr: 'للجمع: these / those', fix: (m) => m.replace(/^this/i, 'these').replace(/^that/i, 'those') },
    ],
  },
  { // 8
    title: 'Where I live', language: 'There is / There are; some / any; prepositions of place (in, on, under, next to, opposite)', vocabulary: 'rooms and furniture, in and out of town (places, the beach, the mountains), directions',
    bookWriting: 'p. 62: write about a town you know (where it is, when to visit, what to do, where to eat and stay, how to travel; model: Vancouver, pp. 60–61).',
    organisation: 'Describe a place by grouping the information (where it is, places to visit, food, hotels, transport). Use There is / are and place words.',
    targets: [{ label: 'there is / there are', re: /\bthere (is|are|'s)\b/i }, { label: 'prepositions of place', re: /\b(in|on|under|next to|opposite|near|between|behind)\s+(the|my|a|your)\b/i }, { label: 'some / any', re: /\b(some|any)\b/i }],
    studentFocus: { en: 'I used there is / there are and place words (next to, opposite).', ar: 'استخدمت there is / there are وكلمات المكان.' },
    errors: [
      { re: /\bthere is (two|three|four|five|six|seven|eight|nine|ten|many|\d+)\b/gi, why: 'More than one: “there are two …”', whyAr: 'للجمع: there are', fix: (m) => m.replace(/\bis\b/i, 'are') },
      { re: /\bnext (the|my|a|your|to to)\b/gi, why: '“next to the …”', whyAr: 'نقول next to', fix: (m) => m.replace(/^next/i, 'next to').replace(/to to/i, 'to') },
      { re: /\b(in|at) (my|the) (city|town|room|house|home) (have|has) (a lot of|many|some|two|three|\d+)\b/gi, why: 'Say “In my city there are …”', whyAr: 'نقول In my city there are', fix: (m) => m.replace(/\b(have|has)\b/i, 'there are') },
    ],
  },
  { // 9
    title: 'Times past', language: 'was / were; was born; Past Simple irregular verbs (went, saw, came); years and dates', vocabulary: 'saying years and dates, people and jobs, irregular verbs (had, made, bought)',
    organisation: 'Tell past facts or events in time order with time expressions (in 1990, then, last year).',
    targets: [{ label: 'was / were', re: /\b(was|were)\b/i }, { label: 'was born', re: /\b(was|were) born\b/i }, { label: 'past verbs', re: /\b(went|saw|came|had|made|bought|got|ate|met|took|left)\b/i }],
    studentFocus: { en: 'I used was / were, was born and past verbs (went, saw).', ar: 'استخدمت was / were و was born والأفعال الماضية.' },
    errors: [
      { re: /\b(I|he|she|they|we|you)\s+(am|is|are)?\s*born\b/gi, why: '“I was born in …”', whyAr: 'نقول I was born', fix: (m) => { const p = m.split(/\s+/)[0]; return `${p} ${/^(they|we|you)$/i.test(p) ? 'were' : 'was'} born`; } },
      { re: /\bat (19|20)\d\d\b/gi, why: 'Years: “in 1990”', whyAr: 'مع السنوات نستخدم in', fix: (m) => m.replace(/^at/i, 'in') },
      { re: /\b(was|were) (go|went|see|saw|come|came|have|eat|buy|play|visit|watch)\b/gi, why: 'Past Simple without was: “I went”, “we played”', whyAr: 'الماضي البسيط بدون was: I went', fix: (m) => m.replace(/^(was|were)\s+/i, '') },
    ],
  },
  { // 10
    title: 'We had a great time!', language: 'Past Simple regular and irregular; questions with did; negatives with didn’t; ago', vocabulary: 'have / do / go, weekend activities, time expressions (last night, on Monday), sports and leisure, seasons',
    bookWriting: 'p. 78: write about your last holiday (Last … I went …, We stayed …, The food was …, We had a great time).',
    organisation: 'Tell the events in time order (first, then, in the evening, last …); end with how it was.',
    targets: [{ label: 'past verbs', re: /\b(went|saw|came|had|made|bought|got|ate|met|took|left|\w+ed)\b/i }, { label: 'did / didn’t', re: /\b(did|didn't)\b/i }, { label: 'time expressions (last …, ago)', re: /\b(last (week|weekend|year|month|night|summer|holiday|friday|saturday)|ago|yesterday)\b/i }],
    studentFocus: { en: 'I used past verbs (went, played), didn’t and last … / ago.', ar: 'استخدمت الأفعال الماضية و didn’t و last / ago.' },
    errors: [
      { re: new RegExp(`\\b(didn't|did not|did (?:you|he|she|they|we|I))\\s+(went|saw|ate|bought|had|made|took|came|drank|swam|met|got|played|visited|watched|stayed|travelled)\\b`, 'gi'), why: 'After did / didn’t use the base verb: “didn’t go”', whyAr: 'بعد did / didn’t نستخدم المصدر: didn’t go', fix: (m) => m.replace(/(\w+)$/, (v) => ({ went: 'go', saw: 'see', ate: 'eat', bought: 'buy', had: 'have', made: 'make', took: 'take', came: 'come', drank: 'drink', swam: 'swim', met: 'meet', got: 'get' } as Record<string, string>)[v.toLowerCase()] ?? v.replace(/ed$/, '').replace(/ll$/, 'l')) },
      { re: /\b(goed|eated|buyed|seed|haved|maked|taked|comed|drinked|swimmed|meeted|getted|leaved|sleeped|writed|drived|flyed|teached|thinked|catched)\b/gi, why: 'Irregular past: went, ate, bought, saw …', whyAr: 'ماضٍ شاذ: went, ate, bought', fix: (m) => ({ goed: 'went', eated: 'ate', buyed: 'bought', seed: 'saw', haved: 'had', maked: 'made', taked: 'took', comed: 'came', drinked: 'drank', swimmed: 'swam', meeted: 'met', getted: 'got', leaved: 'left', sleeped: 'slept', writed: 'wrote', drived: 'drove', flyed: 'flew', teached: 'taught', thinked: 'thought', catched: 'caught' } as Record<string, string>)[m.toLowerCase()] },
    ],
  },
  { // 11
    title: 'I can do that!', language: 'can / can’t + verb; adverbs (well, a little bit, fluently); requests and offers (Can you …? Can I …?)', vocabulary: 'verbs (draw, run, drive, use a computer), verb + noun, the Internet, opposite adjectives (dangerous / safe)',
    organisation: 'Group what you can do and what you can’t do; but / because where they fit.',
    targets: [{ label: 'can / can’t + verb', re: /\b(can|can't|cannot)\s+[a-z]+/i }, { label: 'well / a little', re: /\b(well|a little( bit)?|fluently|at all|very well)\b/i }],
    studentFocus: { en: 'I used can / can’t + verb (I can swim) and well / a little.', ar: 'استخدمت can / can’t مع الفعل و well / a little.' },
    errors: [
      { re: /\b(can|can't|cannot)\s+to\s+[a-z]+/gi, why: 'No “to” after can: “I can swim”', whyAr: 'لا نضع to بعد can', fix: (m) => m.replace(/\s+to\s+/i, ' ') },
      { re: /\b(can|can't|cannot)\s+(swims|plays|drives|speaks|cooks|runs|draws|uses|reads|writes|swimming|playing|driving|speaking|cooking|running|drawing|reading)\b/gi, why: 'Base verb after can: “he can swim”', whyAr: 'بعد can نستخدم المصدر', fix: (m) => m.replace(/(\w+?)(s|ing)$/i, '$1').replace(/swimm$/i, 'swim').replace(/runn$/i, 'run').replace(/driv$/i, 'drive').replace(/writ$/i, 'write') },
    ],
  },
  { // 12
    title: 'Please and thank you', language: 'I’d like …; some / any; like and would like (I like going … / I’d like to go …)', vocabulary: 'shopping, food, in a restaurant (menu, starter, dessert), signs',
    organisation: 'Group your requests or food details; in a conversation, greet, ask, then thank.',
    targets: [{ label: 'I’d like / would like', re: /\b(I'd like|I would like|would you like)\b/i }, { label: 'some / any', re: /\b(some|any)\b/i }],
    studentFocus: { en: 'I used I’d like … / Would you like …? and some / any.', ar: 'استخدمت I’d like و Would you like و some / any.' },
    errors: [
      { re: /\b(I'd like|I would like|would you like|we'd like)\s+(go|eat|drink|buy|have|visit|play|see|watch|travel|study|try)\b/gi, why: '“I’d like to go …” (would like + to)', whyAr: 'نقول I’d like to go', fix: (m) => m.replace(/like\s+/i, 'like to ') },
      { re: /\b(don't|doesn't|didn't) (have|want|need|eat|buy) some\b/gi, why: 'Negative: “any” (“I don’t have any …”)', whyAr: 'في النفي نستخدم any', fix: (m) => m.replace(/some$/i, 'any') },
    ],
  },
  { // 13
    title: 'Here and now', language: 'Present Continuous (I’m wearing, he’s working); Present Simple and Present Continuous', vocabulary: 'colours, clothes, opposite verbs (buy / sell), transport',
    organisation: 'Keep what is happening now apart from what usually happens (now / today vs every day / usually).',
    targets: [{ label: 'Present Continuous', re: /\b(am|is|are|'m|'s|'re)\s+[a-z]+ing\b/i }, { label: 'now / today / at the moment', re: /\b(now|today|at the moment|right now)\b/i }],
    studentFocus: { en: 'I used I’m …ing for now and the Present Simple for every day.', ar: 'استخدمت am / is / are + ing للآن والمضارع البسيط للعادات.' },
    errors: [
      { re: /\b(every day|usually|always|often|never|every (?:morning|week|weekend|friday))\b[^.!?]*\b(am|is|are|'m)\s+[a-z]+ing\b/gi, why: 'Every day / usually: Present Simple (“I usually wear …”)', whyAr: 'مع every day / usually نستخدم المضارع البسيط' },
    ],
  },
  { // 14
    title: 'It’s time to go!', language: 'future plans (going to; Present Continuous for plans); revision of question words and past, present and future tenses', vocabulary: 'transport, words that go together, life events',
    bookWriting: 'p. 109: a mini autobiography (I was born in …, I grew up in …, I’m studying …, I want to be …, I’m going to …).',
    organisation: 'Order life events or plans clearly (past → now → future); so / because where they fit.',
    targets: [{ label: 'going to', re: /\b(am|is|are|'m|'s|'re) going to\b/i }, { label: 'future time (next …, this year)', re: /\b(next (week|year|month|summer|holiday)|this (year|summer|weekend)|tomorrow|in the future)\b/i }],
    studentFocus: { en: 'I used I’m going to + verb and next … / this year.', ar: 'استخدمت I’m going to مع الفعل و next / this year.' },
    errors: [
      { re: /\b(I|we|they|you|he|she)\s+going to\b/gi, why: '“I’m going to …” (am / is / are + going to)', whyAr: 'نقول I’m going to', fix: (m) => m.replace(/^(\w+)\s+/i, (_, p: string) => `${p} ${/^i$/i.test(p) ? 'am' : /^(he|she)$/i.test(p) ? 'is' : 'are'} `) },
      { re: new RegExp(`\\bgoing to\\s+(went|studied|visited|played|saw|bought|travelled|stayed|${PAST_BASE.split('|').map((v) => `${v}ing`).join('|')})\\b`, 'gi'), why: 'After going to use the base verb: “going to study”', whyAr: 'بعد going to نستخدم المصدر', fix: (m) => m.replace(/(\w+)$/, (v) => ({ went: 'go', saw: 'see', bought: 'buy', studied: 'study', visited: 'visit', played: 'play', travelled: 'travel', stayed: 'stay' } as Record<string, string>)[v.toLowerCase()] ?? v.replace(/ing$/i, '').replace(/(\w)\1$/, '$1')) },
    ],
  },
];

export function headwayWritingGuide(unit: number | undefined): HeadwayWritingGuide | undefined {
  if (unit === undefined || !Number.isInteger(unit)) return undefined;
  const g = UNITS[unit - 1];
  return g && { ...g, unit, linkers: studiedLinkers(unit) };
}

/** All unit rules met by the end of a unit (earlier units' language stays in use). */
export function unitErrorRules(unit: number): { rule: UnitRule; unit: number }[] {
  return UNITS.slice(0, unit).flatMap((g, i) => g.errors.map((rule) => ({ rule, unit: i + 1 })));
}
