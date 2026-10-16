# place holder (hoa name) — website + resident portal

A one-page public marketing site plus a secured, role-based resident/admin
portal, built with Next.js (App Router), Drizzle ORM + Postgres, and
NextAuth. Every real word of copy is a `place holder (what goes here)`
marker on purpose — no AI-written copy — and there are no images, so you
can drop in real photography, logos, and text whenever it's ready.

This was verified end-to-end before delivery: real build, real local
Postgres database, real login as each role, real writes (contact form →
lead, creating an announcement, editing a profile, removing a role tag) all
confirmed working against an actual database, not just "should work."

## What's here

- **Public homepage** (`/`) — top bar (logo, login, contact us, document
  access), hero, a cork-board-style announcements section that's fully
  admin-editable, mission/contact info, and a contact form.
- **Resident/admin portal** (`/portal/**`) — behind login:
  - dashboard, document repository (role-filtered), resident directory
    (opt-in fields only), self-service profile editor, full announcements
    list.
  - `/portal/admin/**` (admins only) — manage user accounts and role tags,
    upload/delete documents, create/edit/pin/reorder announcements, and a
    simple built-in CRM for contact-form leads with per-profile private
    admin notes + communication logs.
- **Auth** — email + password login (NextAuth credentials provider), roles
  stored per-account (`ADMIN`, `OWNER`, `RENTER` — a person can hold more
  than one), route-level gating in `src/proxy.ts` plus a second check on
  every admin page/action (defense in depth).
- **Email automation** — `src/lib/email.ts` sends through Resend's API.
  Until you add an API key, it just logs what it would have sent to the
  console, so everything else works before you set up email.
- **Database** — Drizzle ORM against Postgres. Documents are stored
  directly in the database (up to 8MB per file) so a test deploy needs
  nothing beyond one connection string — see "going further" below before
  using this for large files in production.

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4
· Drizzle ORM · `postgres` (postgres.js) · NextAuth 4 · Zod · lucide-react

## Getting it running

### 1. Push this to GitHub

You mentioned you're doing this yourself — create a new repo and push this
folder to it (minus `node_modules`, which your own `npm install` will
recreate).

### 2. Get a free Postgres database

Any of these work — Drizzle just needs a standard connection string:

- **Supabase** (supabase.com) — free tier, easiest to also add file
  storage later. After creating a project, go to Project Settings →
  Database → Connection string (use the "Transaction" pooler one).
- **Neon** (neon.tech) — free tier, serverless Postgres, very fast to spin
  up.

Copy the connection string — you'll need it for `DATABASE_URL`.

### 3. Set environment variables

Copy `.env.example` to `.env.local` for local testing, and add the same
keys in Vercel under **Project → Settings → Environment Variables**:

| Key | Required? | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | yes | the Postgres connection string from step 2 |
| `NEXTAUTH_SECRET` | yes | signs login sessions — generate a long random one with `openssl rand -base64 48` |
| `DATA_ENCRYPTION_KEY` | **yes** | the key that encrypts every stored document, form and filled-out form (32 random bytes: `openssl rand -base64 32`). **Back this up somewhere safe and separate (e.g. a password manager). If it is lost, the encrypted files cannot be recovered by anyone.** Uploads are refused until it is set. |
| `DATA_ENCRYPTION_KEY_PREVIOUS` | only when rotating | the old key, kept so older files still open while they are re-encrypted under the new one (Admin Console → Security) |
| `MFA_REQUIRED_ROLES` | no | who must use two-step login. Default `ADMIN,DIRECTOR`. Set `ADMIN,DIRECTOR,OWNER,RENTER` to require it for everyone |
| `NEXTAUTH_URL` | yes, in production | your real site address, e.g. `https://yourdomain.com` (no trailing slash). Emailed reset links and secure cookies depend on it — Vercel does **not** set it for you |
| `RESEND_API_KEY` | no | get one free at resend.com once you want real emails sending. Emails use the Tazewell Place logo (`/images/email-logo.png` on your site) and colors |
| `EMAIL_FROM` | no | e.g. `Tazewell Place <noreply@yourdomain.com>` |

**I never need to see any of these values** — you add them directly in
Vercel and in your own `.env.local`.

### 4. Install, push the schema, and seed test data

```bash
npm install
npm run db:push     # creates all the tables in your database
npm run db:seed      # LOCAL testing only: creates fake test profiles (refuses to run against a real database)
npm run dev           # http://localhost:3000
```

### 5. Deploy to Vercel

Import the GitHub repo in Vercel, add the environment variables from step
3, and deploy. You'll get your `something.vercel.app` URL automatically.
Do **not** seed the production database. If test accounts were ever created
there (the `@hoa.test` ones), delete them with SQL file 11 before real use.

## How the portal is protected

- **Encrypted at rest.** Every uploaded document, every fillable form and
  every filled-out form is encrypted (AES-256-GCM) before it is written to the
  database, and each item is bound to its own record so it can't be swapped
  onto another. The key lives only in the hosting settings, never in the
  database, so a copy of the database alone shows scrambled bytes.
- **Two-step login** (6-digit code from an authenticator app, plus 10 one-time
  backup codes) is required for admins and directors. Until a staff account
  has set it up, it can't reach any data. Residents can turn it on too.
- **Sign-in lockout:** 5 wrong tries on one email, or 30 from one network
  address, locks sign-in for 30 minutes (same behaviour whether or not the
  account exists). The sign-in page says how many minutes are left, attempts
  made while locked don't extend the wait, and it unlocks by itself.
- **Passwords:** at least 12 characters, common ones refused, stored with
  bcrypt. Passwords an admin sets are temporary — the person must choose their
  own at first sign-in. Sessions end after 8 hours.
- **Strict browser protections:** a Content-Security-Policy with per-request
  nonces on the portal, no framing, HTTPS-only, no caching of private files,
  and the portal is hidden from search engines.
- **Risky admin actions need a fresh code.** Setting a password, changing
  roles, deleting accounts, creating an admin/director and resetting someone's
  two-step login only work for 10 minutes after the admin enters a 6-digit code
  (the bar at the top of the admin console). A stolen login cookie alone can't
  do them. Signing out ends only that device's sign-in.
- **Sessions (Admin Console → Users → Sessions).** Every sign-in is recorded
  with the device (iPhone · Safari, Mac · Chrome…), an approximate place and
  the network address. Admins can sign any device out, or all of them; ending
  someone else's sign-in needs a fresh two-step code, and the person gets an
  email. Directors can view, and can end sign-ins only for accounts they just
  created. The place comes from Vercel's request headers (a guess from the
  network address, wrong on a VPN); the device is what the browser claims.
- **Access is re-checked from the database on every request** (never trusted
  from the login cookie), and staff opening someone's personal document is
  recorded in the activity log.
- **Admin Console → Security** shows encryption status, who has two-step login
  on, test accounts still present, and recent sign-in events. An admin can
  reset someone's two-step login (lost phone); nobody can reset their own.

## Undo and Roll back (change history)

The database itself writes down every add / change / delete of the records
(accounts, profiles, documents, folders, forms, filled-out forms,
announcements, leads, notes) for **30 days** (SQL file 10 sets this up).

- **Undo:** deleting an account asks for confirmation, then shows an Undo
  button for 10 seconds that puts back the account, profile, notes and
  personal documents.
- **Roll back** (Admin Console → Activity, admins only): pick a day and time
  (Eastern), see what would change, type ROLL BACK, and everything added or
  changed after that moment is undone and anything deleted comes back. It needs
  a fresh two-step code, is written to the Activity log, and emails the board.
  It can itself be rolled back by choosing the moment just before it.
  Limits: the Activity log is never rolled back; accounts that still exist keep
  their *current* password and two-step settings (so a rollback can't undo a
  password change or switch someone's two-step login off); only the last 30
  days are remembered; encrypted files come back still encrypted (the key is
  unchanged).
- Deleted data (including old password hashes) stays in this history for 30
  days. SQL file 11 erases the history of the test accounts.

## Notes on the choices I made without asking

- **"Two databases"** (resident + admin) are two tables in one Postgres
  database, linked by a shared login record — that's the standard way to
  do this in a small app, and it's what lets one person hold both an admin
  account and a resident profile at once (see `admin2@hoa.test` in the
  seed data, who is both).
- **Documents live in the database** (not a separate file-storage service)
  so this deploys with nothing beyond the one Postgres connection string.
  4MB/file limit for now. Before going live with large scanned PDFs,
  swap `src/actions/documents.ts` to upload to Supabase Storage or Vercel
  Blob instead and store just the URL — I can do this for you when you're
  ready.
- **Contact-form "CRM"** is the simple built-in one you asked for — leads
  land in `/portal/admin/leads` with status + assignment, no external
  service needed.
- **Mobile** = fully responsive design (the top bar collapses to a
  hamburger menu, all portal pages reflow), not a separate app.
- **Color palette** — deep green + warm gold, defined once as CSS
  variables in `src/app/globals.css`. Change the values there and the
  whole site rebrands.
- Announcements are a **cork-board** style section, per your pick — pinned
  ones show a pin badge, priority sets the pin/accent color, and admins
  fully control content/pinning/order/audience from
  `/portal/admin/announcements`.

## Going further (not needed for testing, but worth knowing)

- Swap document storage to Supabase Storage / Vercel Blob before real
  files get large (see above).
- Email templates are branded in `src/lib/email.ts`; set `RESEND_API_KEY` and
  `EMAIL_FROM` (a domain you verified in Resend) to actually send them.
- Consider moving from NextAuth v4 to a newer major version at some point;
  v4 is stable and fully supported, this just isn't the newest option.
