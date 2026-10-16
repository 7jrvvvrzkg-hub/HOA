import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionState, mfaRequiredRoles } from "@/lib/auth";
import { ChangePasswordPanel, TwoStepSetupPanel, TwoStepManagePanel, SignOutLink } from "@/components/SecurityPanels";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account security — Tazewell Place", robots: { index: false, follow: false } };

/** The one page a signed-in person with an outstanding security step can reach:
 * replace a temporary password, or turn on two-step login. Everyone else uses
 * it to manage the same things. */
export default async function SecurityPage() {
  const state = await getSessionState();
  if (!state) redirect("/login?from=/security");
  const user = await db.query.users.findFirst({
    where: eq(users.id, state.session.user.id),
    columns: { email: true, roles: true, totpEnabledAt: true, recoveryCodes: true },
  });
  if (!user) redirect("/login");

  const required = user.roles.some((r) => mfaRequiredRoles().has(r));

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
            <ShieldCheck size={24} /> Account security
          </h1>
          <SignOutLink />
        </div>
        <p className="font-plain text-sm text-ink-soft">{user.email}</p>

        {state.gate === "change-password" && <ChangePasswordPanel forced />}

        {state.gate === "setup-2fa" && <TwoStepSetupPanel required />}

        {state.gate === null && (
          <>
            <Link href="/portal" className="text-sm text-primary hover:underline">← Back to the portal</Link>
            {user.totpEnabledAt ? (
              <TwoStepManagePanel canTurnOff={!required} backupLeft={user.recoveryCodes.length} />
            ) : (
              <TwoStepSetupPanel required={false} />
            )}
            <ChangePasswordPanel forced={false} />
          </>
        )}
      </div>
    </div>
  );
}
