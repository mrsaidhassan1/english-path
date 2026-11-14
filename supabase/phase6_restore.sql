-- English Path · restore codes (run once, after phase5_data.sql). Safe to run again.
-- Supabase dashboard → SQL Editor → New query → paste → Run.
--
-- Some browsers forget a website's saved data (private mode, Instagram / TikTok / Snapchat browsers,
-- Safari after 7 days unused). The learner then starts at 0 on his phone and joins again as a new person,
-- although his progress is still online. Each learner now has a short restore code: on a phone that does
-- not remember him, the same class code + same name + his restore code bring his online record back.
--   * students.restore_code: 4 easy characters, unique in the class, made automatically.
--     The learner sees his own; the teachers of the class see everyone's (existing read rules).
--   * class_name_taken(): does an open class already have a learner with this name? (name only, no data)
--   * restore_learner(): moves that learner's record onto this phone's login and returns his progress.
--     At most 8 wrong codes per login per hour; a phone that belongs to another learner cannot take it.

-- ------------------------------------------------------------------ codes
alter table public.students add column if not exists restore_code text;
create unique index if not exists students_class_restore_idx on public.students (class_code, restore_code) where restore_code is not null;

create or replace function public.new_restore_code(p_class text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare c text; chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    c := '';
    for i in 1..4 loop c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.students where class_code = p_class and restore_code = c);
  end loop;
  return c;
end;
$$;
revoke all on function public.new_restore_code(text) from public, anon, authenticated;

create or replace function public.set_restore_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.restore_code is null then new.restore_code := public.new_restore_code(new.class_code); end if;
  return new;
end;
$$;
drop trigger if exists students_restore_code on public.students;
create trigger students_restore_code before insert on public.students for each row execute function public.set_restore_code();

-- codes for learners who joined before today
update public.students set restore_code = public.new_restore_code(class_code) where restore_code is null;

-- ------------------------------------------------------------------ same name?
-- "Ali Al-Harbi", "ali alharbi" and "Ali-Alharbi" are the same name; Arabic names keep their letters.
create or replace function public.norm_name(p_first text, p_last text)
returns text language sql immutable as $$
  select regexp_replace(lower(coalesce(p_first, '') || coalesce(p_last, '')), '[[:space:]\-\.''_]', '', 'g');
$$;

create or replace function public.class_name_taken(p_code text, p_first text, p_last text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s join public.classes c on c.code = s.class_code
     where upper(c.code) = upper(trim(p_code)) and c.allow_join and not c.archived
       and public.norm_name(s.first_name, s.last_name) = public.norm_name(p_first, p_last)
       and public.norm_name(p_first, p_last) <> ''
       and s.id is distinct from auth.uid()
  );
$$;
revoke all on function public.class_name_taken(text, text, text) from public;
grant execute on function public.class_name_taken(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------------ restore
create table if not exists public.restore_attempts (uid uuid not null, at timestamptz not null default now());
create index if not exists restore_attempts_idx on public.restore_attempts (uid, at);
alter table public.restore_attempts enable row level security; -- no policies: only the function below uses it

create or replace function public.restore_learner(p_code text, p_first text, p_last text, p_restore text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_class text; old public.students%rowtype; mine public.students%rowtype;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.restore_attempts where uid = me and at > now() - interval '1 hour') >= 8 then
    raise exception 'too many tries: wait an hour or ask your teacher';
  end if;
  select code into v_class from public.classes where upper(code) = upper(trim(p_code)) and allow_join and not archived;
  if v_class is null then raise exception 'unknown or closed class code'; end if;
  select * into old from public.students
   where class_code = v_class and restore_code = upper(regexp_replace(coalesce(p_restore, ''), '[^A-Za-z0-9]', '', 'g'))
     and public.norm_name(first_name, last_name) = public.norm_name(p_first, p_last);
  if old.id is null then
    insert into public.restore_attempts (uid) values (me); -- kept: an answer, not an error, so the try is counted
    return jsonb_build_object('error', 'wrong restore code');
  end if;
  if old.id = me then return jsonb_build_object('first_name', old.first_name, 'last_name', old.last_name, 'progress', old.progress, 'restore_code', old.restore_code); end if;

  -- this phone's login may already have an entry: only an empty restart of the same learner may be merged
  select * into mine from public.students where id = me;
  if mine.id is not null then
    if public.norm_name(mine.first_name, mine.last_name) <> public.norm_name(old.first_name, old.last_name) then
      raise exception 'this phone already belongs to another learner';
    end if;
    update public.writing set student_id = old.id, class_code = old.class_code where student_id = me; -- keep anything he wrote meanwhile
    delete from public.students where id = me;
  end if;

  -- move the record onto this login (writing and tasks follow)
  update public.students set restore_code = null where id = old.id;
  insert into public.students (id, class_code, first_name, last_name, progress, updated_at, created_at, restore_code)
    values (me, old.class_code, old.first_name, old.last_name, old.progress, now(), old.created_at, old.restore_code);
  update public.writing set student_id = me where student_id = old.id;
  update public.assignments set to_students = array_replace(to_students, old.id, me) where old.id = any (to_students);
  delete from public.students where id = old.id;
  delete from public.restore_attempts where uid = me;
  return jsonb_build_object('first_name', old.first_name, 'last_name', old.last_name, 'progress', old.progress, 'restore_code', old.restore_code);
end;
$$;
revoke all on function public.restore_learner(text, text, text, text) from public, anon;
grant execute on function public.restore_learner(text, text, text, text) to authenticated;

-- check: every learner has a code
select (select count(*) from public.students) as learners,
       (select count(*) from public.students where restore_code is null) as without_code,
       (select count(*) from pg_proc where proname in ('class_name_taken', 'restore_learner') and pronamespace = 'public'::regnamespace) as functions;
