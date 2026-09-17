import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

// Standard Next.js-safe singleton so dev hot-reload doesn't open a new
// connection pool on every file edit.
const connectionString = process.env.DATABASE_URL ?? "";

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    // Most managed Postgres providers (Supabase, Neon) require SSL and sit
    // behind a connection-pooler; prepare statements don't play well with
    // pgbouncer-style poolers, so they're disabled by default here.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
