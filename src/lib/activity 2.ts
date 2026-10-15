import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, users } from "@/db/schema";

export type ActivityCategory = "account" | "document" | "folder" | "announcement" | "form" | "lead" | "security";

export const activityCategoryLabels: Record<ActivityCategory, string> = {
  account: "Accounts",
  document: "Documents",
  folder: "Folders",
  announcement: "Announcements",
  form: "Forms",
  lead: "Leads",
  security: "Sign-ins & security",
};

/** A readable name for someone: their profile name, else their email. */
export async function nameOf(userId: string | null | undefined): Promise<string> {
  if (!userId) return "Someone";
  try {
    const u = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
      with: { residentProfile: { columns: { fullName: true } }, adminAccount: { columns: { fullName: true } } },
    });
    if (!u) return "A deleted account";
    const name = u.adminAccount?.fullName ?? u.residentProfile?.fullName;
    // Seed/test names are placeholders; the email is more useful then.
    return name && !name.startsWith("place holder") ? `${name} (${u.email})` : u.email;
  } catch {
    return "Someone";
  }
}

/** Write one line to the activity log. Never throws: a logging problem must
 * never stop the real action it describes. The log is append-only; nothing
 * in the app edits or removes rows. */
export async function logActivity(args: {
  actorId?: string | null;
  /** Use when there's no signed-in person (a failed sign-in, a reset link). */
  actorLabel?: string;
  category: ActivityCategory;
  summary: string;
}) {
  try {
    const actorLabel = args.actorLabel ?? (await nameOf(args.actorId));
    await db.insert(activityLog).values({
      actorId: args.actorId ?? null,
      actorLabel: actorLabel.slice(0, 200),
      category: args.category,
      summary: args.summary.slice(0, 400),
    });
  } catch (e) {
    console.error("[activity-log] couldn't write entry", e);
  }
}
