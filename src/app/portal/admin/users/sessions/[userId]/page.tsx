import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Laptop, Monitor, Smartphone, Tablet, MapPin, Globe } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, getFreshRoles, staffPage } from "@/lib/auth";
import { canManageAccount } from "@/lib/access";
import { listSessions } from "@/lib/sessions";
import { placeText } from "@/lib/device";
import { fmtDateTime } from "@/lib/time";
import { EndAllButton, EndSessionButton } from "@/components/SessionButtons";

function DeviceIcon({ device }: { device: string }) {
  const cls = "shrink-0 text-primary";
  if (/iPhone|phone/i.test(device)) return <Smartphone size={22} className={cls} />;
  if (/iPad|tablet/i.test(device)) return <Tablet size={22} className={cls} />;
  if (/Mac|Chromebook|Linux/i.test(device)) return <Laptop size={22} className={cls} />;
  return <Monitor size={22} className={cls} />;
}

function ago(d: Date) {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

export default async function UserSessionsPage({ params }: { params: Promise<{ userId: string }> }) {
  // Every admin page checks for itself — a layout check alone can be skipped.
  await staffPage();
  const { userId } = await params;
  const session = await getSession();
  const myRoles = await getFreshRoles(session!.user.id);

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, email: true, roles: true, createdById: true, createdAt: true },
    with: { residentProfile: { columns: { fullName: true } }, adminAccount: { columns: { fullName: true } } },
  });
  if (!target) notFound();

  const isSelf = target.id === session!.user.id;
  const canEnd = isSelf || canManageAccount({ id: session!.user.id, roles: myRoles }, target);
  const name = target.adminAccount?.fullName ?? target.residentProfile?.fullName ?? target.email;

  const all = await listSessions(target.id);
  const now = Date.now();
  const active = all.filter((s) => !s.revokedAt && s.expiresAt.getTime() > now);
  const past = all.filter((s) => !(!s.revokedAt && s.expiresAt.getTime() > now));
  const others = active.filter((s) => s.id !== session!.sid).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/admin/users" className="text-sm text-primary hover:underline">← Back to Users</Link>
        <h2 className="mt-2 text-lg font-semibold text-primary">Sign-ins for {name}</h2>
        <p className="font-plain mt-0.5 break-all text-sm text-ink-soft">{target.email}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Signed in now ({active.length})</h3>
        {canEnd ? (
          <EndAllButton userId={target.id} count={isSelf ? others : active.length} isSelf={isSelf} />
        ) : (
          <p className="text-xs text-ink-soft">View only: you can end sign-ins only for accounts you manage.</p>
        )}
      </div>

      {active.length === 0 ? (
        <p className="rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">Not signed in anywhere right now.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((s) => {
            const here = s.id === session!.sid;
            return (
              <li key={s.id} className="rounded-lg border border-cream-dark bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <DeviceIcon device={s.device} />
                    <div className="min-w-0">
                      <p className="font-plain font-semibold text-ink">
                        {s.device} · {s.browser ?? "Browser"}
                        {here && (
                          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-cream">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="font-plain mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                        <MapPin size={14} className="mt-0.5 shrink-0" /> {placeText(s)}
                      </p>
                      <p className="font-plain mt-0.5 flex items-start gap-1.5 break-all text-sm text-ink-soft">
                        <Globe size={14} className="mt-0.5 shrink-0" /> IP {s.ip ?? "unknown"}
                      </p>
                      <p className="font-plain mt-1 text-xs text-ink-soft/80">
                        Signed in {fmtDateTime(s.createdAt)} · last active {ago(s.lastSeenAt)}
                      </p>
                    </div>
                  </div>
                  {canEnd && !here && <EndSessionButton sessionId={s.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Earlier sign-ins (last 30 days)</h3>
          <ul className="mt-3 divide-y divide-cream-dark overflow-hidden rounded-lg border border-cream-dark bg-white">
            {past.map((s) => (
              <li key={s.id} className="font-plain flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-ink">
                  {s.device} · {s.browser ?? "Browser"}
                  <span className="text-ink-soft"> — {placeText(s)}{s.ip ? ` · ${s.ip}` : ""}</span>
                </span>
                <span className="text-xs text-ink-soft">
                  {fmtDateTime(s.createdAt)} ·{" "}
                  {s.revokedAt ? (s.revokedReason ?? "ended") : "expired"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
