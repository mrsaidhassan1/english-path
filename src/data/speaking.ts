// Speaking area: beginner role plays and A1 Speaking Part 1 questions.
import type { Dialogue, SourceRef } from '../types';
import { getDialogue } from './content';

export interface RolePlay {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  module: number;
  dialogue: Dialogue;
  useful: [string, string][];
}

function fromIatc(id: string): Dialogue {
  const d = getDialogue(id)!;
  return { id: d.id, title: d.title, setting: d.setting, lines: d.lines, src: d.src };
}

export const ROLE_PLAYS: RolePlay[] = [
  {
    id: 'rp-meet', title: 'Meeting someone', titleAr: 'التعرّف على شخص', icon: '🤝', module: 1,
    dialogue: fromIatc('dlg-s1d1'),
    useful: [['This is my friend, …', 'هذا صديقي …'], ['Nice to meet you.', 'تشرفت بمعرفتك.'], ['Nice to meet you too.', 'وأنا كذلك.']],
  },
  {
    id: 'rp-intro', title: 'Introducing yourself', titleAr: 'التعريف بنفسك', icon: '👋', module: 1,
    dialogue: fromIatc('dlg-s2d1'),
    useful: [['My name is …', 'اسمي …'], ['I am from …', 'أنا من …'], ['I am a student here.', 'أنا طالب هنا.']],
  },
  {
    id: 'rp-cafe', title: 'Ordering food or a drink', titleAr: 'طلب طعام أو مشروب', icon: '☕', module: 5,
    dialogue: {
      id: 'rp-cafe-dlg', title: 'At the College Café', setting: 'The IATC café at the break.', original: true,
      lines: [
        ['Waiter', 'Hello! What would you like?'],
        ['Student', 'Can I have a chicken **sandwich**, please?'],
        ['Waiter', 'Sure. Anything to **drink**?'],
        ['Student', 'Yes, an orange **juice**, please.'],
        ['Waiter', 'Small or large?'],
        ['Student', 'Large, please. **How much** is it?'],
        ['Waiter', 'That’s fifteen **riyals**.'],
        ['Student', 'Here you are. Thank you!'],
        ['Waiter', 'You’re welcome. Have a nice day!'],
      ],
    },
    useful: [['Can I have …, please?', 'هل يمكنني الحصول على …؟'], ['How much is it?', 'كم السعر؟'], ['Here you are.', 'تفضل.']],
  },
  {
    id: 'rp-family', title: 'Talking about family', titleAr: 'الحديث عن العائلة', icon: '👨‍👩‍👦', module: 4,
    dialogue: fromIatc('dlg-s4d1'),
    useful: [['This is my father.', 'هذا أبي.'], ['He is a …', 'هو …'], ['Where do they live?', 'أين يسكنون؟']],
  },
  {
    id: 'rp-time', title: 'Asking the time', titleAr: 'السؤال عن الوقت', icon: '⏰', module: 6,
    dialogue: {
      id: 'rp-time-dlg', title: 'What Time Is It?', setting: 'Outside Building 3 at IATC.', original: true,
      lines: [
        ['Nawaf', 'Excuse me. What **time** is it, please?'],
        ['Omar', 'It’s **half past** one.'],
        ['Nawaf', 'Oh no! My lesson **starts** at half past one.'],
        ['Omar', 'Which room are you in?'],
        ['Nawaf', 'Room 212. When is the **break**?'],
        ['Omar', 'At ten **past** three.'],
        ['Nawaf', 'And what time do we **finish**?'],
        ['Omar', 'At eight **o’clock**. Hurry up!'],
        ['Nawaf', 'Thanks a lot. See you later!'],
      ],
    },
    useful: [['What time is it?', 'كم الساعة؟'], ['It’s half past one.', 'الساعة الواحدة والنصف.'], ['It’s eight o’clock.', 'الساعة الثامنة.']],
  },
  {
    id: 'rp-directions', title: 'Asking for directions', titleAr: 'السؤال عن الطريق', icon: '🧭', module: 8,
    dialogue: fromIatc('dlg-s8d4'),
    useful: [['Is there a … near here?', 'هل يوجد … قريب من هنا؟'], ['Go straight. Turn right.', 'امشِ مستقيماً ثم انعطف يميناً.'], ['It’s next to the …', 'إنه بجانب …']],
  },
  {
    id: 'rp-hobbies', title: 'Talking about hobbies', titleAr: 'الحديث عن الهوايات', icon: '⚽', module: 7,
    dialogue: {
      id: 'rp-hobbies-dlg', title: 'What Do You Do in Your Free Time?', setting: 'The college gym after class.', original: true,
      lines: [
        ['Turki', 'What do you do in your **free time**?'],
        ['Badr', 'I play **football** with my friends. And you?'],
        ['Turki', 'I like **swimming**. I go to the pool on Friday.'],
        ['Badr', 'Can you swim fast?'],
        ['Turki', 'Yes, I can! Can you swim?'],
        ['Badr', 'No, I can’t. But I can **ride** a horse.'],
        ['Turki', 'Great! My uncle has **falcons**. I like them a lot.'],
        ['Badr', 'Let’s go to the desert this weekend!'],
        ['Turki', 'Good idea!'],
      ],
    },
    useful: [['In my free time, I …', 'في وقت فراغي …'], ['I can … / I can’t …', 'أستطيع … / لا أستطيع …'], ['Let’s go …!', 'هيا نذهب …']],
  },
  {
    id: 'rp-routine', title: 'Talking about daily routine', titleAr: 'الحديث عن الروتين اليومي', icon: '📅', module: 6,
    dialogue: fromIatc('dlg-s6d2'),
    useful: [['I usually get up at …', 'عادةً أستيقظ الساعة …'], ['I never …', 'أنا لا … أبداً'], ['Do you …?', 'هل …؟']],
  },
];

// A1 Speaking Exam Part 1 (questions about you). Model answers are examples only.
const SP_SRC: SourceRef = {
  file: 'FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Speaking Exam/FND_68_A1_Speaking_Parts_1-2_Question_Bank.docx',
  label: 'A1 Speaking Exam — Part 1 question bank',
  doc: 'FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Speaking Exam/FND_68_A1_Speaking_Parts_1-2_Question_Bank.pdf',
};

export interface SpeakingQuestion { q: string; ar: string; model: string; more?: string; tip?: string; module: number }

export const SPEAKING_PART1: SpeakingQuestion[] = [
  { q: 'What is your first name?', ar: 'ما اسمك الأول؟', model: 'My first name is Ahmed.', module: 1 },
  { q: 'How do you spell it?', ar: 'كيف تتهجّى اسمك؟', model: 'A - H - M - E - D.', tip: 'Say each letter slowly.', module: 4 },
  { q: 'What is your surname?', ar: 'ما اسم عائلتك؟', model: 'My surname is Alqahtani.', module: 3 },
  { q: 'Where are you from?', ar: 'من أين أنت؟', model: 'I’m from Riyadh.', more: 'It is the capital of Saudi Arabia.', module: 2 },
  { q: 'Are you from Saudi Arabia?', ar: 'هل أنت من المملكة العربية السعودية؟', model: 'Yes, I am.', more: 'I’m Saudi.', tip: 'Say “Yes, I am.” Never “Yes, I’m.”', module: 2 },
  { q: 'How old are you?', ar: 'كم عمرك؟', model: 'I’m 19 years old.', tip: 'Not “I have 19 years.”', module: 2 },
  { q: 'Where do you live?', ar: 'أين تسكن؟', model: 'I live in Riyadh.', more: 'I live with my family.', module: 3 },
  { q: 'Do you live in a house or an apartment?', ar: 'هل تسكن في منزل أم في شقة؟', model: 'I live in a house.', more: 'It has two floors.', tip: 'An “or” question: choose one answer.', module: 8 },
  { q: 'Do you have brothers or sisters?', ar: 'هل لديك إخوة أو أخوات؟', model: 'Yes, I do. I have two brothers and one sister.', module: 4 },
  { q: 'Are you a student or do you work?', ar: 'هل أنت طالب أم تعمل؟', model: 'I’m a student. I study English at IATC.', more: 'I want to work in aircraft maintenance.', module: 3 },
  { q: 'What do you do in your free time?', ar: 'ماذا تفعل في وقت فراغك؟', model: 'I play football with my friends.', module: 7 },
  { q: 'What did you do last weekend?', ar: 'ماذا فعلت في نهاية الأسبوع الماضي؟', model: 'I visited my uncle. We had dinner together.', tip: 'Use the past: went, had, visited.', module: 10 },
];
export const SPEAKING_SRC = SP_SRC;
