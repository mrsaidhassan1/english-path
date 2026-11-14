-- English Path · Phase 4: classes and oversight (run once, after phase3_staff.sql). Safe to run again.
-- Supabase dashboard → SQL Editor → New query → paste → Run.
--
--   * assignments: tasks reach learners' own phones. Teachers of the class (owner / teacher / Admin) add and
--     remove them; staff of the class read them; a learner reads only the ones for his class or for him.
--   * classes_overview(): one row per class the signed-in staff member can see (Admin: all).
--   * staff_directory(): staff emails by login id, so "marked by …" can be shown to staff.
-- Renaming a class and opening / closing joining use the existing rule "admin or owner updates class".

-- ------------------------------------------------------------------ assignments
create table if not exists public.assignments (
  id          text primary key,                       -- the app's assignment id
  class_code  text not null references public.classes (code) on delete cascade,
  kind        text not null check (kind in ('lesson', 'module', 'vocab', 'review', 'exam', 'grammar')),
  ref         text not null,
  title       text not null check (char_length(title) <= 200),
  to_all      boolean not null default true,
  to_students uuid[] not null default '{}',           -- online ids of the learners, when not the whole class
  due         date,
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists assignments_class_idx on public.assignments (class_code);
alter table public.assignments enable row level security;

drop policy if exists "read class or own assignments" on public.assignments;
create policy "read class or own assignments" on public.assignments for select using (
  public.can_read_class(class_code)
  or (class_code = (select s.class_code from public.students s where s.id = auth.uid())
      and (to_all or auth.uid() = any (to_students)))
);
drop policy if exists "teachers add assignments" on public.assignments;
create policy "teachers add assignments" on public.assignments for insert with check (public.can_mark_class(class_code));
drop policy if exists "teachers change assignments" on public.assignments;
create policy "teachers change assignments" on public.assignments for update
  using (public.can_mark_class(class_code)) with check (public.can_mark_class(class_code));
drop policy if exists "teachers remove assignments" on public.assignments;
create policy "teachers remove assignments" on public.assignments for delete using (public.can_mark_class(class_code));

-- ------------------------------------------------------------------ all classes at a glance
create or replace function public.classes_overview()
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code,
    'name', c.name,
    'allow_join', c.allow_join,
    'my_role', public.class_role(c.code),
    'teachers', coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'role', cs.role, 'status', st.status) order by cs.role, u.email)
                            from public.class_staff cs join auth.users u on u.id = cs.user_id
                            left join public.staff st on st.user_id = cs.user_id
                           where cs.class_code = c.code), '[]'::jsonb),
    'students', (select count(*) from public.students s where s.class_code = c.code),
    'active_week', (select count(*) from public.students s where s.class_code = c.code and s.updated_at > now() - interval '7 days'),
    'writing_total', (select count(*) from public.writing w where w.class_code = c.code),
    'to_mark', (select count(*) from public.writing w where w.class_code = c.code and w.marks is null),
    'assignments', (select count(*) from public.assignments a where a.class_code = c.code)
  ) order by c.name), '[]'::jsonb)
  from public.classes c
  where auth.uid() is not null and public.can_read_class(c.code);
$$;

-- ------------------------------------------------------------------ staff names for "marked by"
create or replace function public.staff_directory()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not exists (select 1 from public.staff where user_id = auth.uid() and status = 'active') then raise exception 'staff only'; end if;
  return coalesce((select jsonb_object_agg(s.user_id, u.email) from public.staff s join auth.users u on u.id = s.user_id), '{}'::jsonb);
end;
$$;

revoke all on function public.classes_overview() from public, anon;
revoke all on function public.staff_directory() from public, anon;
grant execute on function public.classes_overview() to authenticated;
grant execute on function public.staff_directory() to authenticated;

-- check: 1 table and 2 functions
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'assignments') as assignments_table,
       (select count(*) from pg_proc where proname in ('classes_overview', 'staff_directory') and pronamespace = 'public'::regnamespace) as functions;
