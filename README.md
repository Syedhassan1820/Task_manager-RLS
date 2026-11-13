# Red Leafs Task Hub

A lightweight, mobile-friendly task and notes workspace for Red Leafs Sports.

## Stack
- HTML, CSS, vanilla JavaScript
- Supabase Auth, PostgreSQL, Row Level Security and Storage
- GitHub Pages for static hosting
- GitHub for source control

## Team
- 1 developer
- 2 managers
- Invite all three users in Supabase Authentication. Use each person's own account.

## Local setup
1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and anon/publishable key.
4. Paste them into `assets/js/config.js`.
5. Create the three user accounts in **Authentication → Users** (invite by email).
6. Serve this folder locally (for example `python -m http.server 5500`) and open `http://localhost:5500`.

Do not put the Supabase `service_role` key in frontend code. The browser must use only the anon/publishable key. Row Level Security is enabled in the supplied SQL.

## Deploy with GitHub Pages
1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`, then Save.
4. Wait for GitHub Pages to publish the site.
5. Add the published URL to Supabase Auth → URL Configuration → Site URL and Redirect URLs.

## Initial scope
- Dashboard counts and recent tasks
- Create/edit tasks, status, priority, category, assignee email, start/due dates
- Image/PDF attachment upload to Supabase Storage
- Shared and private notes
- Activity log
- Browser-local timezone display

## Important implementation notes
- This is a starter implementation, not a production-audited release. The current UI stores assignee email but does not map it to an Auth user UUID, so the “My tasks” view needs that enhancement.
- Confirm attachment access and signed URL handling before using real files.
- Before real business use, test RLS with each of the three accounts, add password reset, enforce file upload size/type checks, and confirm manager/developer permissions.
- Canada has multiple timezones. Each user sees browser-local time; managers should set their device timezone correctly (e.g. America/Toronto or America/Vancouver).

## Suggested next improvements
1. Profile/role table and role-based permissions.
2. Task detail page with threaded comments and attachment previews.
3. In-app notifications and optional email reminders.
4. Task templates, recurring tasks, export and audit history.

## Existing project update: task deletion permissions

For an already-created Supabase project, run `supabase/task-attachment-delete-policy.sql` once in **Supabase → SQL Editor**. This lets a task creator (or admin) remove files attached to a task when deleting it. The main task and note delete permissions are enforced by database RLS policies already defined in `schema.sql`.
