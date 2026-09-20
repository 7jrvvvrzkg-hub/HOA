"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Safe to import from client components —
// only ever talks to Supabase with the public anon key, which is subject to
// the row-level-security policies in supabase/migrations/0001_init.sql.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
