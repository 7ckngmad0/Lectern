# Testing Lectern

## 1. Automated checks

```bash
npm run check        # typecheck + lint + all tests (below)
npm run test:unit    # 21 tests: validation, file rules, formatting, permissions, search/sort
npm run test:db      # 127 checks: every migration + RLS + storage policies, on in-memory Postgres
npx expo install --check   # dependency versions match Expo SDK 58
npx expo-doctor            # project health (run on your machine)
```

`test:db` creates students, an instructor and an admin, then acts as each one: uploads, reads, edits, deletes, file access, suspension, notifications, popularity, statistics and announcements. It needs no Supabase project.

Not automated: anything that needs a real Supabase project or a phone. Section 2 covers that by hand.

## 2. Manual test on Expo Go

Setup: complete [SUPABASE_SETUP.md](SUPABASE_SETUP.md), run `npx expo start -c`, and scan the QR code. Prepare these accounts:

| Account | How |
|---|---|
| **Student A** | Sign up in the app, picking 1–2 subjects |
| **Student B** | Sign up with a different subject |
| **Instructor** | Sign up, then run `update profiles set role = 'instructor' …` |
| **Admin** | Same, with `role = 'admin'` |

Tick each item as you go.

### Navigation and UI
- [ ] Splash → onboarding (first launch only) → login.
- [ ] All 5 tabs open. Back buttons work, and so does Android's back gesture.
- [ ] Light, dark and System themes look right (Settings), and the choice **survives an app restart**.
- [ ] Every list shows a skeleton while loading, then either content or a friendly empty state.
- [ ] Pull-to-refresh works on Home, Presentations, Exercises, Library, Notifications and the admin screens.

### Authentication
- [ ] Sign up (Student A). If email confirmation is on, the confirmation screen appears and resend works.
- [ ] A wrong password shows "Incorrect email or password."
- [ ] Close and reopen the app: you're still signed in.
- [ ] Forgot password → the email link opens the app → set a new password → sign in with it.
- [ ] Settings → Change password works.
- [ ] Sign out → login screen. Signing in as another account shows none of the first account's data.

### Presentations (as Student A)
- [ ] Upload a PPTX: the progress bar moves, then the detail screen opens. You get a notification if the setting is on.
- [ ] Try a `.docx` file, or a file over 50 MB: you get a clear error and nothing is uploaded.
- [ ] Turn on airplane mode during an upload: you get an error and **Retry**. Turn it back on and Retry works.
- [ ] **Cancel** during an upload stops it.
- [ ] Upload a second one as **Only me**.
- [ ] Search, the subject and topic filters, and all 4 sort orders work.
- [ ] Edit the title, replace the file, and download it: the share sheet opens and the file opens in PowerPoint or a PDF viewer.
- [ ] Delete it: it disappears and doesn't come back after pull-to-refresh.

### Exercises (as Student A)
- [ ] Upload a PDF exercise (category: Lab) and a JPG exercise.
- [ ] The Official / Mine views, and the category, module and topic filters, work.
- [ ] Exercise detail shows **Related on this topic** with the matching presentation.
- [ ] Students don't see the "Official learning activity" switch.

### Library and bookmarks
- [ ] **Instructor:** Admin → Add learning material → publish a PDF and save a second one as a **draft**.
- [ ] **Student A** (enrolled in that subject) gets a **New learning material** notification. Student B (not enrolled) doesn't.
- [ ] Student A sees the published material and **not** the draft, in both the Library and Search.
- [ ] Browse by subject → module → topic. The type, module and topic filters, and the Newest / A–Z sort, work.
- [ ] Instructor edits the published material's title: Student A gets **Material updated**.
- [ ] Open a material twice: it appears once under **Continue where you left off**.
- [ ] After 2+ accounts open it, **Popular this month** appears.
- [ ] Bookmark items from cards and detail screens. Bookmarks show in the Bookmarks screen and **still exist after reinstalling or signing in on another phone**.

### Permissions (try to break them)
- [ ] Student B can't see Student A's **Only me** files, in lists, search or bookmarks.
- [ ] Student B sees no Edit/Delete on Student A's files.
- [ ] A student opening `/admin` (for example from a notification link) sees **Instructors and admins only**.
- [ ] A student can only pick enrolled subjects when uploading. After removing a subject in Edit profile, it disappears from the list.
- [ ] Instructor can edit and delete Student A's presentation, and can mark A's exercise **Official**.

### Admin (as Admin)
- [ ] The dashboard numbers match reality: count the users and uploads.
- [ ] Change Student B to instructor and back.
- [ ] Your own account's menu says you can't change your own role or status.
- [ ] Suspend Student B. On B's phone, send the app to the background and reopen it: B is signed out with "This account is suspended." B can't sign in. Reactivate B: B can sign in again and their files are still there.
- [ ] **Instructor:** User management is view-only, with a note that admins change roles.
- [ ] Content moderation lists private student files. Deleting one removes it for the student too.
- [ ] Send an announcement to one subject: only enrolled users get it.
- [ ] Muting **Announcements** in Settings hides them from the inbox and the badge.

### Profile
- [ ] Edit your name, course and section. The changes show on Home and Profile.
- [ ] Add a profile photo (JPG under 2 MB). It shows on Home, Profile, file details and the admin list. Remove it: initials are shown again.

## 3. Demo mode (no Supabase)
Remove or rename `.env.local` and restart with `-c`. The login screen offers Student, Instructor and Admin buttons, and everything runs on mock data in memory. Use this for a presentation if there's no internet.
