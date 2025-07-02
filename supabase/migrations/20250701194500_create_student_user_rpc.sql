-- supabase/migrations/20250701194500_create_student_user_rpc.sql

create or replace function public.create_student_user(
  p_name text,
  p_email text,
  p_student_id text
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  email text,
  student_id text,
  points integer,
  created_at timestamptz,
  temporary_password text
)
language plpgsql
security definer -- Important: Allows the function to run with elevated privileges
set search_path = public
as $$
declare
  new_user_id uuid;
  new_student_id uuid;
  temp_password text;
begin
  -- 1. Generate a random temporary password
  temp_password := substr(md5(random()::text), 0, 9);

  -- 2. Create the user in Supabase Auth
  -- This requires the service_role key, which is available because this is a SECURITY DEFINER function
  new_user_id := auth.uid() from auth.users where raw_user_meta_data->>'email' = p_email;
  
  if new_user_id is null then
    insert into auth.users (email, password, raw_user_meta_data, email_confirmed_at)
    values (p_email, crypt(temp_password, gen_salt('bf')), jsonb_build_object('name', p_name, 'role', 'student'), now())
    returning id into new_user_id;
  end if;

  -- 3. Create the student profile in the 'students' table
  insert into public.students (user_id, name, email, student_id)
  values (new_user_id, p_name, p_email, p_student_id)
  returning id into new_student_id;

  -- 4. Link the user to the 'student' role in 'user_roles'
  insert into public.user_roles (user_id, role, profile_id)
  values (new_user_id, 'student', new_student_id);

  -- 5. Return the new student's data along with the temporary password
  return query
    select
      s.id,
      s.user_id,
      s.name,
      s.email,
      s.student_id,
      s.points,
      s.created_at,
      temp_password as temporary_password
    from public.students s
    where s.id = new_student_id;
end;
$$;
