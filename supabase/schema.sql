-- Red Leafs Task Hub starter schema
create extension if not exists pgcrypto;
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 140),
 description text default '', created_by uuid not null references auth.users(id) on delete restrict,
 assignee_id uuid references auth.users(id) on delete set null, assignee_email text,
 category text not null default 'General', priority text not null default 'Medium' check(priority in('Low','Medium','High','Urgent')),
 status text not null default 'Not Started' check(status in('Not Started','In Progress','On Hold','Blocked','Completed')),
 start_date date,due_date date,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.notes (
 id uuid primary key default gen_random_uuid(),title text not null,body text not null default '',category text not null default 'General',
 is_private boolean not null default false,is_pinned boolean not null default false,created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.task_comments (
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,
 body text not null,created_by uuid not null references auth.users(id) on delete restrict,author_email text,created_at timestamptz not null default now()
);
create table if not exists public.task_attachments (
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,
 file_name text not null,file_path text not null,file_url text not null,uploaded_by uuid not null references auth.users(id) on delete restrict,created_at timestamptz not null default now()
);
create table if not exists public.activity_log (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 actor_email text,action text not null,entity_title text,entity_id uuid,created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;alter table public.notes enable row level security;
alter table public.task_comments enable row level security;alter table public.task_attachments enable row level security;alter table public.activity_log enable row level security;
create policy "team read tasks" on public.tasks for select to authenticated using(true);
create policy "team create tasks" on public.tasks for insert to authenticated with check(created_by=auth.uid());
create policy "team update tasks" on public.tasks for update to authenticated using(true) with check(true);
create policy "team delete tasks" on public.tasks for delete to authenticated using(true);
create policy "read shared or own notes" on public.notes for select to authenticated using(not is_private or created_by=auth.uid());
create policy "create own notes" on public.notes for insert to authenticated with check(created_by=auth.uid());
create policy "update own notes" on public.notes for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "delete own notes" on public.notes for delete to authenticated using(created_by=auth.uid());
create policy "read comments" on public.task_comments for select to authenticated using(true);
create policy "add comments" on public.task_comments for insert to authenticated with check(created_by=auth.uid());
create policy "read attachments" on public.task_attachments for select to authenticated using(true);
create policy "add attachments" on public.task_attachments for insert to authenticated with check(uploaded_by=auth.uid());
create policy "read activity" on public.activity_log for select to authenticated using(true);
create policy "add activity" on public.activity_log for insert to authenticated with check(actor_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('task-attachments','task-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy "team view task attachments" on storage.objects for select to authenticated using(bucket_id='task-attachments');
create policy "team upload task attachments" on storage.objects for insert to authenticated with check(bucket_id='task-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "uploader delete own attachments" on storage.objects for delete to authenticated using(bucket_id='task-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
create index if not exists tasks_status_idx on public.tasks(status);create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);create index if not exists notes_updated_idx on public.notes(updated_at desc);
create index if not exists activity_created_idx on public.activity_log(created_at desc);