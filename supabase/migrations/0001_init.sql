-- Embellish Antiques — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ── Products ─────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  category text not null,
  era text,
  materials text,
  dimensions text,
  condition text,
  status text not null default 'available' check (status in ('available', 'sold', 'draft')),
  is_new_arrival boolean not null default true,
  like_count integer not null default 0,
  view_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists products_category_idx on products (category);
create index if not exists products_status_idx on products (status);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create index if not exists product_images_product_idx on product_images (product_id, position);

-- ── Orders (Stripe-backed) ───────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  customer_email text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  total_cents integer not null default 0,
  shipping_address jsonb,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name text not null,
  price_cents integer not null,
  quantity integer not null default 1
);

-- ── Carts (for abandonment emails) ───────────────────────────────────────
create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  email text,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  converted_at timestamptz
);

-- ── Likes (per-visitor, tracked by anonymous device id) ──────────────────
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  unique (product_id, visitor_id)
);

-- ── Analytics events (category views, product clicks) ────────────────────
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('category_view', 'product_click', 'product_view')),
  category text,
  product_id uuid references products (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx on analytics_events (event_type, created_at);

-- ── Newsletter subscribers ────────────────────────────────────────────────
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz not null default now(),
  unsubscribed boolean not null default false,
  unsubscribed_at timestamptz,
  -- Set when someone signs up from a "notify me of similar pieces" prompt
  -- on a one-of-a-kind item instead of the general footer form.
  interest_category text
);

create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  html text not null,
  product_ids uuid[] not null default '{}',
  sent_at timestamptz,
  recipient_count integer,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Public (anon) can read products/images, insert likes and analytics events,
-- and insert into subscribers. Everything else (orders, admin writes on
-- products, newsletters) goes through the service-role key from server-side
-- code (API routes / server actions), which bypasses RLS entirely.

alter table products enable row level security;
alter table product_images enable row level security;
alter table likes enable row level security;
alter table analytics_events enable row level security;
alter table subscribers enable row level security;

create policy "public read products" on products for select using (status != 'draft');
create policy "public read product images" on product_images for select using (true);

create policy "public insert likes" on likes for insert with check (true);
create policy "public read like counts" on likes for select using (true);

create policy "public insert analytics events" on analytics_events for insert with check (true);

create policy "public subscribe" on subscribers for insert with check (true);

-- Keep like_count denormalized on products in sync with the likes table.
create or replace function sync_product_like_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update products set like_count = like_count + 1 where id = new.product_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update products set like_count = greatest(like_count - 1, 0) where id = old.product_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists likes_sync_count on likes;
create trigger likes_sync_count
  after insert or delete on likes
  for each row execute function sync_product_like_count();

-- Called from the analytics API route on a 'product_click' event.
create or replace function increment_click_count(p_product_id uuid) returns void as $$
begin
  update products set click_count = click_count + 1 where id = p_product_id;
end;
$$ language plpgsql security definer;
