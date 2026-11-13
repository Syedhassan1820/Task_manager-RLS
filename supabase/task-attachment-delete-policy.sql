-- Apply this migration to the existing Red Leafs Task Hub Supabase project.
-- Allows a task creator (or admin) to delete files attached to their task.
-- The uploader can still delete files they uploaded.

drop policy if exists "uploader delete own attachments" on storage.objects;
drop policy if exists "task owners delete attachments" on storage.objects;

create policy "task owners delete attachments" on storage.objects
for delete to authenticated using (
  bucket_id = 'task-attachments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1
      from public.tasks t
      where t.id::text = (storage.foldername(name))[2]
        and t.created_by = (select auth.uid())
    )
  )
);
