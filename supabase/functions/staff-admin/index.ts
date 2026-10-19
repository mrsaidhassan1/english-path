// English Path · Edge Function "staff-admin" (Phase 3). Deploy: Supabase → Edge Functions → Deploy a new
// function → Via Editor → name "staff-admin" → paste this file → Deploy. Keep "Verify JWT" on.
//
// Only an active Admin may call it (checked here with the caller's own login). It does the two things a
// browser must never do itself:
//   { action: 'create', email, role, class_code?, class_role? } → makes the login with a temporary password
//       (or reuses an existing login) and gives it staff access; returns { user_id, password? , existing }
//   { action: 'reset', user_id } → gives a staff member a new temporary password; returns { password }
// The temporary password is shown once to the Admin, who passes it on; the teacher changes it in the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = ['https://mrsaidhassan1.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const ROLES = ['admin', 'teacher', 'observer'];
const CLASS_ROLES = ['owner', 'teacher', 'observer'];

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

/** Easy to read out and type: no 0/O, 1/l/I. */
function tempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = [...bytes].map((b) => chars[b % chars.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

    // who is calling, and are they an active Admin?
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller || caller.is_anonymous) return json({ error: 'not signed in' }, 401);
    const { data: me } = await admin.from('staff').select('role, status').eq('user_id', caller.id).maybeSingle();
    if (!me || me.role !== 'admin' || me.status !== 'active') return json({ error: 'admins only' }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const role = String(body.role ?? 'teacher');
      const classCode = body.class_code ? String(body.class_code) : '';
      const classRole = String(body.class_role ?? 'teacher');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'That email address does not look right.' }, 400);
      if (!ROLES.includes(role) || !CLASS_ROLES.includes(classRole)) return json({ error: 'unknown role' }, 400);
      if (classCode) {
        const { data: cls } = await admin.from('classes').select('code').eq('code', classCode).maybeSingle();
        if (!cls) return json({ error: 'That class does not exist online.' }, 400);
      }

      // an existing login (e.g. made in the Supabase dashboard) is reused; its password is not changed
      let userId = '';
      let password: string | undefined;
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        userId = data.users.find((u) => (u.email ?? '').toLowerCase() === email)?.id ?? '';
        if (data.users.length < 200) break;
      }
      const existing = !!userId;
      if (!existing) {
        password = tempPassword();
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { data: was } = await admin.from('staff').select('role').eq('user_id', userId).maybeSingle();
      const { error: e1 } = await admin.from('staff').upsert({ user_id: userId, role: was?.role === 'admin' ? 'admin' : role, status: 'active', invited_by: caller.id }, { onConflict: 'user_id' });
      if (e1) throw e1;
      if (classCode) {
        const { error: e2 } = await admin.from('class_staff').upsert({ class_code: classCode, user_id: userId, role: classRole, added_by: caller.id }, { onConflict: 'class_code,user_id' });
        if (e2) throw e2;
      }
      return json({ user_id: userId, existing, password });
    }

    if (body.action === 'reset') {
      const userId = String(body.user_id ?? '');
      const { data: st } = await admin.from('staff').select('user_id').eq('user_id', userId).maybeSingle();
      if (!st) return json({ error: 'Only staff passwords can be reset here.' }, 400);
      const password = tempPassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return json({ password });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as { message?: string })?.message ?? String(e) }, 500);
  }
});
