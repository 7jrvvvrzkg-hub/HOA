import { sql } from "drizzle-orm";
import { db } from "@/db";

// The database writes down every change to the community's records (see
// drizzle/0008_sessions_history.sql). These helpers are how the website asks
// for "undo that one action" and "put everything back to a past moment".

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Run `fn` as ONE database transaction that is labelled with who did it,
 * and hand back the transaction's number — the "ticket" an undo needs. */
export async function asActor<T>(actorId: string, fn: (tx: Tx) => Promise<T>): Promise<{ result: T; txid: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor', ${actorId}, true)`);
    const rows = await tx.execute(sql`select txid_current()::text as txid`);
    const txid = String((rows as unknown as { txid: string }[])[0].txid);
    const result = await fn(tx);
    return { result, txid };
  });
}

/** How long after an action the "Undo" button works. */
export const UNDO_SECONDS = 120;

export type TxInfo = { actorId: string | null; ageSeconds: number; firstUserDelete: Record<string, unknown> | null };

/** Facts about a past action, for checking an undo request. */
export async function describeTx(txid: string): Promise<TxInfo | null> {
  if (!/^\d{1,18}$/.test(txid)) return null;
  const rows = (await db.execute(sql`
    select
      (array_agg(actor_id order by id))[1] as actor_id,
      extract(epoch from (clock_timestamp() - min(at)))::float as age,
      (array_agg(old_row order by id) filter (where tbl = 'users' and op = 'D'))[1] as user_row
    from change_journal where txid = ${txid}::bigint
  `)) as unknown as { actor_id: string | null; age: number | null; user_row: Record<string, unknown> | null }[];
  const r = rows[0];
  if (!r || r.age === null) return null;
  return { actorId: r.actor_id, ageSeconds: r.age, firstUserDelete: r.user_row };
}

export type RollbackLine = { tbl: string; removed: number; restored: number; changed: number };

/** What putting everything back to `at` would do (dry) or does. */
export async function runRollback(at: Date, dry: boolean, actorId: string): Promise<RollbackLine[]> {
  if (dry) {
    const rows = (await db.execute(sql`select * from journal_run(${at.toISOString()}::timestamptz, null, true, true)`)) as unknown as RollbackLine[];
    return rows.map((r) => ({ tbl: r.tbl, removed: Number(r.removed), restored: Number(r.restored), changed: Number(r.changed) }));
  }
  const out = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor', ${actorId}, true)`);
    const lines = (await tx.execute(sql`select * from journal_run(${at.toISOString()}::timestamptz, null, false, true)`)) as unknown as RollbackLine[];
    // Safety net: never end up with nobody (or not you) able to run the site.
    const check = (await tx.execute(sql`
      select
        (select count(*) from users where 'ADMIN' = any(roles))::int as admins,
        exists(select 1 from users where id = ${actorId} and 'ADMIN' = any(roles)) as me_admin
    `)) as unknown as { admins: number; me_admin: boolean }[];
    if (!check[0] || check[0].admins < 1 || !check[0].me_admin) {
      throw new Error("ROLLBACK_WOULD_REMOVE_ADMIN");
    }
    return lines;
  });
  return out.map((r) => ({ tbl: r.tbl, removed: Number(r.removed), restored: Number(r.restored), changed: Number(r.changed) }));
}

export async function undoTx(txid: string, actorId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor', ${actorId}, true)`);
    await tx.execute(sql`select * from journal_run(null, ${txid}::bigint, false, false)`);
  });
}

/** The earliest moment history is complete from. */
export async function historySince(): Promise<Date | null> {
  const rows = (await db.execute(sql`select since from journal_state where id = 1`)) as unknown as { since: Date | string }[];
  const v = rows[0]?.since;
  return v ? new Date(v) : null;
}
