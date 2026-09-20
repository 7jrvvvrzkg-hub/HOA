# Embellish Antiques

A full rebuild of embellishantiques.com — custom-coded (Next.js + Supabase +
Stripe), off Wix. Built by [Bownode LLC](https://bownode.com).

Everything in this repo **runs right now** against a small mock/ported data
layer, with no real credentials — `npm run dev` and click through the whole
site and admin panel. Nothing is fake or stubbed out as "coming soon" UI;
every feature is fully wired, it's just pointed at demo data until you plug
in real Stripe/Supabase/Resend accounts (see **Going live** below).

## What's built

- Full storefront: hero, category shop pages, New Arrivals, Sold Archive,
  product pages with a size-reference tool and "notify me of similar"
  waitlist, cart, Stripe Checkout
- Depop-style animated search bar, a click-to-open Shop dropdown (not
  hover), and an always-visible contact bar up top with phone/appointment
  info
- Likes with a dedicated `/likes` page (persisted in localStorage), a live
  "most-loved this week" badge, hover quick-view with a first-image
  preview, add-to-bag "shower" animation, and a smooth slide-in cart drawer
- The animated music-staff divider — a rotated staff with a shimmying
  treble clef; click it to start a real looping MP3 track with notes that
  carousel down the (sideways) staff line, click again (or reload) to stop
- A playable, pixel-art Space Invaders game on the 404 page (keyboard +
  touch controls)
- Owner-only admin panel: dashboard, item CRUD (including image upload/
  reorder that works right away in demo mode) with larger touch targets on
  mobile, analytics (a category-share donut chart plus top categories/
  items, likes, views), and a newsletter composer that generates
  email-safe HTML and sends to subscribers with a working unsubscribe link
- Cart-abandonment emails via a Stripe webhook
- All of the current embellishantiques.com catalog (names/prices/categories)
  ported into `src/lib/data/ported-listings.ts`

## What still needs the owner

- **Photos.** Wix renders product images with client-side JS, so a static
  scrape never saw real `<img>` URLs — only names/prices/categories came
  across cleanly. Re-upload originals through `/admin/items` once Supabase
  storage is connected (this is also just better than rehosting Wix's
  compressed copies).
- **Long-form descriptions, era/materials/dimensions/condition** — the
  ported listings have placeholder description text (clearly marked in the
  code) standing in for his real copy.
- **Logo.** `src/components/logo.tsx` is a plain circle placeholder — swap
  it for the real mark once he has one; the favicon, admin header, and
  email templates all pull from it automatically.
- **About page copy, shipping/returns policy text** — both pages are
  clearly marked as placeholder in their source.
- **Music divider note timing.** The track in `/public/music/track.mp3`
  plays with a fixed, best-guess note carousel (`NOTES` array in
  `src/components/music-staff-divider.tsx`). Once you generate precise cue
  points from a music-note generator, swap that array's `left`/`duration`/
  `delay` values to match the track exactly. `/public/music/note.png` and
  `clef.png` are already cropped/transparent — add more note variants the
  same way (chroma-key to transparent, auto-crop) if you want more than
  one note shape repeating.

## Tech stack

Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase (Postgres, Auth,
Storage) · Stripe Checkout · Resend (transactional + newsletter email) ·
Zustand (cart state) · deployed via GitHub → Vercel, matching the same
pattern as the HOA project.

Fonts (Fraunces + Inter) are self-hosted via `@fontsource-variable` rather
than `next/font/google` — one less runtime dependency on Google's CDN.

## Going live

Everything below is optional to explore the site/admin panel locally, but
required before real customers can buy things or a newsletter can send.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql` (regenerate the seed file any time with
   `npx tsx scripts/generate-seed-sql.ts > supabase/seed.sql`).
3. Create a public storage bucket named `product-images` (Storage → New
   bucket → Public).
4. Project Settings → API: copy the URL, anon key, and service role key
   into `.env.local` (copy `.env.local.example` first).
5. Create the owner's login: Authentication → Users → Add user, using the
   email from `ADMIN_OWNER_EMAIL`. That's the account that signs in at
   `/admin/login`.

### 2. Stripe

1. Developers → API keys → copy the (test, then later live) secret and
   publishable keys into `.env.local`.
2. Developers → Webhooks → add an endpoint at
   `https://yourdomain.com/api/stripe/webhook`, subscribed to
   `checkout.session.completed` and `checkout.session.expired` (the second
   one is what triggers the cart-abandonment email). Copy the signing
   secret into `STRIPE_WEBHOOK_SECRET`.
3. Switch to live keys once you're ready to accept real payments.

### 3. Resend (cart-abandonment + newsletter emails)

1. Create a Resend account, verify the `embellishantiques.com` sending
   domain (adds SPF/DKIM/DMARC records — whoever controls the domain's DNS
   needs to add these, or email deliverability suffers badly).
2. Copy the API key into `.env.local`.
3. Free tier covers 3,000 emails/month (100/day cap); the $20/mo Pro tier
   removes the daily cap once the list grows past a couple hundred people.

### 4. Deploy

Push to GitHub, import into Vercel, add all the `.env.local` variables as
Vercel environment variables, deploy. Point the `embellishantiques.com`
domain at Vercel once you're ready to cut over from Wix.

## Local development

```bash
npm install
cp .env.local.example .env.local   # demo mode works with no changes
npm run dev
```

Owner admin panel in demo mode (no Supabase yet): visit `/admin/login`,
password is `ADMIN_DEMO_PASSWORD` from `.env.local` (default
`embellish-demo`) — change it. Demo mode is a real working preview, not
read-only: adding/editing/deleting items, uploading photos, reordering
images, likes, and analytics all actually work and persist while the
server stays warm (see the comment atop `src/lib/data/demo-store.ts` for
exactly what that does and doesn't survive — a redeploy or cold start
resets it). Connect Supabase for changes that stick permanently.
