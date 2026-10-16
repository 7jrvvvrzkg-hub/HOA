import { and, eq, desc, asc, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { Pin } from "lucide-react";
import AnnouncementCard from "@/components/AnnouncementCard";
import { announcementPriorityLabels } from "@/lib/labels";
import { SITE_TIME_ZONE } from "@/lib/time";

// slight alternating tilt so the board reads as a physical corkboard
// rather than a grid of uniform cards.
const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0"];

export default async function BulletinBoard() {
  // Everything EXCEPT the picture's bytes (those are fetched separately).
  const { imageData: _omit, ...columns } = getTableColumns(announcements);
  void _omit;
  const announcementList = await db
    .select(columns)
    .from(announcements)
    .where(and(eq(announcements.active, true), eq(announcements.audience, "ALL_RESIDENTS")))
    .orderBy(desc(announcements.pinned), asc(announcements.sortOrder), desc(announcements.createdAt))
    .limit(9);

  return (
    <section id="announcements" className="cork-texture py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <Pin className="text-cream" />
          <h2 className="text-2xl font-bold text-cream sm:text-3xl">
            Announcements
          </h2>
        </div>

        {announcementList.length === 0 ? (
          <p className="rounded-md bg-cream/90 p-6 text-ink-soft">
            No announcements posted yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {announcementList.map((a, i) => (
              <AnnouncementCard
                key={a.id}
                variant="sticky"
                tilt={tilts[i % tilts.length]}
                a={{
                  id: a.id,
                  title: a.title,
                  body: a.body,
                  priority: a.priority,
                  priorityLabel: announcementPriorityLabels[a.priority],
                  pinned: a.pinned,
                  dateText: a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: SITE_TIME_ZONE }),
                  imageUrl: a.imageMimeType ? `/api/announcement-image/${a.id}?v=${a.updatedAt.getTime()}` : null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
