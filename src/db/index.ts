import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

// Standard Next.js-safe singleton so dev hot-reload doesn't open a new
// connection pool on every file edit.
const connectionString = process.env.DATABASE_URL ?? "";

// A local Postgres (used for local dev/testing against 127.0.0.1/localhost)
// generally isn't set up with SSL at all, so requiring it there would just
// break local development. Anything else — Supabase, or any real host — gets
// SSL required. Based on the actual target host rather than NODE_ENV, since
// a local database doesn't stop being local just because the app happens to
// be running in production mode.
const isLocalDb = /^(localhost|127\.0\.0\.1)/.test(new URL(connectionString || "postgres://x").hostname);

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    // Most managed Postgres providers (Supabase, Neon) require SSL and sit
    // behind a connection-pooler; prepare statements don't play well with
    // pgbouncer-style poolers, so they're disabled by default here.
    prepare: false,
    // Encrypt the connection in transit. Supabase does NOT force SSL by
    // default on its own side (their "maximize client compatibility"
    // setting) — this makes the client require it instead of silently
    // falling back to a plaintext connection. Still validates the server's
    // certificate normally (Supabase's certs are properly CA-signed), so
    // this doesn't weaken anything the way `rejectUnauthorized: false`
    // would. For belt-and-suspenders, also turn on "Enforce SSL on incoming
    // connections" in the Supabase dashboard's Database settings — that
    // makes it a server-side guarantee too, not just a client request.
    ssl: isLocalDb ? false : "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
