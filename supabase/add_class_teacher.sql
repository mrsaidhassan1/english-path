-- English Path · add a class and its teacher (until the Staff tab exists).
-- 1. Supabase → Authentication → Users → Add user → Create new user (teacher's email, a temporary password,
--    tick "Auto Confirm User"). The teacher changes the password in the app: Teacher Dashboard → Online class.
-- 2. Replace CLASS-CODE, CLASS-NAME and TEACHER-EMAIL below, then SQL Editor → Run. Safe to run again.
--    Run it again after step 1 if the teacher's account did not exist yet (the class is kept).
--    For a view-only teacher use 'observer' in both role places.

insert into public.classes (code, name, allow_join) values ('CLASS-CODE', 'CLASS-NAME', true)
  on conflict (code) do update set name = excluded.name;

insert into public.staff (user_id, role)
  select id, 'teacher' from auth.users where lower(email) = lower('TEACHER-EMAIL')
  on conflict (user_id) do update set status = 'active', role = case when public.staff.role = 'admin' then 'admin' else excluded.role end;

insert into public.class_staff (class_code, user_id, role)
  select 'CLASS-CODE', id, 'owner' from auth.users where lower(email) = lower('TEACHER-EMAIL')
  on conflict (class_code, user_id) do update set role = excluded.role;

update public.classes set teacher_id = (select id from auth.users where lower(email) = lower('TEACHER-EMAIL'))
  where code = 'CLASS-CODE' and teacher_id is null;

-- check: teacher_account = 1 and teacher_role = owner when everything is in place
select c.code, c.name, c.allow_join,
       (select count(*) from auth.users where lower(email) = lower('TEACHER-EMAIL')) as teacher_account,
       (select cs.role from public.class_staff cs join auth.users u on u.id = cs.user_id
         where cs.class_code = c.code and lower(u.email) = lower('TEACHER-EMAIL')) as teacher_role
  from public.classes c where c.code = 'CLASS-CODE';
