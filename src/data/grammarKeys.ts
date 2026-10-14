// Grammar points tracked for personalised revision.
// `deck` points to the matching A1 Grammar deck (tools/grammar-deck/content/grammarN.json).

export interface GrammarKey { key: string; label: string; ar: string; deck?: string; module: number }

export const GRAMMAR_KEYS: GrammarKey[] = [
  { key: 'be', label: 'am / is / are', ar: 'فعل الكون', deck: 'g3', module: 1 },
  { key: 'pronouns', label: 'I / you / he / she / we / they', ar: 'الضمائر', deck: 'g1', module: 2 },
  { key: 'possessive-adj', label: 'my / your / his / her', ar: 'صفات الملكية', deck: 'g5', module: 1 },
  { key: 'a-an', label: 'a / an', ar: 'أدوات النكرة', deck: 'g10', module: 1 },
  { key: 'wh-questions', label: 'What? Where? How old?', ar: 'أسئلة الاستفهام', deck: 'g2', module: 2 },
  { key: 'numbers', label: 'Numbers', ar: 'الأرقام', module: 1 },
  { key: 'spelling', label: 'Spelling & the alphabet', ar: 'التهجئة', module: 4 },
  { key: 'plurals', label: 'Plural nouns', ar: 'الجمع', deck: 'g6', module: 1 },
  { key: 'this-that', label: 'this / that / these / those', ar: 'أسماء الإشارة', module: 7 },
  { key: 'have-has', label: 'have / has', ar: 'يملك', deck: 'g5', module: 4 },
  { key: 'possessive-s', label: "Possessive 's", ar: 'الملكية', deck: 'g5', module: 4 },
  { key: 'frequency', label: 'always / usually / never', ar: 'ظروف التكرار', module: 6 },
  { key: 'adjectives', label: 'Adjectives: a fast train', ar: 'الصفات', module: 7 },
  { key: 'object-pronouns', label: 'me / him / her / us / them', ar: 'ضمائر المفعول به', module: 7 },
  { key: 'present-simple', label: 'Present simple', ar: 'المضارع البسيط', deck: 'g4', module: 5 },
  { key: 'countable', label: 'Countable & uncountable', ar: 'المعدود وغير المعدود', deck: 'g6', module: 8 },
  { key: 'there-is', label: 'there is / there are', ar: 'يوجد', deck: 'g6', module: 8 },
  { key: 'prepositions', label: 'in / on / under / next to', ar: 'حروف الجر', deck: 'g7', module: 8 },
  { key: 'can', label: "can / can't", ar: 'يستطيع', module: 7 },
  { key: 'present-continuous', label: 'Present continuous', ar: 'المضارع المستمر', module: 8 },
  { key: 'past-simple', label: 'Past simple', ar: 'الماضي البسيط', deck: 'g9', module: 8 },
  { key: 'was-were', label: 'was / were', ar: 'الماضي من فعل الكون', deck: 'g8', module: 8 },
];

const byKey = new Map(GRAMMAR_KEYS.map((g) => [g.key, g]));
export const grammarKey = (key: string) => byKey.get(key);
export const grammarLabel = (key: string) => byKey.get(key)?.label ?? key;
