import { desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { deleteAnnouncement, reorderAnnouncement } from "@/actions/announcements";
import AnnouncementForm from "@/components/AnnouncementForm";
import { Button } from "@/components/Button";
import { ChevronUp, ChevronDown } from "lucide-react";

export default async function AdminAnnouncementsPage() {
  const announcementList = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.pinned), asc(announcements.sortOrder), desc(announcements.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">place holder (new announcement heading)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          place holder (bulletin board subheading — this feeds the pinned-note board on the homepage)
        </p>
        <div className="mt-3">
          <AnnouncementForm />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">place holder (manage announcements heading)</h2>
        <div className="mt-3 space-y-4">
          {announcementList.map((a) => (
            <details key={a.id} className="rounded-lg border border-cream-dark bg-white">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium text-ink">
                  {a.pinned ? "📌 " : ""}
                  {a.title}
                  {!a.active && <span className="ml-2 text-xs text-ink-soft">(inactive)</span>}
                </span>
                <span className="flex items-center gap-1">
                  <form action={reorderAnnouncement.bind(null, a.id, "up")}>
                    <Button type="submit" size="sm" variant="ghost"><ChevronUp size={14} /></Button>
                  </form>
                  <form action={reorderAnnouncement.bind(null, a.id, "down")}>
                    <Button type="submit" size="sm" variant="ghost"><ChevronDown size={14} /></Button>
                  </form>
                  <form action={deleteAnnouncement.bind(null, a.id)}>
                    <Button type="submit" size="sm" variant="danger">place holder (delete label)</Button>
                  </form>
                </span>
              </summary>
              <div className="border-t border-cream-dark p-4">
                <AnnouncementForm existing={a} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
