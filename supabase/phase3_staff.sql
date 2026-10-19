-- English Path · Phase 3: the Staff tab (run once, after phase1_roles.sql). Safe to run again.
-- Supabase dashboard → SQL Editor → New query → paste → Run.
--
-- Admin-only functions for Teacher Dashboard → Staff. New accounts and new passwords are made by the
-- Edge Function "staff-admin" (supabase/functions/staff-admin), because only the server may create logins.
-- Nothing here can leave the app without an active Admin, and an Admin cannot lock themselves out.

-- every staff member, with their login email and classes
create or replace function public.staff_list()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', s.user_id,
      'email', u.email,
      'role', s.role,
      'status', s.status,
      'created_at', s.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'classes', coalesce((select jsonb_agg(jsonb_build_object('code', cs.class_code, 'name', c.name, 'role', cs.role) order by c.name)
                             from public.class_staff cs join public.classes c on c.code = cs.class_code
                            where cs.user_id = s.user_id), '[]'::jsonb)
    ) order by s.role, u.email)
    from public.staff s join auth.users u on u.id = s.user_id
  ), '[]'::jsonb);
end;
$$;

-- change a staff member's role and/or status (active | suspended)
create or replace function public.staff_set(p_user uuid, p_role text default null, p_status text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_status text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select role, status into v_role, v_status from public.staff where user_id = p_user;
  if v_role is null then raise exception 'not a staff member'; end if;
  v_role := coalesce(p_role, v_role);
  v_status := coalesce(p_status, v_status);
  if v_role not in ('admin', 'teacher', 'observer') or v_status not in ('active', 'suspended') then raise exception 'unknown role or status'; end if;
  if p_user = auth.uid() and (v_role <> 'admin' or v_status <> 'active') then raise exception 'you cannot remove your own admin access'; end if;
  update public.staff set role = v_role, status = v_status where user_id = p_user;
  if not exists (select 1 from public.staff where role = 'admin' and status = 'active') then raise exception 'there must be at least one active admin'; end if;
end;
$$;

-- remove a staff member's access completely (the login stays, but it can no longer see anything)
create or replace function public.staff_remove(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_user = auth.uid() then raise exception 'you cannot remove your own admin access'; end if;
  delete from public.class_staff where user_id = p_user;
  delete from public.staff where user_id = p_user;
  if not exists (select 1 from public.staff where role = 'admin' and status = 'active') then raise exception 'there must be at least one active admin'; end if;
end;
$$;

revoke all on function public.staff_list() from public, anon;
revoke all on function public.staff_set(uuid, text, text) from public, anon;
revoke all on function public.staff_remove(uuid) from public, anon;
grant execute on function public.staff_list() to authenticated;
grant execute on function public.staff_set(uuid, text, text) to authenticated;
grant execute on function public.staff_remove(uuid) to authenticated;

-- check: 3 = all three functions are in place
select count(*) as staff_functions from pg_proc where proname in ('staff_list', 'staff_set', 'staff_remove') and pronamespace = 'public'::regnamespace;

-- ------------------------------------------------------------------ joining a class that is new on this phone
-- A learner types a code the phone has never seen (e.g. a class created in the Staff tab): the app asks for
-- the class name. Only open classes answer, and only with their code and name.
create or replace function public.class_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'name', name) from public.classes
   where upper(code) = upper(trim(p_code)) and allow_join limit 1;
$$;
revoke all on function public.class_info(text) from public;
grant execute on function public.class_info(text) to anon, authenticated;
