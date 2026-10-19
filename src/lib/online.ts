// Online class store (Supabase). Optional: without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the app
// works exactly as before, saving on the device only. Database setup: supabase/setup.sql.
//
//   * Students: the phone signs in anonymously (no password) and joins a class with its code.
//     Their progress and writing are sent online; they can read only their own rows.
//   * Teacher: signs in with email + password in Teacher Dashboard → Online class, loads the
//     whole class and saves writing marks online.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StaffAccess, Student, WritingSubmission } from '../types';
import type { WritingMarks } from '../data/writingRubric';

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** True when this build is connected to an online class store. */
export const onlineEnabled = !!(URL && KEY);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!onlineEnabled) throw new Error('Online class store is not set up.');
  client ??= createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sh-english-path/auth' } });
  return client;
}

// ------------------------------------------------------------------ rows
export interface StudentRow { id: string; class_code: string; first_name: string; last_name: string | null; progress: Partial<Student>; updated_at: string }
export interface WritingRow {
  id: string; student_id: string; class_code: string; task_title: string | null; prompt: string | null; bullets: string[]; body: string; words: number | null;
  estimate: WritingMarks | null; marks: WritingMarks | null; teacher_score: number | null; teacher_note: string | null; source: string | null; created_at: string;
}

/** The learner's own progress, without teacher-only fields or photos. */
export function progressOf(s: Student): Partial<Student> {
  return {
    avatar: s.avatar.kind === 'photo' ? { kind: 'monster', seed: s.avatar.seed } : s.avatar,
    goal: s.goal, interests: s.interests, lessons: s.lessons, skillStats: s.skillStats, grammarStats: s.grammarStats,
    vocab: s.vocab, practiseAgain: s.practiseAgain, speaking: s.speaking, exams: s.exams, streak: s.streak,
    activeDays: s.activeDays, badges: s.badges, log: s.log.slice(0, 80),
  };
}

// ------------------------------------------------------------------ student side
/** Sign this phone in (anonymously, once) and join the class. Returns the online id. */
export async function joinOnline(code: string, firstName: string, lastName?: string): Promise<string> {
  const c = sb();
  let { data: { session } } = await c.auth.getSession();
  if (!session) {
    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  const { error } = await c.rpc('join_class', { p_code: code, p_first: firstName, p_last: lastName ?? null });
  if (error) throw error;
  return session!.user.id;
}

/** An open class's name, for a code this phone does not know yet (null = no open class with that code). */
export async function classInfo(code: string): Promise<{ code: string; name: string } | null> {
  const { data, error } = await sb().rpc('class_info', { p_code: code });
  if (error) throw error;
  return (data as { code: string; name: string } | null) ?? null;
}

/** The online id of this phone's learner, if it has joined before. */
export async function myOnlineId(): Promise<string | null> {
  if (!onlineEnabled) return null;
  const { data } = await sb().auth.getSession();
  return data.session?.user.is_anonymous ? data.session.user.id : null;
}

export async function pushProgress(s: Student): Promise<void> {
  const { error } = await sb().from('students').update({ progress: progressOf(s), updated_at: new Date().toISOString() }).eq('id', s.onlineId!);
  if (error) throw error;
}

export async function pushWriting(w: WritingSubmission, onlineId: string, classCode: string): Promise<void> {
  const { error } = await sb().from('writing').insert({
    id: w.id, student_id: onlineId, class_code: classCode, task_title: w.taskTitle, prompt: w.prompt, bullets: w.bullets,
    body: w.text.slice(0, 4000), words: w.words, estimate: w.estimate ?? null, source: w.source, created_at: w.createdAt,
  });
  if (error && error.code !== '23505') throw error; // 23505 = already sent
}

/** The learner's writing that the teacher has marked. */
export async function fetchMyMarks(): Promise<WritingRow[]> {
  const { data, error } = await sb().from('writing').select('*').not('marks', 'is', null);
  if (error) throw error;
  return (data ?? []) as WritingRow[];
}

// ------------------------------------------------------------------ teacher side
export async function teacherSignIn(email: string, password: string): Promise<void> {
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
export async function teacherSignOut(): Promise<void> { await sb().auth.signOut(); }

/**
 * This signed-in staff member's role and classes (supabase/phase1_roles.sql → my_access()).
 * null = not signed in, not staff, or suspended. Older databases without the roles script fall back to
 * "teacher of the classes this login can read".
 */
export async function fetchMyAccess(): Promise<StaffAccess | null> {
  if (!onlineEnabled) return null;
  const c = sb();
  const { data: { session } } = await c.auth.getSession();
  if (!session || session.user.is_anonymous) return null;
  const email = session.user.email ?? '';
  const { data, error } = await c.rpc('my_access');
  if (error) {
    if (error.code !== 'PGRST202' && !/my_access/.test(error.message)) throw error;
    const { data: cls, error: e2 } = await c.from('classes').select('code, name');
    if (e2) throw e2;
    return cls?.length ? { email, role: 'teacher', classes: cls.map((x) => ({ code: x.code as string, name: x.name as string, role: 'owner' as const })), checkedAt: new Date().toISOString() } : null;
  }
  const a = data as { role: StaffAccess['role']; status: string; classes: StaffAccess['classes'] } | null;
  if (!a || a.status !== 'active') return null;
  return { email, role: a.role, classes: a.classes ?? [], checkedAt: new Date().toISOString() };
}

/** Sign in as staff: the password must be right AND the login must have staff access. */
export async function staffSignIn(email: string, password: string): Promise<StaffAccess> {
  await teacherSignIn(email, password);
  const access = await fetchMyAccess();
  if (!access) {
    await teacherSignOut();
    throw new Error('not a staff account');
  }
  return access;
}

/** What this person may do in a class. */
export function classPermissions(access: StaffAccess | undefined, classCode: string | undefined) {
  const role = access?.role === 'admin' ? 'admin' : access?.classes.find((c) => c.code === classCode)?.role;
  return { role, canRead: !!role, canMark: role === 'admin' || role === 'owner' || role === 'teacher', readOnly: role === 'observer' };
}
export async function teacherEmail(): Promise<string | null> {
  if (!onlineEnabled) return null;
  const { data } = await sb().auth.getSession();
  return data.session && !data.session.user.is_anonymous ? data.session.user.email ?? null : null;
}
/** Send the teacher a "set your password" email (first sign-in or forgotten password). */
export async function teacherResetPassword(email: string): Promise<void> {
  const { error } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname });
  if (error) throw error;
}

export async function fetchClass(code: string): Promise<{ students: StudentRow[]; writing: WritingRow[] }> {
  const c = sb();
  const [st, wr] = await Promise.all([
    c.from('students').select('*').eq('class_code', code),
    c.from('writing').select('*').eq('class_code', code).order('created_at', { ascending: false }),
  ]);
  if (st.error) throw st.error;
  if (wr.error) throw wr.error;
  return { students: (st.data ?? []) as StudentRow[], writing: (wr.data ?? []) as WritingRow[] };
}

export async function saveMarkOnline(id: string, marks: WritingMarks, total: number, note: string): Promise<void> {
  const { error } = await sb().from('writing').update({ marks, teacher_score: total, teacher_note: note, marked_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ------------------------------------------------------------------ Staff tab (Admin; supabase/phase3_staff.sql + functions/staff-admin)
export interface StaffMember {
  user_id: string; email: string; role: StaffAccess['role']; status: 'active' | 'suspended'; created_at: string; last_sign_in_at: string | null;
  classes: { code: string; name: string; role: 'owner' | 'teacher' | 'observer' }[];
}
export interface OnlineClassRow { code: string; name: string; allow_join: boolean }

export async function staffList(): Promise<StaffMember[]> {
  const { data, error } = await sb().rpc('staff_list');
  if (error) throw error;
  return (data ?? []) as StaffMember[];
}
export async function staffSet(userId: string, change: { role?: StaffAccess['role']; status?: 'active' | 'suspended' }): Promise<void> {
  const { error } = await sb().rpc('staff_set', { p_user: userId, p_role: change.role ?? null, p_status: change.status ?? null });
  if (error) throw error;
}
export async function staffRemove(userId: string): Promise<void> {
  const { error } = await sb().rpc('staff_remove', { p_user: userId });
  if (error) throw error;
}
/** Put a staff member in a class (or change their role there); null removes them from it. */
export async function classStaffSet(userId: string, classCode: string, role: 'owner' | 'teacher' | 'observer' | null): Promise<void> {
  const q = sb().from('class_staff');
  const { error } = role
    ? await q.upsert({ class_code: classCode, user_id: userId, role }, { onConflict: 'class_code,user_id' })
    : await q.delete().eq('class_code', classCode).eq('user_id', userId);
  if (error) throw error;
}
export async function onlineClasses(): Promise<OnlineClassRow[]> {
  const { data, error } = await sb().from('classes').select('code, name, allow_join').order('name');
  if (error) throw error;
  return (data ?? []) as OnlineClassRow[];
}
export async function createOnlineClass(code: string, name: string): Promise<void> {
  const { error } = await sb().from('classes').insert({ code, name, allow_join: true });
  if (error) throw error;
}
async function staffAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().functions.invoke('staff-admin', { body });
  if (error) {
    // the function's own message, when there is one
    const ctx = (error as { context?: Response }).context;
    const msg = ctx && typeof ctx.json === 'function' ? await ctx.json().then((j: { error?: string }) => j.error).catch(() => undefined) : undefined;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}
/** Make (or reuse) a login and give it staff access. A new login comes back with a one-time temporary password. */
export const staffCreate = (email: string, role: StaffAccess['role'], classCode?: string, classRole: 'owner' | 'teacher' | 'observer' = 'teacher') =>
  staffAdmin<{ user_id: string; existing: boolean; password?: string }>({ action: 'create', email, role, class_code: classCode || null, class_role: classRole });
/** A new temporary password for a staff member (no email needed). */
export const staffResetPassword = (userId: string) => staffAdmin<{ password: string }>({ action: 'reset', user_id: userId });

/** A short, friendly message for an online error. */
export const onlineError = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/invalid login/i.test(m)) return 'Wrong email or password.';
  if (/not a staff account/i.test(m)) return 'This login has no teacher access. Ask the admin to add you.';
  if (/admins only/i.test(m)) return 'Only an Admin can do this.';
  if (/own admin access/i.test(m)) return 'You cannot remove your own Admin access.';
  if (/at least one active admin/i.test(m)) return 'The app must keep at least one active Admin.';
  if (/Failed to send a request to the Edge Function|FunctionsFetchError|Function not found|404/i.test(m)) return 'The staff service is not set up yet (Edge Function "staff-admin").';
  if (/duplicate key|already exists/i.test(m)) return 'That already exists.';
  if (/rate limit|too many/i.test(m)) return 'Too many emails were sent in the last hour. Please try again later, or ask the admin.';
  if (/not authori[sz]ed/i.test(m) && /email|address/i.test(m)) return 'The app cannot email this address yet. Please ask the admin.';
  if (/unknown or closed class code/i.test(m)) return 'That class code is not open online.';
  if (/anonymous/i.test(m)) return 'Online saving is not switched on yet (anonymous sign-ins are off).';
  if (/fetch|network/i.test(m)) return 'No internet connection. Your work is saved on this phone and will be sent later.';
  return m;
};

// ------------------------------------------------------------------ email links (invitation / password reset)
// Supabase's emails send the teacher back to the app with tokens in the URL hash
// (#access_token=…&refresh_token=…&type=invite|recovery). The app uses a HashRouter, so read and
// remove them before the router sees the hash, then ask the teacher to choose a password.
let pendingPassword = false;
export const needsPassword = () => pendingPassword;

export function captureAuthFromUrl(): Promise<boolean> | null {
  if (!onlineEnabled || typeof window === 'undefined') return null;
  const h = window.location.hash;
  if (!/access_token=/.test(h) && !/error_description=/.test(h)) return null;
  const q = new URLSearchParams(h.replace(/^#\/?/, ''));
  history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
  const access_token = q.get('access_token');
  const refresh_token = q.get('refresh_token');
  if (!access_token || !refresh_token) return Promise.resolve(false);
  pendingPassword = q.get('type') === 'invite' || q.get('type') === 'recovery';
  return sb().auth.setSession({ access_token, refresh_token }).then(({ error }) => !error);
}

export async function setTeacherPassword(password: string): Promise<void> {
  const { error } = await sb().auth.updateUser({ password });
  if (error) throw error;
  pendingPassword = false;
}
