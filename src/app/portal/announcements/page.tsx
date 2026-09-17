import Link from "next/link";
import { desc, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { canView } from "@/lib/access";
import { announcementPriorityLabels } from "@/lib/labels";
import { Megaphone, Pin, Pencil } from "lucide-react";
import clsx from "clsx";

const priorityTag: Record<string, string> = {
  URGENT: "bg-danger text-cream",
  IMPORTANT: "bg-warning text-ink",
  NORMAL: "bg-primary/10 text-primary",
};

export default async function AnnouncementsPage() {
  const session = await getSession();
  const roles = session!.user.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  const all = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.pinned), asc(announcements.sortOrder), desc(announcements.createdAt));
  const visible = all.filter((a) => (isAdmin ? true : a.active && canView(roles, a.audience)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="text-primary" size={22} />
          <h1 className="text-2xl font-bold text-primary">Announcements</h1>
        </div>
        {isAdmin && (
          <Link
            href="/portal/admin/announcements"
            className="flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-cream"
          >
            <Pencil size={14} /> Manage Announcements
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {visible.map((a) => (
          <div key={a.id} className="rounded-lg border border-cream-dark bg-white p-5">
            <div className="flex items-center gap-2">
              {a.pinned && <Pin size={14} className="text-accent" />}
              <h3 className="font-semibold text-ink">{a.title}</h3>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", priorityTag[a.priority])}>
                {announcementPriorityLabels[a.priority]}
              </span>
              {!a.active && (
                <span className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-soft">
                  inactive
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-soft">{a.body}</p>
            <p className="mt-2 text-xs text-ink-soft/70">
              {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
