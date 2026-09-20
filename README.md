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
| `NEXTAUTH_SECRET` | yes | session encryption — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | production only | Vercel sets this automatically; only needed for local dev if things act up |
| `RESEND_API_KEY` | no | get one free at resend.com once you want real emails sending |
| `EMAIL_FROM` | no | e.g. `place holder (hoa name) <noreply@yourdomain.com>` |

**I never need to see any of these values** — you add them directly in
Vercel and in your own `.env.local`.

### 4. Install, push the schema, and seed test data

```bash
npm install
npm run db:push     # creates all the tables in your database
npm run db:seed      # creates the 10 test profiles — see CREDENTIALS.md
npm run dev           # http://localhost:3000
```

### 5. Deploy to Vercel

Import the GitHub repo in Vercel, add the environment variables from step
3, and deploy. You'll get your `something.vercel.app` URL automatically.
After the first deploy, run `npm run db:seed` once from your own machine
(pointed at the production `DATABASE_URL`) to create the test accounts
there too.

## Test logins

See **CREDENTIALS.md** for the full list of 10 seeded accounts. Quick
version: `admin1@hoa.test` / `Admin123!`, `owner1@hoa.test` / `Owner123!`,
`renter1@hoa.test` / `Renter123!`.

## Notes on the choices I made without asking

- **"Two databases"** (resident + admin) are two tables in one Postgres
  database, linked by a shared login record — that's the standard way to
  do this in a small app, and it's what lets one person hold both an admin
  account and a resident profile at once (see `admin2@hoa.test` in the
  seed data, who is both).
- **Documents live in the database** (not a separate file-storage service)
  so this deploys with nothing beyond the one Postgres connection string.
  8MB/file limit for now. Before going live with large scanned PDFs,
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
- Add a "change your password" flow for residents — right now an admin
  resets passwords by recreating the account; a proper reset flow is a
  reasonable next step.
- Add real Resend templates (the current ones are functional placeholders
  with `place holder (...)` copy, matching the rest of the site).
- Consider moving from NextAuth v4 to a newer major version at some point;
  v4 is stable and fully supported, this just isn't the newest option.
