import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { activityCategoryLabels, type ActivityCategory } from "@/lib/activity";
import clsx from "clsx";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page } = await searchParams;
  const activeCategory = category && category in activityCategoryLabels ? (category as ActivityCategory) : null;
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const rows = await db
    .select()
    .from(activityLog)
    .where(activeCategory ? eq(activityLog.category, activeCategory) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((pageNumber - 1) * PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  const href = (cat: string | null, p: number) => {
    const q = new URLSearchParams();
    if (cat) q.set("category", cat);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/portal/admin/activity${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-primary">Activity Log</h2>
      <p className="mt-1 text-sm text-ink-soft">Who did what, newest first. Entries can&apos;t be edited or deleted.</p>

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
        <div className="mt-4 overflow-x-auto rounded-lg border border-cream-dark bg-white">
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
                    {r.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        {pageNumber > 1 ? (
          <Link href={href(activeCategory, pageNumber - 1)} className="text-primary hover:underline">← Newer</Link>
        ) : <span />}
        {hasMore && (
          <Link href={href(activeCategory, pageNumber + 1)} className="text-primary hover:underline">Older →</Link>
        )}
      </div>
    </div>
  );
}
