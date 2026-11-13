-- Username login migration for Red Leafs Task Hub.
-- Run this AFTER the original supabase/schema.sql in the red-leafs-task-hub project.
-- Login aliases are non-deliverable internal identities:
-- <username>@redleafs-task-hub.invalid
-- Create users manually in Supabase Auth and mark email as confirmed.

alter table public.profiles
  add column if not exists username text;

-- Backfill existing profiles from the internal auth email local-part.
update public.profiles
set username = lower(split_part(email, '@', 1))
where username is null and email is not null;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    lower(split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name',
             lower(split_part(coalesce(new.email, ''), '@', 1)))
  )
  on conflict (id) do update
    set email = excluded.email,
        username = excluded.username;
  return new;
end;
$$;

-- Do not grant anonymous access to profiles or authentication identities.
