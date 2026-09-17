import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";
import { Users, Mail, Phone, Home } from "lucide-react";

export default async function DirectoryPage() {
  const session = await getSession();
  const roles = session!.user.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  const profiles = await db.query.residentProfiles.findMany({
    orderBy: asc(residentProfiles.fullName),
    with: { user: { columns: { email: true } } },
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
            <p className="font-semibold text-ink">{p.fullName}</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}
