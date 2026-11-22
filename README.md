# Lectern: Mobile LMS & Learning Material Storage

A React Native (Expo) app where students store and organize presentations, exercises and learning materials by **subject → module → topic**. Instructors run a central learning library, and admins manage accounts.

**Status: all 7 phases built.** Real accounts, files and data come from Supabase, and the app also runs fully offline in demo mode. See [docs/TESTING.md](docs/TESTING.md) for the test checklist.

## Run it

```bash
npm install
npx expo start        # scan the QR code with Expo Go
```

- **Real mode:** follow [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). This means creating a project, running 8 SQL files and adding `.env.local`.
- **Demo mode:** with no `.env.local`, everything runs on built-in mock data. The login screen then offers Student, Instructor and Admin buttons.

```bash
npm run check         # typecheck + lint + unit tests + database security tests
```

## Features

| Area | What it does |
|---|---|
| Accounts | Sign up with enrolled subjects, sign in, stay signed in, forgot/reset/change password via deep link, edit profile, profile photo |
| Presentations | PPT/PPTX/PDF up to 50 MB. Upload with real progress, cancel and retry. Shared or private. Search, filter, sort, edit, replace file, delete, download → open/share |
| Exercises | PDF/Office/images up to 25 MB, with a category (activity, quiz, lab…). Instructors mark them **official**. Filter by subject, module, topic or category. Related slides and activities on the same topic |
| Library | Subject → Module → Topic browsing. Featured, recently added, continue where you left off, and **popular this month** (from real views/downloads). Filter by type, module and topic. Staff add, publish/draft, feature, edit and delete |
| Personal | Bookmarks, recently opened, upload confirmations, new/updated material alerts and announcements, all synced to the account. Theme and notification preferences are saved on the device |
| Admin console | Exact statistics, user management (roles and suspension, admins only), moderation of all uploads, library management, announcements to a subject or everyone |

### Roles

| Role | Can do |
|---|---|
| Student | Upload and manage their own presentations and exercises, only for enrolled subjects. Browse published library materials. Bookmarks |
| Instructor | Everything above for any subject. Manage anyone's uploads. Mark official activities. Run the library. Send announcements. View accounts |
| Admin | Everything an instructor can do, plus change roles and suspend or reactivate accounts |

Demo accounts: Maria Santos (student), Prof. Daniel Reyes (instructor), Grace Villanueva (admin).

## Security model

The app only ever uses the **publishable** key. Every rule is enforced in Postgres with Row Level Security, triggers and storage policies. The checks in `src/lib/permissions.ts` only hide buttons the user can't use.

- All academic files are in **private** buckets. Downloads use 5-minute signed links, which are only issued if the user can see the file's database row.
- New accounts are always students. Only admins can change roles or account status, and never their own.
- Suspended users can't read or write anything.
- Drafts are invisible to students. "Popular" exposes only counts, never who opened what.

The full rule table is in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md#what-the-database-enforces). `npm run test:db` checks those rules (127 checks).

## Stack

Expo SDK 58 · Expo Router (typed routes) · TypeScript (strict) · Zustand · Supabase (Auth, Postgres, Storage) · expo-document-picker · expo-file-system · expo-sharing · Ionicons · Inter. It runs in **Expo Go**, with no custom native code.

## Structure

```
src/
  app/                 Routes (Expo Router). Every file is a screen.
    (auth)/            login, register, forgot-password
    (app)/             Signed-in area (guarded)
      (tabs)/          home, presentations, exercises, library, profile
      presentation/ exercise/ material/   detail + upload/edit screens
      library/subject/[id]                Subject → Module → Topic → Materials
      admin/           index (stats), users, content (moderation), materials, material-form, announce
      bookmarks, search, notifications, my-uploads, edit-profile, settings
    reset-password.tsx
  components/          ui/ (design system), content/ (cards, lists, detail, upload form), dashboard/
  services/            Supabase access: auth, storage, content, personal, admin, avatar, sync
  store/               Zustand: auth, catalog, content, prefs (persisted), ui
  hooks/ lib/ theme/ types/
  data/mock.ts         Demo-mode data only
supabase/
  migrations/          8 SQL files: schema + RLS, storage, catalog seed, catalog access, library/activity, admin, grants, course catalog
  tests/rls.test.mjs   Database security tests (PGlite, no Supabase needed)
tests/unit/            Unit tests for src/lib (node --test)
scripts/               generate-icons.mjs: redraws the app icons in assets/ (npm run icons)
docs/                  SUPABASE_SETUP.md, TESTING.md
```

## Known limits

- I haven't tested against a live Supabase project or a phone. The checklist in [docs/TESTING.md](docs/TESTING.md) covers that.
- Lists load up to 500 items per type. That's plenty for a class, but a large school would need pagination.
- Notifications arrive when the inbox opens or the user pulls to refresh. There are no push notifications.
- Supabase's built-in email sender is rate-limited. Set up SMTP for real use.
