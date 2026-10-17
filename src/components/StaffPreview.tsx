// Teacher / Admin / Observer preview tools (Phase 2): open any step without doing it, show the answers,
// show a step to the class on the projector, view the app as a student, and assign from the preview.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize, Minimize, Presentation, Send, UserRound, X } from 'lucide-react';
import type { Activity, Assignment } from '../types';
import { useApp } from '../store';
import { classPermissions, onlineEnabled } from '../lib/online';
import { addDays, today } from '../lib/date';
import { KIND_LABEL } from './activities/ActivityView';
import { AnswerKey } from './activities/AnswerKey';
import { Button } from './ui';
import { LogoMark } from './Logo';
import { ask } from './Confirm';

/** Answers start on; each teacher's choice is remembered on their device. */
export function useShowAnswers(): [boolean, (v: boolean) => void] {
  const { data, update } = useApp();
  return [data.settings.showAnswers ?? true, (v) => update((d) => { d.settings.showAnswers = v; })];
}

/** Observers may look but not change anything (online roles); offline copies have no roles. */
export function useCanEdit() {
  const { data, cls, isTeacher } = useApp();
  if (!isTeacher) return false;
  if (!onlineEnabled) return true;
  return classPermissions(data.session.staff, cls?.code).canMark;
}

export function useViewAsStudent() {
  const { update } = useApp();
  return (on: boolean) => update((d) => { d.session.viewAsStudent = on; });
}

/** Assign something to the whole class from where the teacher is looking at it. */
export function useAssignHere() {
  const { cls, update, toast, data } = useApp();
  return async (kind: Assignment['kind'], ref: string, title: string) => {
    if (!cls) return;
    if (data.assignments.some((a) => a.classId === cls.id && a.ref === ref && a.done.length === 0)) {
      if (!(await ask(`“${title}” is already assigned to ${cls.name}. Assign it again?`, 'Assign again'))) return;
    } else if (!(await ask(`Assign “${title}” to ${cls.name}, due ${addDays(today(), 3)}?`, 'Assign'))) return;
    update((d) => { d.assignments.unshift({ id: `as-${Date.now()}`, classId: cls.id, kind, ref, title, to: 'class', due: addDays(today(), 3), createdAt: new Date().toISOString(), done: [] }); });
    toast(onlineEnabled ? 'Assigned on this device. Learners using this device see it on My Learning.' : 'Task assigned. Students see it on My Learning.', 'good');
  };
}

/** The bar above a lesson in teacher preview. */
export function PreviewBar({ activities, index, onJump, onPresent, onAssign }: {
  activities: Activity[]; index: number; onJump: (i: number) => void; onPresent: () => void; onAssign?: () => void;
}) {
  const [show, setShow] = useShowAnswers();
  const viewAs = useViewAsStudent();
  return (
    <div className="mb-4 rounded-3xl border-2 border-navy-100 bg-white p-3 shadow-card" role="region" aria-label="Teacher preview tools">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold uppercase tracking-wide text-navy-400">Teacher preview</span>
        <Button size="sm" variant="soft" disabled={index === 0} onClick={() => onJump(index - 1)} aria-label="Previous step"><ChevronLeft size={16} /></Button>
        <Button size="sm" variant="soft" disabled={index >= activities.length - 1} onClick={() => onJump(index + 1)}>Skip <ChevronRight size={16} /></Button>
        <Button size="sm" variant={show ? 'success' : 'outline'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <Eye size={16} /> : <EyeOff size={16} />} {show ? 'Answers shown' : 'Show answers'}</Button>
        <Button size="sm" variant="outline" onClick={onPresent}><Presentation size={16} /> Show to class</Button>
        <Button size="sm" variant="outline" onClick={() => viewAs(true)}><UserRound size={16} /> View as student</Button>
        {onAssign && <Button size="sm" variant="outline" onClick={onAssign}><Send size={16} /> Assign</Button>}
      </div>
      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Steps in this lesson">
        {activities.map((a, k) => (
          <li key={a.id}>
            <button type="button" onClick={() => onJump(k)} aria-current={k === index ? 'step' : undefined} title={`${KIND_LABEL[a.kind]}: ${a.title}`}
              className={`min-h-[36px] rounded-xl border-2 px-2.5 text-sm font-semibold ${k === index ? 'border-navy bg-navy text-white' : 'border-navy-100 bg-white text-navy hover:border-navy-300'}`}>
              {k + 1}. {KIND_LABEL[a.kind]}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full-screen projector view of one step; answers stay hidden until the teacher reveals them. */
export function PresentView({ activity, index, total, onJump, onClose, children }: {
  activity: Activity; index: number; total: number; onJump: (i: number) => void; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => { setReveal(false); }, [activity.id]);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      if ((e.target as HTMLElement)?.closest('input,textarea')) return;
      if (e.key === 'ArrowRight' && index < total - 1) onJump(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onJump(index - 1);
    };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('fullscreenchange', on); window.removeEventListener('keydown', key); };
  }, [index, total, onJump, onClose]);
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen?.())?.catch?.(() => undefined);
  return (
    <div ref={ref} className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label="Show to class">
      <div className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
        <LogoMark size={36} />
        <span className="flex-1 truncate text-lg font-bold">{activity.title}</span>
        <span className="font-bold">{index + 1}/{total}</span>
        <Button size="sm" variant="soft" disabled={index === 0} onClick={() => onJump(index - 1)} aria-label="Previous step"><ChevronLeft size={18} /></Button>
        <Button size="sm" variant="soft" disabled={index >= total - 1} onClick={() => onJump(index + 1)} aria-label="Next step"><ChevronRight size={18} /></Button>
        <Button size="sm" variant={reveal ? 'success' : 'soft'} onClick={() => setReveal(!reveal)}><Eye size={18} /> {reveal ? 'Hide answers' : 'Reveal answers'}</Button>
        <Button size="sm" variant="soft" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize size={18} /> : <Maximize size={18} />}</Button>
        <Button size="sm" variant="soft" onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined); onClose(); }} aria-label="Close"><X size={18} /></Button>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 p-4 text-xl sm:p-8 [&_h2]:text-3xl [&_p]:text-xl">
        <div className="rounded-3xl bg-white p-5 shadow-card sm:p-8">{children}</div>
        {reveal && <div className="mt-4"><AnswerKey activity={activity} big /></div>}
      </div>
    </div>
  );
}

/** Shown on every page while a teacher views the app as a student. */
export function ViewAsStudentBanner() {
  const { viewAsStudent } = useApp();
  const viewAs = useViewAsStudent();
  if (!viewAsStudent) return null;
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 bg-sun px-4 py-2 text-navy" role="status">
      <UserRound size={18} /> <b>You are viewing the app as a student.</b> Nothing is saved; answers are hidden.
      <Button size="sm" variant="primary" onClick={() => viewAs(false)}>Back to teacher view</Button>
    </div>
  );
}
