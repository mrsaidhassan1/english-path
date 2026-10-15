-- English Path: online class store (Supabase / Postgres).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Then: Authentication → Sign In / Providers → turn ON "Allow anonymous sign-ins" (students sign in that way),
-- and invite the teacher by email (Authentication → Users → Invite user). Finally run the
-- "connect the teacher" line at the bottom with the teacher's email.
--
-- Who can see what (row level security):
--   * a student's phone signs in anonymously and joins a class with its code; it can read and write
--     ONLY its own progress row and its own writing;
--   * the teacher signs in with email + password and reads every student and every piece of writing
--     in the classes they own, and saves marks;
--   * nobody else can read anything.

create table if not exists public.classes (
  code        text primary key,                       -- the join code, e.g. FND68-SH
  name        text not null,                          -- e.g. FND 68
  teacher_id  uuid references auth.users (id) on delete set null,
  allow_join  boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.students (
  id          uuid primary key references auth.users (id) on delete cascade,  -- the phone's anonymous login
  class_code  text not null references public.classes (code) on delete cascade,
  first_name  text not null check (char_length(first_name) between 1 and 40),
  last_name   text check (char_length(last_name) <= 60),
  progress    jsonb not null default '{}'::jsonb,     -- lessons, words, skills, exams, streak … (no photos)
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.writing (
  id            text primary key,                     -- the app's writing id
  student_id    uuid not null references public.students (id) on delete cascade,
  class_code    text not null references public.classes (code) on delete cascade,
  task_title    text,
  prompt        text,
  bullets       jsonb not null default '[]'::jsonb,
  body          text not null check (char_length(body) <= 4000),
  words         int,
  estimate      jsonb,                                 -- the app's first suggestion (C / O / L)
  marks         jsonb,                                 -- the teacher's marks (C / O / L), A1 writing rubric
  teacher_score int,                                   -- /15
  teacher_note  text,
  source        text,
  created_at    timestamptz not null default now(),
  marked_at     timestamptz
);

create index if not exists students_class_idx on public.students (class_code);
create index if not exists writing_class_idx on public.writing (class_code);
create index if not exists writing_student_idx on public.writing (student_id);

alter table public.classes  enable row level security;
alter table public.students enable row level security;
alter table public.writing  enable row level security;

-- helper: is the signed-in user the teacher of this class?
create or replace function public.is_teacher_of(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.code = p_code and c.teacher_id = auth.uid());
$$;

-- classes: only the teacher sees and edits their classes (students join through join_class below)
drop policy if exists "teacher reads own classes" on public.classes;
create policy "teacher reads own classes" on public.classes for select using (teacher_id = auth.uid());
drop policy if exists "teacher updates own classes" on public.classes;
create policy "teacher updates own classes" on public.classes for update using (teacher_id = auth.uid());

-- students: own row, or the class teacher
drop policy if exists "student reads self" on public.students;
create policy "student reads self" on public.students for select using (id = auth.uid() or public.is_teacher_of(class_code));
drop policy if exists "student updates self" on public.students;
create policy "student updates self" on public.students for update using (id = auth.uid()) with check (id = auth.uid());
-- a student may change only their progress (not their class or name: that goes through join_class)
revoke update on public.students from authenticated, anon;
grant update (progress, updated_at) on public.students to authenticated;
drop policy if exists "teacher removes students" on public.students;
create policy "teacher removes students" on public.students for delete using (public.is_teacher_of(class_code));

-- writing: the student adds and reads their own; the teacher reads and marks the class
drop policy if exists "student adds own writing" on public.writing;
create policy "student adds own writing" on public.writing for insert
  with check (student_id = auth.uid() and marks is null and teacher_score is null and teacher_note is null
              and class_code = (select s.class_code from public.students s where s.id = auth.uid()));
drop policy if exists "read own or class writing" on public.writing;
create policy "read own or class writing" on public.writing for select using (student_id = auth.uid() or public.is_teacher_of(class_code));
drop policy if exists "teacher marks writing" on public.writing;
create policy "teacher marks writing" on public.writing for update using (public.is_teacher_of(class_code));

-- the only way in for a student: a valid, open class code (checked on the server)
create or replace function public.join_class(p_code text, p_first text, p_last text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_class text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into v_class from public.classes where upper(code) = upper(trim(p_code)) and allow_join;
  if v_class is null then raise exception 'unknown or closed class code'; end if;
  insert into public.students (id, class_code, first_name, last_name)
    values (auth.uid(), v_class, trim(p_first), nullif(trim(coalesce(p_last, '')), ''))
  on conflict (id) do update set class_code = excluded.class_code, first_name = excluded.first_name, last_name = excluded.last_name;
  return v_class;
end;
$$;
revoke all on function public.join_class(text, text, text) from public;
grant execute on function public.join_class(text, text, text) to authenticated;

-- the built-in class
insert into public.classes (code, name) values ('FND68-SH', 'FND 68') on conflict (code) do nothing;

-- connect the teacher (run AFTER the teacher has accepted the email invitation; put the teacher's email in):
-- update public.classes set teacher_id = (select id from auth.users where email = 'TEACHER-EMAIL-HERE') where code = 'FND68-SH';
