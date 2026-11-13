-- Task and note accountability metadata + creator/assignee audit trail.
-- Run once in Supabase SQL Editor before deploying the matching app update.

alter table public.tasks
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.notes
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- Backfill existing records where possible.
update public.tasks
set assigned_by = created_by
where assigned_by is null and assignee_id is not null;

update public.tasks
set updated_by = created_by
where updated_by is null;

update public.notes
set updated_by = created_by
where updated_by is null;
