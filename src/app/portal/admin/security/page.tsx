import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { getSession, getFreshRoles, mfaRequiredRoles } from "@/lib/auth";
import { isAdmin } from "@/lib/access";
import { getEncryptionStatus } from "@/actions/security";
import { EncryptNowButton, ResetTwoStepButton } from "@/components/SecurityAdminButtons";
import { roleLabels } from "@/lib/labels";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

function Row({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />}
      <span className={ok ? "text-ink" : "text-danger"}>{children}</span>
    </li>
  );
}

export default async function SecurityAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const roles = await getFreshRoles(session.user.id);
  if (!isAdmin(roles)) redirect("/portal/admin");

  const status = await getEncryptionStatus();
  const pending = status.documents.pending + status.forms.pending + status.submissions.pending;
  const required = mfaRequiredRoles();

  const people = await db.query.users.findMany({
    columns: { id: true, email: true, roles: true, totpEnabledAt: true },
    with: { adminAccount: { columns: { fullName: true } }, residentProfile: { columns: { fullName: true } } },
    orderBy: (u, { asc }) => [asc(u.email)],
  });
  const needTwoStep = people.filter((p) => p.roles.some((r) => required.has(r)));
  const withoutTwoStep = needTwoStep.filter((p) => !p.totpEnabledAt);
  const testAccounts = people.filter((p) => p.email.endsWith("@hoa.test"));
  const optionalOn = people.filter((p) => p.totpEnabledAt && !p.roles.some((r) => required.has(r))).length;

  const events = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.category, "security"))
    .orderBy(desc(activityLog.createdAt))
    .limit(25);
  const [{ fails }] = await db
    .select({ fails: sql<number>`count(*)::int` })
    .from(activityLog)
    .where(sql`${activityLog.category} = 'security' and ${activityLog.summary} like 'Failed sign-in%' and ${activityLog.createdAt} > now() - interval '24 hours'`);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-cream-dark bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">Protection checklist</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <Row ok={status.configured}>
            {status.configured
              ? "Files are encrypted before they are stored (the key is held only in the hosting settings, not the database)."
              : "No encryption key is set on the server. Uploads are refused until DATA_ENCRYPTION_KEY is added in the hosting settings."}
          </Row>
          <Row ok={pending === 0 && status.configured}>
            {pending === 0 && status.configured
              ? "Everything stored is encrypted."
              : `${pending} stored item${pending === 1 ? " is" : "s are"} not encrypted yet — use the button below.`}
          </Row>
          <Row ok={withoutTwoStep.length === 0}>
            {withoutTwoStep.length === 0
              ? "Every admin and director has two-step login on."
              : `${withoutTwoStep.length} admin/director account${withoutTwoStep.length === 1 ? " has" : "s have"} not set up two-step login — until they do, those accounts are locked out of everything.`}
          </Row>
          <Row ok={testAccounts.length === 0}>
            {testAccounts.length === 0
              ? "No test accounts remain."
              : `${testAccounts.length} test account${testAccounts.length === 1 ? "" : "s"} (@hoa.test) still exist with known passwords. Delete them before real use (SQL file 11).`}
          </Row>
        </ul>
      </section>

      <section className="rounded-lg border border-cream-dark bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">Encrypted storage</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-ink-soft">
            <tr><th className="py-1">What</th><th>Stored</th><th>Not yet encrypted</th></tr>
          </thead>
          <tbody>
            {[
              ["Documents", status.documents],
              ["Fillable forms", status.forms],
              ["Filled-out forms", status.submissions],
            ].map(([label, v]) => {
              const x = v as { total: number; pending: number };
              return (
                <tr key={label as string} className="border-t border-cream-dark">
                  <td className="py-2">{label as string}</td>
                  <td>{x.total}</td>
                  <td className={x.pending > 0 ? "font-semibold text-danger" : ""}>{x.pending}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {status.configured && <EncryptNowButton pending={pending} />}
      </section>

      <section className="rounded-lg border border-cream-dark bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">Two-step login</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Required for: {[...required].map((r) => roleLabels[r as keyof typeof roleLabels] ?? r).join(", ")}. Optional for everyone else
          ({optionalOn} resident{optionalOn === 1 ? "" : "s"} turned it on).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr><th className="py-1">Account</th><th>Role</th><th>Two-step</th><th /></tr>
            </thead>
            <tbody>
              {needTwoStep.map((p) => (
                <tr key={p.id} className="border-t border-cream-dark">
                  <td className="py-2 pr-3">
                    {p.adminAccount?.fullName ?? p.residentProfile?.fullName ?? ""}
                    <div className="font-plain text-xs text-ink-soft">{p.email}</div>
                  </td>
                  <td className="pr-3">{p.roles.map((r) => roleLabels[r]).join(" + ")}</td>
                  <td className={p.totpEnabledAt ? "text-primary" : "font-semibold text-danger"}>{p.totpEnabledAt ? "On" : "Not set up"}</td>
                  <td className="text-right">
                    {p.totpEnabledAt && p.id !== session.user.id && <ResetTwoStepButton userId={p.id} email={p.email} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-cream-dark bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">Recent security events</h2>
        <p className="mt-1 text-sm text-ink-soft">{fails} failed sign-in{fails === 1 ? "" : "s"} in the last 24 hours.</p>
        <ul className="mt-3 divide-y divide-cream-dark text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-plain text-ink-soft">{e.actorLabel}</span> — {e.summary}
              </span>
              <span className="text-ink-soft">
                {e.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          ))}
          {events.length === 0 && <li className="py-2 text-ink-soft">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}
