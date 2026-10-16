"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, arrayContains, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, residentProfiles, adminAccounts, leads } from "@/db/schema";
import { requireStaff, BCRYPT_COST } from "@/lib/auth";
import { passwordProblem } from "@/lib/passwordPolicy";
import { requireStepUp } from "@/lib/stepUp";
import { isAdmin, canManageAccount } from "@/lib/access";
import { logActivity, nameOf } from "@/lib/activity";
import { roleLabels } from "@/lib/labels";
import { asActor, describeTx, undoTx, UNDO_SECONDS } from "@/lib/history";
import { notifySecurity } from "@/lib/securityNotice";
import { createUserSchema } from "@/lib/validation";
import type { RoleTag, PortalAccessLevel } from "@/db/schema";

export type CreateUserFormState = { ok: boolean; error?: string };
export type StepResult = { ok: true } | { ok: false; error: string };

/** null when the actor has recently entered a fresh code, else a plain message
 * (returned, not thrown, because production hides thrown messages from the
 * browser). */
async function lockedMessage(actorId: string): Promise<string | null> {
  try {
    await requireStepUp(actorId);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "locked";
  }
}

const defaultAccessLevel: Record<RoleTag, PortalAccessLevel> = {
  ADMIN: "FULL",
  DIRECTOR: "FULL",
  OWNER: "STANDARD",
  RENTER: "LIMITED",
};

/** Who is asking, with roles read fresh from the database (never the cached
 * session). Throws unless signed in as admin or director. */
async function staffActor() {
  const { session, roles } = await requireStaff();
  return { id: session.user.id, roles };
}

/** Load the account being changed and confirm this actor may change it:
 * any account for an admin; for a director only one they created themselves
 * within the last hour (see canManageAccount). */
async function loadManageable(actor: { id: string; roles: RoleTag[] }, userId: string) {
  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { residentProfile: true, adminAccount: true },
  });
  if (!target) throw new Error("user not found");
  if (!canManageAccount(actor, { roles: target.roles, createdById: target.createdById, createdAt: target.createdAt })) {
    throw new Error(
      isAdmin(actor.roles)
        ? "you can't change this account"
        : "directors can only change an account they created, and only within one hour of creating it"
    );
  }
  return target;
}

async function countOtherAdmins(excludingUserId: string) {
  return db.$count(users, and(arrayContains(users.roles, ["ADMIN"]), ne(users.id, excludingUserId)));
}

/** Staff: create a brand-new profile with a password. Admins can create any
 * kind. A director can only create owners and renters (never admins or other
 * directors), and the new account remembers who made it so that director can
 * fix a mistake during the next hour. */
export async function createUserProfile(
  _prev: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  const actor = await staffActor();

  const roles = formData.getAll("roles") as RoleTag[];
  if (roles.includes("ADMIN") || roles.includes("DIRECTOR")) {
    const locked = await lockedMessage(actor.id);
    if (locked) return { ok: false, error: locked };
  }
  if (!isAdmin(actor.roles) && roles.some((r) => r !== "OWNER" && r !== "RENTER")) {
    return { ok: false, error: "directors can only create owner or renter profiles" };
  }
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    roles,
    unit: formData.get("unit") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  const problem = passwordProblem(parsed.data.password, { email: parsed.data.email, name: parsed.data.fullName });
  if (problem) return { ok: false, error: problem };

  const normalizedEmail = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  if (existing) return { ok: false, error: "an account with that email already exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
  const isAdminRole = parsed.data.roles.includes("ADMIN") || parsed.data.roles.includes("DIRECTOR");
  const isResidentRole = parsed.data.roles.includes("OWNER") || parsed.data.roles.includes("RENTER");
  const primaryAccessLevel: PortalAccessLevel = isAdminRole
    ? "FULL"
    : defaultAccessLevel[parsed.data.roles[0]];

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        roles: parsed.data.roles,
        createdById: actor.id,
        // The temporary password is known to whoever created the account, so
        // the new person has to replace it with their own at first sign-in.
        mustChangePassword: true,
      })
      .returning();

    if (isAdminRole) {
      await tx.insert(adminAccounts).values({ userId: user.id, fullName: parsed.data.fullName });
    }
    if (isResidentRole) {
      await tx.insert(residentProfiles).values({
        userId: user.id,
        fullName: parsed.data.fullName,
        unit: parsed.data.unit || null,
        portalAccessLevel: primaryAccessLevel,
      });
    }
  });

  await logActivity({
    actorId: actor.id,
    category: "account",
    summary: `Created an account for ${parsed.data.fullName} (${normalizedEmail}) as ${parsed.data.roles.map((r) => roleLabels[r]).join(" + ")}`,
  });
  revalidatePath("/portal/admin/users");
  return { ok: true };
}

/** Add or remove a role tag on a profile — the "x to remove a
 * role" control. Adding OWNER/RENTER creates a ResidentProfile if missing;
 * adding ADMIN creates an AdminAccount if missing. Removing a role never
 * deletes the underlying profile record, just the tag, so re-adding it
 * later restores access without losing history.
 *
 * Two safety rules on top of the plain admin check:
 *  - nobody can change their OWN role tags (including granting roles back
 *    to themselves) — that has to come from a different admin account.
 *    This is deliberate even for admins: it closes off the "remove my own
 *    admin, then immediately re-add it" loop, and it's also *why* that loop
 *    was possible before — the acting admin's own session token still said
 *    "ADMIN" after the database row changed, because NextAuth bakes roles
 *    into the JWT at login and doesn't refresh it mid-session. requireAdmin()
 *    now re-checks the database on every call, but self-edits are blocked
 *    outright regardless, since a stale token isn't the only way this could
 *    go wrong.
 *  - the last remaining admin account can't have its ADMIN tag removed by
 *    anyone, since that would lock every admin out of the console for good. */
export async function setUserRoles(userId: string, roles: RoleTag[]): Promise<StepResult> {
  const actor = await staffActor();
  const locked = await lockedMessage(actor.id);
  if (locked) return { ok: false, error: locked };
  if (roles.length === 0) throw new Error("a profile needs at least one role");

  if (userId === actor.id) {
    throw new Error("you can't change your own roles — have another admin do it");
  }

  // A director's one-hour window only covers switching owner/renter.
  if (!isAdmin(actor.roles) && roles.some((r) => r !== "OWNER" && r !== "RENTER")) {
    throw new Error("directors can only use the owner and renter roles");
  }
  const user = await loadManageable(actor, userId);

  const losingAdmin = user.roles.includes("ADMIN") && !roles.includes("ADMIN");
  if (losingAdmin && (await countOtherAdmins(userId)) === 0) {
    throw new Error("can't remove the last admin account");
  }

  const needsResident = roles.includes("OWNER") || roles.includes("RENTER");
  const needsAdmin = roles.includes("ADMIN") || roles.includes("DIRECTOR");

  await db.transaction(async (tx) => {
    await tx.update(users).set({ roles, updatedAt: new Date() }).where(eq(users.id, userId));

    if (needsResident && !user.residentProfile) {
      await tx.insert(residentProfiles).values({ userId, fullName: user.email, portalAccessLevel: "STANDARD" });
    }
    if (needsAdmin && !user.adminAccount) {
      await tx.insert(adminAccounts).values({ userId, fullName: user.email });
    }
  });

  await logActivity({
    actorId: actor.id,
    category: "account",
    summary: `Changed roles for ${user.email} from ${user.roles.map((r) => roleLabels[r]).join(" + ")} to ${roles.map((r) => roleLabels[r]).join(" + ")}`,
  });
  revalidatePath("/portal/admin/users");
  revalidatePath(`/portal/admin/users/${userId}`);
  return { ok: true };
}

export async function updateResidentAccessLevel(profileId: string, level: PortalAccessLevel) {
  const actor = await staffActor();
  const profile = await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.id, profileId) });
  if (!profile) throw new Error("profile not found");
  const target = await loadManageable(actor, profile.userId);
  await db.update(residentProfiles).set({ portalAccessLevel: level }).where(eq(residentProfiles.id, profileId));
  await logActivity({ actorId: actor.id, category: "account", summary: `Set portal access for ${target.email} to ${level.toLowerCase()}` });
  revalidatePath("/portal/admin/users");
  return { ok: true };
}

/** Set a new password for an account. Admins for any account; a director
 * only for one they created, within the first hour. */
export async function setUserPassword(userId: string, password: string): Promise<StepResult> {
  const actor = await staffActor();
  const locked = await lockedMessage(actor.id);
  if (locked) return { ok: false, error: locked };
  const target = await loadManageable(actor, userId);
  const problem = passwordProblem(password, { email: target.email });
  if (problem) throw new Error(problem);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();
  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: now,
      passwordChangedAt: now,
      // Someone else chose this password, so the owner must replace it —
      // except when changing your own.
      mustChangePassword: userId !== actor.id,
    })
    .where(eq(users.id, userId));
  if (userId !== actor.id) {
    await notifySecurity(target.email, "Your password was just changed by the office. You'll be asked to choose your own the next time you sign in.");
  }
  await logActivity({ actorId: actor.id, category: "account", summary: `Changed the password for ${target.email}` });
  revalidatePath(`/portal/admin/users/${userId}`);
  return { ok: true };
}

/** Permanently delete a login and everything tied to it
 * (resident profile, admin account, private notes/communication log —
 * all cascade at the database level). Blocked for your own account and for
 * the last remaining admin, same reasoning as setUserRoles above. Content a
 * user authored (documents, announcements) has a required author reference
 * with no cascade, so deleting an account that posted any of that fails
 * with a clear error instead of silently orphaning rows. */
export type DeleteResult = { ok: true; undoToken: string; label: string } | { ok: false; error: string };

export async function deleteUserAccount(userId: string): Promise<DeleteResult> {
  const actor = await staffActor();
  const locked = await lockedMessage(actor.id);
  if (locked) return { ok: false, error: locked };
  if (userId === actor.id) return { ok: false, error: "you can't delete your own account" };

  let user;
  try {
    user = await loadManageable(actor, userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "you can't change this account" };
  }

  if (user.roles.includes("ADMIN") && (await countOtherAdmins(userId)) === 0) {
    return { ok: false, error: "can't delete the last admin account" };
  }

  const deletedLabel = await nameOf(userId);
  let txid: string;
  try {
    // One transaction, labelled with who did it, so "Undo" can put all of it
    // back (the account, its profile, its documents and notes).
    ({ txid } = await asActor(actor.id, async (tx) => {
      // leads.assignedToId is nullable, so free it up rather than blocking the delete on it.
      await tx.update(leads).set({ assignedToId: null }).where(eq(leads.assignedToId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    }));
  } catch {
    return {
      ok: false,
      error: "can't delete this account — it authored documents or announcements; reassign or delete those first",
    };
  }
  await logActivity({ actorId: actor.id, category: "account", summary: `Deleted the account for ${deletedLabel}` });

  revalidatePath("/portal/admin/users");
  return { ok: true, undoToken: txid, label: deletedLabel };
}

/** Put a just-deleted account back (only by whoever deleted it, shortly after). */
export async function undoDeleteAccount(undoToken: string): Promise<StepResult> {
  const actor = await staffActor();
  const info = await describeTx(String(undoToken ?? ""));
  if (!info || !info.firstUserDelete) return { ok: false, error: "nothing to undo" };
  if (info.actorId !== actor.id) return { ok: false, error: "only the person who deleted the account can undo it" };
  if (info.ageSeconds > UNDO_SECONDS) return { ok: false, error: "it's too late to undo that here — use Roll back in the Activity log" };
  try {
    await undoTx(String(undoToken), actor.id);
  } catch (e) {
    console.error("[undo] failed", e);
    return { ok: false, error: "couldn't undo that — nothing was changed" };
  }
  const restored = String(info.firstUserDelete.email ?? "the account");
  await logActivity({ actorId: actor.id, category: "account", summary: `Undid the deletion of the account for ${restored}` });
  revalidatePath("/portal/admin/users");
  return { ok: true };
}
