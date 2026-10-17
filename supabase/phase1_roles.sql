-- English Path · Phase 1: staff roles and class access (run once, after setup.sql).
-- Supabase dashboard → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Roles
--   staff.role        admin     : everything (all classes, staff, settings)
--                     teacher   : the classes they are attached to
--                     observer  : read-only (e.g. Senior Instructors)
--   class_staff.role  owner / teacher : read the class and mark writing
--                     observer        : read the class, answers and student work, no changes
--   A suspended staff member keeps their rows but has no access at all.
-- Students are unchanged: anonymous login + class code, own rows only.

-- ------------------------------------------------------------------ tables
create table if not exists public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'teacher', 'observer')),
  status     text not null default 'active' check (status in ('active', 'suspended')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_staff (
  class_code text not null references public.classes (code) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'teacher', 'observer')),
  added_by   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_code, user_id)
);
create index if not exists class_staff_user_idx on public.class_staff (user_id);

alter table public.writing add column if not exists marked_by uuid references auth.users (id) on delete set null;

alter table public.staff enable row level security;
alter table public.class_staff enable row level security;

-- ------------------------------------------------------------------ who can do what
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin' and status = 'active');
$$;

-- 'admin' | 'owner' | 'teacher' | 'observer' | null (no access)
create or replace function public.class_role(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then 'admin'
    else (select cs.role from public.class_staff cs
            join public.staff s on s.user_id = cs.user_id and s.status = 'active'
           where cs.class_code = p_code and cs.user_id = auth.uid())
  end;
$$;

create or replace function public.can_read_class(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.class_role(p_code) is not null;
$$;

create or replace function public.can_mark_class(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.class_role(p_code) in ('admin', 'owner', 'teacher'), false);
$$;

-- older policies called this; it now means "may read the class"
create or replace function public.is_teacher_of(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_read_class(p_code);
$$;

-- ------------------------------------------------------------------ policies
-- classes
drop policy if exists "teacher reads own classes" on public.classes;
drop policy if exists "teacher updates own classes" on public.classes;
drop policy if exists "staff read their classes" on public.classes;
create policy "staff read their classes" on public.classes for select using (public.can_read_class(code));
drop policy if exists "admin or owner updates class" on public.classes;
create policy "admin or owner updates class" on public.classes for update
  using (public.is_admin() or public.class_role(code) = 'owner') with check (public.is_admin() or public.class_role(code) = 'owner');
drop policy if exists "admin creates classes" on public.classes;
create policy "admin creates classes" on public.classes for insert with check (public.is_admin());

-- students: own row, or staff of the class (read); teachers / owners / admin remove
drop policy if exists "student reads self" on public.students;
create policy "student reads self" on public.students for select using (id = auth.uid() or public.can_read_class(class_code));
drop policy if exists "teacher removes students" on public.students;
create policy "teacher removes students" on public.students for delete using (public.can_mark_class(class_code));

-- writing: own, or staff of the class (read); teachers / owners / admin mark
drop policy if exists "read own or class writing" on public.writing;
create policy "read own or class writing" on public.writing for select using (student_id = auth.uid() or public.can_read_class(class_code));
drop policy if exists "teacher marks writing" on public.writing;
create policy "teacher marks writing" on public.writing for update
  using (public.can_mark_class(class_code)) with check (public.can_mark_class(class_code));

-- marked_by / marked_at are set by the server, never by the browser
create or replace function public.stamp_mark()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.marks is distinct from old.marks or new.teacher_score is distinct from old.teacher_score or new.teacher_note is distinct from old.teacher_note then
    new.marked_by := auth.uid();
    new.marked_at := now();
  else
    new.marked_by := old.marked_by;
    new.marked_at := old.marked_at;
  end if;
  return new;
end;
$$;
drop trigger if exists writing_stamp_mark on public.writing;
create trigger writing_stamp_mark before update on public.writing for each row execute function public.stamp_mark();

-- staff: you see yourself; admins see and manage everyone
drop policy if exists "staff read self or admin" on public.staff;
create policy "staff read self or admin" on public.staff for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin manages staff" on public.staff;
create policy "admin manages staff" on public.staff for all using (public.is_admin()) with check (public.is_admin());

-- class_staff: staff of a class see who else teaches it; admins and the class owner manage it
drop policy if exists "class staff read" on public.class_staff;
create policy "class staff read" on public.class_staff for select using (user_id = auth.uid() or public.can_read_class(class_code));
drop policy if exists "admin or owner manages class staff" on public.class_staff;
create policy "admin or owner manages class staff" on public.class_staff for all
  using (public.is_admin() or public.class_role(class_code) = 'owner') with check (public.is_admin() or public.class_role(class_code) = 'owner');

-- ------------------------------------------------------------------ what the app asks after sign-in
-- {"role": "admin|teacher|observer", "status": "active|suspended", "classes": [{"code","name","role"}]} or null
create or replace function public.my_access()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when s.user_id is null then null else jsonb_build_object(
    'role', s.role,
    'status', s.status,
    'classes', coalesce((
      select jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name, 'role', case when s.role = 'admin' then 'admin' else cs.role end) order by c.name)
        from public.classes c
        left join public.class_staff cs on cs.class_code = c.code and cs.user_id = s.user_id
       where s.status = 'active' and (s.role = 'admin' or cs.user_id is not null)
    ), '[]'::jsonb)
  ) end
  from (select auth.uid() as uid) me
  left join public.staff s on s.user_id = me.uid;
$$;
revoke all on function public.my_access() from public;
grant execute on function public.my_access() to authenticated;

-- ------------------------------------------------------------------ the first admin (the app's owner)
-- Put the admin's login email in place of ADMIN-EMAIL-HERE (both lines) before running.
insert into public.staff (user_id, role)
  select id, 'admin' from auth.users where email = 'ADMIN-EMAIL-HERE'
  on conflict (user_id) do update set role = 'admin', status = 'active';
insert into public.class_staff (class_code, user_id, role)
  select 'FND68-SH', id, 'owner' from auth.users where email = 'ADMIN-EMAIL-HERE'
  on conflict (class_code, user_id) do update set role = 'owner';

-- check
select (select count(*) from public.staff where role = 'admin' and status = 'active') as admins,
       (select count(*) from public.class_staff) as class_staff_rows,
       (select count(*) from public.classes) as classes;
