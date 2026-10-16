import { staffPage } from "@/lib/auth";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { activityCategoryLabels, type ActivityCategory } from "@/lib/activity";
import clsx from "clsx";
import PageControls from "@/components/PageControls";
import RollbackPanel from "@/components/RollbackPanel";
import { isAdmin } from "@/lib/access";
import { historySince } from "@/lib/history";
import { fmtDateTime, fmtShort, SITE_TIME_ZONE } from "@/lib/time";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  // Every admin page checks for itself — a layout check alone can be skipped.
  const { roles } = await staffPage();
  const { category, page } = await searchParams;
  const activeCategory = category && category in activityCategoryLabels ? (category as ActivityCategory) : null;
  const showRollback = isAdmin(roles);
  const since = showRollback ? await historySince().catch(() => null) : null;
  const where = activeCategory ? eq(activityLog.category, activeCategory) : undefined;
  const [{ n: total }] = await db.select({ n: sql<number>`count(*)::int` }).from(activityLog).where(where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Out-of-range page numbers (typed or stale) land on the nearest real page.
  const pageNumber = Math.min(totalPages, Math.max(1, Number.parseInt(page ?? "1", 10) || 1));

  const visible = await db
    .select()
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(PAGE_SIZE)
    .offset((pageNumber - 1) * PAGE_SIZE);

  const href = (cat: string | null, p: number) => {
    const q = new URLSearchParams();
    if (cat) q.set("category", cat);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/portal/admin/activity${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Activity Log</h2>
          <p className="mt-1 text-sm text-ink-soft">Who did what, newest first (Eastern time). Entries can&apos;t be edited or deleted.</p>
        </div>
      </div>
      {showRollback && (
        <div className="mt-3">
          <RollbackPanel
            sinceText={since ? fmtDateTime(since) : "(not set up yet)"}
            todayIso={new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE }).format(new Date())}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {[{ key: null, label: "Everything" }, ...Object.entries(activityCategoryLabels).map(([key, label]) => ({ key, label }))].map((c) => (
          <Link
            key={c.key ?? "all"}
            href={href(c.key, 1)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs",
              (c.key ?? null) === activeCategory
                ? "border-primary bg-primary text-cream"
                : "border-cream-dark text-ink-soft hover:border-primary hover:text-primary"
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">Nothing here yet.</p>
      ) : (
        <>
          {/* Phones: one card per entry, so nothing has to scroll sideways. */}
          <ul className="mt-4 divide-y divide-cream-dark overflow-hidden rounded-lg border border-cream-dark bg-white sm:hidden">
            {visible.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3 text-xs text-ink-soft">
                  <span className="min-w-0 break-words font-medium text-ink">{r.actorLabel}</span>
                  <span className="shrink-0">{fmtShort(r.createdAt)}</span>
                </div>
                <p className="mt-1 break-words text-ink">
                  <span
                    className={clsx(
                      "mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      r.category === "security" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                    )}
                  >
                    {activityCategoryLabels[r.category as ActivityCategory] ?? r.category}
                  </span>
                  {r.summary}
                </p>
              </li>
            ))}
          </ul>
        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-cream-dark bg-white sm:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-dark bg-cream-dark/40 text-xs uppercase text-ink-soft">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">What</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-cream-dark align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">
                    {fmtShort(r.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{r.actorLabel}</td>
                  <td className="px-4 py-2.5 text-ink">
                    <span
                      className={clsx(
                        "mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        r.category === "security" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                      )}
                    >
                      {activityCategoryLabels[r.category as ActivityCategory] ?? r.category}
                    </span>
                    {r.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <PageControls
        page={pageNumber}
        totalPages={totalPages}
        basePath="/portal/admin/activity"
        params={activeCategory ? { category: activeCategory } : {}}
      />
      <p className="font-plain mt-2 text-center text-xs text-ink-soft/80">
        {total.toLocaleString("en-US")} {total === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
}
