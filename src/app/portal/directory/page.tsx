import { asc } from "drizzle-orm";
import Link from "next/link";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";
import { addAdminNote } from "@/actions/notes";
import { Button } from "@/components/Button";
import { Users, Mail, Phone, Home, StickyNote } from "lucide-react";

export default async function DirectoryPage() {
  const session = await getSession();
  // Fresh from the database, not the session's cached roles — same
  // reasoning as every other access check in this app (see src/lib/auth.ts).
  const roles = await getFreshRoles(session!.user.id);
  const isAdmin = roles.includes("ADMIN");

  // adminNotes is always fetched here, but a Server Component only ever
  // sends the client what its JSX actually renders — and the JSX below
  // only renders this for an admin viewer, so a resident's page never
  // includes it regardless.
  const profiles = await db.query.residentProfiles.findMany({
    orderBy: asc(residentProfiles.fullName),
    with: {
      user: { columns: { email: true } },
      adminNotes: { orderBy: (t, { desc }) => desc(t.createdAt), with: { author: { columns: { email: true } } } },
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">Resident Directory</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        Residents only see the optional details each person has chosen to share.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-lg border border-cream-dark bg-white p-5">
            <div className="flex items-center gap-3">
              {p.avatarMimeType ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route, not an optimizable static asset
                <img
                  src={`/portal/avatars/${p.id}`}
                  alt=""
                  className="h-10 w-10 rounded-full border border-cream-dark object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cream-dark bg-cream-dark/40">
                  <Users size={16} className="text-ink-soft" />
                </div>
              )}
              <p className="font-semibold text-ink">{p.fullName}</p>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {(isAdmin || p.shareUnit) && p.unit && (
                <p className="flex items-center gap-2">
                  <Home size={14} className="text-accent" /> {p.unit}
                </p>
              )}
              {(isAdmin || p.sharePhone) && p.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={14} className="text-accent" /> {p.phone}
                </p>
              )}
              {(isAdmin || p.shareContactEmail) && (p.contactEmail || p.user.email) && (
                <p className="flex items-center gap-2">
                  <Mail size={14} className="text-accent" /> {p.contactEmail ?? p.user.email}
                </p>
              )}
              {!p.shareUnit && !p.sharePhone && !p.shareContactEmail && !isAdmin && (
                <p className="italic text-ink-soft/70">
                  This resident hasn&apos;t shared any optional info.
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 border-t border-cream-dark pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <StickyNote size={12} className="text-accent-dark" /> Admin Notes (private)
                </p>
                {p.adminNotes[0] && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink" title={p.adminNotes[0].body}>
                    {p.adminNotes[0].body}
                  </p>
                )}
                <form action={addAdminNote.bind(null, p.id)} className="mt-2 flex gap-1.5">
                  <input
                    name="body"
                    placeholder="Jot something down…"
                    className="min-w-0 flex-1 rounded-md border border-cream-dark px-2 py-1 text-xs"
                  />
                  <Button type="submit" size="sm" variant="outline">Add</Button>
                </form>
                {p.adminNotes.length > 0 && (
                  <Link
                    href={`/portal/admin/users/${p.id}`}
                    className="mt-1.5 inline-block text-xs text-primary hover:underline"
                  >
                    View all {p.adminNotes.length} note{p.adminNotes.length === 1 ? "" : "s"} →
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
