// "Next best lesson" engine. Rules are simple and explainable so the teacher can trust them.
import type { Assignment, Skill, Student } from '../types';
import { REVIEWS, getLesson, reviewUnits } from '../data/modules';
import { grammarKey } from '../data/grammarKeys';
import { getExam } from '../data/exams';
import { dueWords } from './srs';
import { currentModule, grammarWeaknesses, lessonDone, moduleComplete, skillPct, lastExam } from './progress';

export interface Recommendation {
  id: string;
  kind: 'assignment' | 'grammar' | 'vocab' | 'lesson' | 'review' | 'skill' | 'speaking' | 'exam';
  title: string;
  reason: string;
  reasonAr: string;
  to: string;
  priority: number;
}

const SKILL_AR: Record<Skill, string> = { vocabulary: 'المفردات', grammar: 'القواعد', reading: 'القراءة', listening: 'الاستماع', speaking: 'التحدث', writing: 'الكتابة' };

const SKILL_ROUTE: Record<Skill, { to: string; label: string; ar: string }> = {
  vocabulary: { to: '/vocabulary', label: 'Vocabulary review', ar: 'مراجعة المفردات' },
  grammar: { to: '/practice', label: 'Grammar gym', ar: 'تمارين القواعد' },
  reading: { to: '/exams', label: 'Reading practice', ar: 'تدريب القراءة' },
  listening: { to: '/speaking', label: 'Listen and repeat', ar: 'استمع وكرّر' },
  speaking: { to: '/speaking', label: 'Speaking role play', ar: 'تمثيل أدوار' },
  writing: { to: '/practice', label: 'Writing practice', ar: 'تدريب الكتابة' },
};

export function assignmentsFor(s: Student, all: Assignment[]): Assignment[] {
  return all.filter((a) => (a.to === 'class' ? a.classId === s.classId : a.to.includes(s.id)) && !a.done.includes(s.id));
}

export function assignmentRoute(a: Assignment): string {
  switch (a.kind) {
    case 'lesson': {
      const l = getLesson(a.ref);
      return l ? `/lessons/u${l.module}/${l.id}` : '/lessons';
    }
    case 'module': return `/lessons/${a.ref}`;
    case 'vocab': return `/vocabulary?topic=${encodeURIComponent(a.ref)}`;
    case 'review': return `/review/${a.ref}`;
    case 'exam': return `/exams/${a.ref}`;
    case 'grammar': return `/practice/grammar/${a.ref}`;
  }
}

export function recommend(s: Student, assignments: Assignment[] = []): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const a of assignmentsFor(s, assignments).slice(0, 2)) {
    recs.push({ id: `as-${a.id}`, kind: 'assignment', title: a.title, reason: 'Your teacher gave you this task.', reasonAr: 'هذه مهمة من معلمك.', to: assignmentRoute(a), priority: 100 });
  }

  const weak = grammarWeaknesses(s, 3)[0];
  if (weak) {
    const g = grammarKey(weak.key);
    recs.push({
      id: `gr-${weak.key}`, kind: 'grammar', title: `Grammar booster: ${g?.label ?? weak.key}`,
      reason: `You made ${weak.wrong} mistakes with ${g?.label ?? weak.key}. Let’s practise it.`,
      reasonAr: `لديك ${weak.wrong} أخطاء في ${g?.ar ?? weak.key}. لنتدرب عليها.`,
      to: g?.deck ? `/practice/grammar/${g.deck}?key=${weak.key}` : '/practice', priority: 80,
    });
  }

  if (s.practiseAgain.length >= 5) {
    recs.push({ id: 'pa', kind: 'vocab', title: `Practise again: ${s.practiseAgain.length} words`, reason: 'These words are difficult for you. Review them today.', reasonAr: 'هذه الكلمات صعبة عليك. راجعها اليوم.', to: '/vocabulary?list=again', priority: 70 });
  }
  const due = dueWords(s);
  if (due.length >= 8) {
    recs.push({ id: 'due', kind: 'vocab', title: `Word review: ${due.length} words are ready`, reason: 'Review now so you don’t forget them.', reasonAr: 'راجعها الآن حتى لا تنساها.', to: '/vocabulary?list=due', priority: 60 });
  }

  const ex = lastExam(s);
  if (ex) {
    const weakest = (Object.entries(ex.bySkill) as [Skill, { score: number; total: number }][])
      .map(([k, v]) => ({ k, p: v.score / Math.max(1, v.total) }))
      .sort((a, b) => a.p - b.p)[0];
    if (weakest && weakest.p < 0.5) {
      const r = SKILL_ROUTE[weakest.k];
      recs.push({ id: `sk-${weakest.k}`, kind: 'skill', title: r.label, reason: `Your last exam shows ${weakest.k} needs practice.`, reasonAr: `اختبارك الأخير يُظهر أنك تحتاج إلى التدرب على ${SKILL_AR[weakest.k]}.`, to: r.to, priority: 55 });
    }
  }

  const sp = skillPct(s, 'speaking');
  if (s.speaking.tasks < 2 || (sp !== null && sp < 50)) {
    recs.push({ id: 'speak', kind: 'speaking', title: 'Brave speaker: one role play', reason: 'Speaking every day builds confidence.', reasonAr: 'التحدث كل يوم يبني الثقة.', to: '/speaking', priority: 40 });
  }

  for (let r = 0; r < REVIEWS.length; r++) {
    const mods = reviewUnits(r);
    if (mods.every((m) => moduleComplete(s, m)) && !lessonDone(s, REVIEWS[r].id)) {
      recs.push({ id: `rev-${r}`, kind: 'review', title: REVIEWS[r].title, reason: 'You finished two units. Time to review!', reasonAr: 'أنهيت وحدتين. وقت المراجعة!', to: `/review/${REVIEWS[r].id}`, priority: 65 });
    }
  }

  const m = currentModule(s);
  const next = m.lessons.find((l) => !lessonDone(s, l.id));
  if (next) {
    recs.push({
      id: `next-${next.id}`, kind: 'lesson', title: `Unit ${m.n}: ${m.title} — ${next.title}`,
      reason: 'This is the next lesson on your learning path.', reasonAr: 'هذا هو الدرس التالي في مسارك.',
      to: `/lessons/${m.id}/${next.id}`, priority: 50,
    });
  }

  if (!s.exams.some((e) => e.examId === 'diagnostic-1') && m.n >= 3 && getExam('diagnostic-1')) {
    recs.push({ id: 'diag', kind: 'exam', title: 'Starting Point Check', reason: 'A short test to find your strong skills.', reasonAr: 'اختبار قصير لمعرفة نقاط قوتك.', to: '/exams/diagnostic-1', priority: 45 });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

/** One friendly line for the dashboard. */
export function todayMessage(s: Student, recs: Recommendation[]): { en: string; ar: string } {
  const top = recs[0];
  if (!top) return { en: 'Today, let’s review your words and speak a little English.', ar: 'اليوم لنراجع الكلمات ونتحدث قليلاً.' };
  const m = currentModule(s);
  switch (top.kind) {
    case 'grammar': return { en: `Today, let’s practise ${top.title.replace('Grammar booster: ', '')}.`, ar: 'اليوم لنتدرب على القواعد.' };
    case 'vocab': return { en: 'Today, let’s practise your difficult words.', ar: 'اليوم لنتدرب على الكلمات الصعبة.' };
    case 'speaking': return { en: `Today, let’s practise ${m.title.toLowerCase()} and speaking.`, ar: 'اليوم لنتدرب على التحدث.' };
    case 'assignment': return { en: 'Today, start with your teacher’s task.', ar: 'اليوم ابدأ بمهمة معلمك.' };
    default: return { en: `Today, let’s practise ${m.title.replace(/!$/, '').toLowerCase()} and speaking.`, ar: `اليوم لنتدرب على وحدة «${m.titleAr.replace(/[!.؟?]+$/, '')}».` };
  }
}

/** Suggested question type for the classroom picker. */
export function suggestQuestion(s: Student): string {
  const weak = grammarWeaknesses(s, 2)[0];
  if (weak) return `Grammar question: ${grammarKey(weak.key)?.label ?? weak.key}`;
  if (s.practiseAgain.length >= 3) return `Vocabulary: “${s.practiseAgain[0].replace(/-/g, ' ')}”`;
  const sp = skillPct(s, 'speaking');
  if (sp === null || sp < 60 || s.speaking.tasks < 2) return 'Speaking: answer in a full sentence';
  const lowest = (['reading', 'listening', 'writing'] as Skill[]).map((k) => ({ k, p: skillPct(s, k) ?? 0 })).sort((a, b) => a.p - b.p)[0];
  return `${lowest.k[0].toUpperCase()}${lowest.k.slice(1)} question`;
}
