import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { Pin } from "lucide-react";
import clsx from "clsx";

const priorityStyle: Record<string, { pin: string; ring: string; tag: string }> = {
  URGENT: { pin: "text-danger", ring: "ring-danger/40", tag: "bg-danger text-cream" },
  IMPORTANT: { pin: "text-warning", ring: "ring-warning/40", tag: "bg-warning text-ink" },
  NORMAL: { pin: "text-primary", ring: "ring-primary/20", tag: "bg-primary/10 text-primary" },
};

// slight alternating tilt so the board reads as a physical corkboard
// rather than a grid of uniform cards.
const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0"];

export default async function BulletinBoard() {
  const announcementList = await db
    .select()
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
            {announcementList.map((a, i) => {
              const style = priorityStyle[a.priority] ?? priorityStyle.NORMAL;
              return (
                <div
                  key={a.id}
                  className={clsx(
                    "pin-card relative rounded-sm bg-[#fdf6e3] p-5 shadow-lg ring-1 transition-transform hover:-translate-y-1 hover:rotate-0",
                    tilts[i % tilts.length],
                    style.ring
                  )}
                >
                  <Pin
                    size={22}
                    className={clsx("absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow", style.pin)}
                    fill="currentColor"
                  />
                  {a.pinned && (
                    <span className={clsx("absolute -top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", style.tag)}>
                      pinned
                    </span>
                  )}
                  <h3 className="mt-2 font-semibold text-ink">{a.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm text-ink-soft">{a.body}</p>
                  <p className="mt-3 text-xs text-ink-soft/70">
                    {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
