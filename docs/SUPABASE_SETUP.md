# Connecting Lectern to Supabase

About 10 minutes. Until this is done, the app runs in **demo mode** on mock accounts.

## 1. Create the project
Create a free project at [supabase.com](https://supabase.com). Any region is fine.

## 2. Create the database
In **SQL Editor**, run these files from `supabase/migrations/` **in order**. Paste each one and click Run.

1. `20261119000001_schema.sql`: tables, triggers and Row Level Security
2. `20261119000002_storage.sql`: private file buckets and their access rules
3. `20261119000003_seed_catalog.sql`: subjects, modules and topics
4. `20261120000001_catalog_public.sql`: lets the sign-up form read the subject list *(added in Phase 3)*
5. `20261121000001_library_and_activity.sql`: material-updated notifications, activity cleanup, popular materials *(added in Phase 5)*
6. `20261122000001_admin.sql`: admin statistics, announcements, and blocks admins from suspending themselves *(added in Phase 6)*
7. `20261122000002_grants.sql`: gives signed-in users table access (needed on newer Supabase projects; fixes "permission denied for table profiles")
8. `20261123000001_course_catalog.sql`: this class's subjects (INTE 301, COMP 015, COMP 018) with a starting module/topic outline, replacing the placeholder subjects. Rename modules and topics in **Table Editor → modules / topics**.

> Already ran the earlier files? Just run the ones you haven't. Every file after the first two is safe to re-run. Migrations are never edited after release; changes always come as new files.

If you use the Supabase CLI instead, run `npx supabase link` and then `npx supabase db push`.

## 3. Connect the app
1. Go to **Project Settings → API**. Copy the **Project URL** and the **publishable** key. On older projects this is the `anon` key.
2. Copy `.env.example` to `.env.local` and fill in both values.
3. Restart with a cleared cache. Env vars are baked in at bundle time.
   ```bash
   npx expo start -c
   ```

The login screen no longer shows the demo account buttons once the app is connected.

> Never put the `service_role` / secret key in the app or in `.env.local`.

## 4. Auth settings
**Authentication → URL Configuration → Redirect URLs.** Add both of these:
- `lectern://**` for builds of the app
- `exp://**` for Expo Go during development

Without them, the password-reset email opens a browser page instead of the app.

**Authentication → Sign In / Providers → Email → Confirm email**
- **Off** is simplest for a class demo, because new accounts can sign in right away.
- **On** is more realistic. The app then shows "Confirm your email" and offers to resend it.

> The built-in email sender only allows a few emails per hour. For real use, set up custom SMTP under **Authentication → Emails**.

## 5. Create instructor and admin accounts
Everyone who signs up is a **student**. The database ignores any role sent from the app. To promote someone, sign up in the app, then run this in the SQL Editor:

```sql
update public.profiles set role = 'admin'      where email = 'you@school.edu';
update public.profiles set role = 'instructor' where email = 'teacher@school.edu';
```

After that, admins can manage roles and suspensions from **Admin console → User management** inside the app.

## What the database enforces
These rules live in Postgres, so they hold even if someone bypasses the app.

| Rule | Where |
|---|---|
| New users are always students; role, status and email can't be self-edited | `handle_new_user`, `protect_profile_columns` |
| Only admins change roles or suspend; admins can't change their own role or suspend themselves | `protect_profile_columns` |
| Statistics and announcements are staff-only | `admin_stats()`, `send_announcement()` |
| Suspended users can't read or write anything | `is_active()` in every policy |
| Students upload only for subjects they're enrolled in, only into their own folder | presentations/exercises insert policies |
| Private presentations are visible only to the owner and staff | `presentations: read` |
| Only staff can mark exercises official or manage library materials | `prepare_content_row`, materials policies |
| Draft materials are hidden from students | `materials: read` |
| Files can be downloaded only if the matching row is visible | storage `read if row visible` policies |
| Bookmarks, activity and notifications are private to each user | per-user policies |
| Students are notified when a material in their subject is published or updated | `notify_material_published`, `notify_material_updated` |
| "Popular" only exposes counts, never who opened what | `popular_materials()` (security definer) |
| Nothing is readable without signing in | `revoke … from anon` |

Run `npm run test:db` to check all of this against an in-memory Postgres. There are 127 checks.

## Presentations (Phase 3)
- Files are uploaded to the private `presentations` bucket at `<your user id>/<random>.<ext>`, and then the database row is created. If the row can't be saved, the file is deleted again.
- Downloads use a signed link that's valid for 5 minutes. The file is saved to the app's cache, and then the phone's share sheet opens so the user can open it in PowerPoint or a PDF viewer, or save it to Files or Drive.
- Replacing a file uploads the new version first. The old file is deleted only after the row points to the new one.
- **"You can only upload presentations for subjects you are enrolled in":** add the subject under Profile → Edit profile.

## Exercises (Phase 4)
No new SQL: the `exercises` table, bucket and policies were created with the Phase 2 migrations.
- Files go to the private `exercises` bucket (PDF, Word, PowerPoint, Excel, PNG/JPG; up to 25 MB), with the same upload → row → cleanup order as presentations.
- Students can mark an exercise **Only me**. Instructors and admins can still see it.
- Only instructors and admins can mark an exercise **Official**. If a student's app sends the flag, the database resets it.
- An exercise's detail screen lists presentations and exercises on the same topic.

## Library, bookmarks and notifications (Phase 5)
- Library files live in the private `learning-materials` bucket. Only instructors and admins can add, edit, publish, feature or delete them. Students only see **published** materials, and draft files can't be downloaded even with a link.
- Publishing a material notifies every student enrolled in its subject. Replacing the file or changing the title/description of a published material sends a **Material updated** notification. Featuring or unfeaturing doesn't.
- Bookmarks, recently opened files and notifications are saved per account, so they follow you to another phone.
- Opening the same file again moves it to the top of your history instead of adding a duplicate. Each account keeps its latest 100 entries.
- **Popular this month** counts how many different people opened or downloaded each published material in the last 30 days. It appears once there's activity.

## Admin console (Phase 6)
- **User management:** instructors can view every account. Only admins can change roles or suspend accounts. A suspended user can't read or upload anything, and the app signs them out the next time it opens or returns to the foreground. Their files are kept.
- **Content moderation:** staff see every presentation and exercise, including private ones, and can delete anything inappropriate.
- **Statistics** come from `admin_stats()`. They're exact, not limited to what the app has loaded. The storage bar compares against the 1 GB free plan.
- **Announcements** go to the students enrolled in one subject, or to everyone. They arrive as notifications.

## Profile photos
Profile photos go to the `avatars` bucket, which is the only public bucket, at `<user id>/avatar-….jpg`. The limits are 2 MB and JPG/PNG/WebP. Anyone with the link can view a photo, but users can only write in their own folder.

## Troubleshooting
- **"Can't reach the server":** check the URL in `.env.local`. Your phone needs internet access, not just your computer.
- **The reset link opens a browser:** add the redirect URLs from step 4. Open the link on the same phone that requested it, because the code is tied to that device.
- **"permission denied for table …":** run file 7 (`20261122000002_grants.sql`).
- **"Couldn't load your profile":** the migrations weren't run, or the account was created before them. Delete the user under **Authentication → Users** and sign up again.
