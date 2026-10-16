import Link from "next/link";
import { desc, asc, getTableColumns } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { canView, isStaff } from "@/lib/access";
import { announcementPriorityLabels } from "@/lib/labels";
import { Megaphone, Pencil } from "lucide-react";
import AnnouncementCard from "@/components/AnnouncementCard";
import { SITE_TIME_ZONE } from "@/lib/time";

export default async function AnnouncementsPage() {
  const session = await getSession();
  const roles = await getFreshRoles(session!.user.id);
  const isAdmin = isStaff(roles);

  const { imageData: _omit, ...columns } = getTableColumns(announcements);
  void _omit;
  const all = await db
    .select(columns)
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
          <AnnouncementCard
            key={a.id}
            variant="list"
            a={{
              id: a.id,
              title: a.title,
              body: a.body,
              priority: a.priority,
              priorityLabel: announcementPriorityLabels[a.priority],
              pinned: a.pinned,
              inactive: !a.active,
              dateText: a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: SITE_TIME_ZONE }),
              imageUrl: a.imageMimeType ? `/api/announcement-image/${a.id}?v=${a.updatedAt.getTime()}` : null,
            }}
          />
        ))}
      </div>
    </div>
  );
}
