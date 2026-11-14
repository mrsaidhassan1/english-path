-- English Path · Phase 5: data care (run once, after phase4_classes.sql). Safe to run again.
-- Supabase dashboard → SQL Editor → New query → paste → Run.
--
--   * classes.archived: an archived class is kept for reference but is read-only (no marking, no tasks,
--     no joining). The Admin or the class owner archives and un-archives it.
--   * class_clear(code): removes every learner of an ARCHIVED class (and their writing), ready for a new group.
--   * activity_log: who changed staff, classes, class staff, tasks or removed learners, and when (Admin reads it).

-- ------------------------------------------------------------------ archive
alter table public.classes add column if not exists archived boolean not null default false;

-- marking, tasks and removing learners stop in an archived class (reading continues)
create or replace function public.can_mark_class(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.class_role(p_code) in ('admin', 'owner', 'teacher'), false)
     and not coalesce((select archived from public.classes where code = p_code), false);
$$;

-- learners cannot join an archived class, even with the right code
create or replace function public.class_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'name', name) from public.classes
   where upper(code) = upper(trim(p_code)) and allow_join and not archived limit 1;
$$;

-- remove every learner of an archived class (their writing goes with them); returns how many
create or replace function public.class_clear(p_code text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not (public.is_admin() or coalesce(public.class_role(p_code), '') = 'owner') then raise exception 'only the Admin or the class owner'; end if; -- coalesce: no role must mean "no", not "unknown"
  if not coalesce((select archived from public.classes where code = p_code), false) then raise exception 'archive the class first'; end if;
  delete from public.students where class_code = p_code;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.class_clear(text) from public, anon;
grant execute on function public.class_clear(text) to authenticated;

-- ------------------------------------------------------------------ activity log
create table if not exists public.activity_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      uuid default auth.uid(),
  action     text not null,      -- e.g. 'staff update', 'learner removed'
  target     text,               -- e.g. a class code
  details    jsonb not null default '{}'::jsonb
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);
alter table public.activity_log enable row level security;
drop policy if exists "admin reads activity" on public.activity_log;
create policy "admin reads activity" on public.activity_log for select using (public.is_admin());
-- nobody writes it directly: only the triggers below (security definer)

create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb; o jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  o := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  -- keep the log small: no progress, writing or long text
  r := r - 'progress' - 'body' - 'estimate' - 'marks';
  o := o - 'progress' - 'body' - 'estimate' - 'marks';
  if tg_op = 'UPDATE' and r = o then return null; end if;
  if tg_table_name = 'students' and tg_op = 'UPDATE' then return null; end if; -- progress saves are not logged
  insert into public.activity_log (action, target, details)
  values (
    tg_table_name || ' ' || lower(tg_op),
    coalesce(r ->> 'class_code', r ->> 'code', r ->> 'user_id'),
    jsonb_strip_nulls(jsonb_build_object('row', r, 'before', o))
  );
  return null;
end;
$$;

drop trigger if exists log_staff on public.staff;
create trigger log_staff after insert or update or delete on public.staff for each row execute function public.log_change();
drop trigger if exists log_class_staff on public.class_staff;
create trigger log_class_staff after insert or update or delete on public.class_staff for each row execute function public.log_change();
drop trigger if exists log_classes on public.classes;
create trigger log_classes after insert or update or delete on public.classes for each row execute function public.log_change();
drop trigger if exists log_students on public.students;
create trigger log_students after insert or delete on public.students for each row execute function public.log_change();
drop trigger if exists log_assignments on public.assignments;
create trigger log_assignments after insert or delete on public.assignments for each row execute function public.log_change();

-- ------------------------------------------------------------------ overview: show archived classes
create or replace function public.classes_overview()
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code,
    'name', c.name,
    'allow_join', c.allow_join,
    'archived', c.archived,
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
  ) order by c.archived, c.name), '[]'::jsonb)
  from public.classes c
  where auth.uid() is not null and public.can_read_class(c.code);
$$;

-- check: archived column, activity_log table, 5 triggers
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name = 'archived') as archived_column,
       (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'activity_log') as activity_table,
       (select count(*) from pg_trigger where tgname like 'log\_%' and not tgisinternal) as log_triggers;
