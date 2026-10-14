import Link from "next/link";
import { desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, documents, announcements, leads, formSubmissions, activityLog } from "@/db/schema";
import { getStaffAttention, awaitingReview } from "@/lib/attention";
import { activityCategoryLabels, type ActivityCategory } from "@/lib/activity";
import NeedsDot from "@/components/NeedsDot";
import { Users, FileText, Megaphone, Inbox, ClipboardList, CheckCircle2 } from "lucide-react";

const shortDate = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Section({
  title,
  count,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  count: number;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-cream-dark bg-white p-5" data-review-section={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          {title} <NeedsDot show={count > 0} />
          {count > 0 && <span className="text-sm font-normal text-ink-soft">({count})</span>}
        </h3>
        <Link href={href} className="whitespace-nowrap text-sm text-primary hover:underline">{hrefLabel} →</Link>
      </div>
      {children}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [userCount, documentCount, announcementCount, openLeadCount, attention] = await Promise.all([
    db.$count(users),
    db.$count(documents),
    db.$count(announcements, eq(announcements.active, true)),
    db.$count(leads, ne(leads.status, "RESOLVED")),
    getStaffAttention(),
  ]);

  const [pendingForms, newLeads, pendingDocs, recent] = await Promise.all([
    db.query.formSubmissions.findMany({
      where: isNull(formSubmissions.reviewedAt),
      orderBy: desc(formSubmissions.createdAt),
      limit: 5,
      with: {
        submittedBy: {
          columns: { email: true },
          with: { residentProfile: { columns: { fullName: true } }, adminAccount: { columns: { fullName: true } } },
        },
      },
    }),
    db.query.leads.findMany({ where: eq(leads.status, "NEW"), orderBy: desc(leads.createdAt), limit: 5 }),
    db.query.documents.findMany({
      where: awaitingReview,
      orderBy: desc(documents.createdAt),
      limit: 5,
      columns: { id: true, title: true, createdAt: true },
      with: { uploadedBy: { columns: { email: true }, with: { residentProfile: { columns: { fullName: true } } } } },
    }),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(8),
  ]);

  const cards = [
    { href: "/portal/admin/users", label: "Total Accounts", value: userCount, icon: Users, dot: false },
    { href: "/portal/documents", label: "Documents on File", value: documentCount, icon: FileText, dot: attention.documents > 0 },
    { href: "/portal/admin/announcements", label: "Active Announcements", value: announcementCount, icon: Megaphone, dot: false },
    { href: "/portal/admin/leads", label: "Open Leads", value: openLeadCount, icon: Inbox, dot: attention.leads > 0 },
    { href: "/portal/admin/forms", label: "Forms to Review", value: attention.forms, icon: ClipboardList, dot: attention.forms > 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <c.icon className="text-primary" />
              <NeedsDot show={c.dot} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">To Review</h2>
        {attention.total === 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-cream-dark bg-white p-5 text-sm text-ink-soft">
            <CheckCircle2 size={18} className="text-primary" /> You&apos;re all caught up.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <Section title="Submitted Forms" count={attention.forms} href="/portal/admin/forms" hrefLabel="Open">
              {pendingForms.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">Nothing waiting.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {pendingForms.map((s) => (
                    <li key={s.id}>
                      <p className="font-medium text-ink">{s.formTitle}</p>
                      <p className="text-xs text-ink-soft">
                        {s.submittedBy.residentProfile?.fullName ?? s.submittedBy.adminAccount?.fullName ?? s.submittedBy.email} · {shortDate(s.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="New Leads" count={attention.leads} href="/portal/admin/leads" hrefLabel="Open">
              {newLeads.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">Nothing waiting.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {newLeads.map((l) => (
                    <li key={l.id}>
                      <p className="font-medium text-ink">{l.name}</p>
                      <p className="line-clamp-1 text-xs text-ink-soft">{l.message}</p>
                      <p className="text-xs text-ink-soft">{shortDate(l.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Resident Uploads" count={attention.documents} href="/portal/documents" hrefLabel="Open">
              {pendingDocs.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">Nothing waiting.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {pendingDocs.map((d) => (
                    <li key={d.id}>
                      <p className="font-medium text-ink">{d.title}</p>
                      <p className="text-xs text-ink-soft">
                        {d.uploadedBy.residentProfile?.fullName ?? d.uploadedBy.email} · {shortDate(d.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
          <Link href="/portal/admin/activity" className="text-sm text-primary hover:underline">See everything →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="text-ink">
                  <span className="font-medium">{r.actorLabel}</span> — {r.summary}
                </span>
                <span className="whitespace-nowrap text-xs text-ink-soft">
                  {activityCategoryLabels[r.category as ActivityCategory] ?? r.category} · {shortDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
