// Friendly feedback lines. Never harsh.
import { pick } from './rng';

const GOOD = ['Great job!', 'Well done!', 'Excellent!', 'You got it!', 'Super!', 'Perfect!', 'Brilliant!'];
const GOOD_AR = ['أحسنت!', 'عمل رائع!', 'ممتاز!'];
const TRY = ['Nice try! Look again.', 'Almost! Try once more.', 'Good effort. You can do it!', 'Not yet. Keep going!'];
const TRY_AR = ['محاولة جيدة! حاول مرة أخرى.', 'اقتربت! حاول مجدداً.'];

export const praise = () => pick(GOOD);
export const praiseAr = () => pick(GOOD_AR);
export const encourage = () => pick(TRY);
export const encourageAr = () => pick(TRY_AR);

export function summaryLine(score: number, total: number): { en: string; ar: string; tone: 'great' | 'good' | 'keep' } {
  const p = total ? score / total : 0;
  if (p >= 0.9) return { en: 'Amazing work! You are ready for the next step.', ar: 'عمل مذهل! أنت جاهز للخطوة التالية.', tone: 'great' };
  if (p >= 0.6) return { en: 'Good work! Practise the red ones again.', ar: 'عمل جيد! تدرّب على الأخطاء مرة أخرى.', tone: 'good' };
  return { en: 'Good start! Every mistake helps you learn. Try again.', ar: 'بداية جيدة! كل خطأ يساعدك على التعلم.', tone: 'keep' };
}
