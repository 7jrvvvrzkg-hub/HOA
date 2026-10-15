import type { RoleTag, DocVisibility } from "@/db/schema";

/** Roles a signed-in user's session carries. Admins can also carry OWNER or RENTER. */
export type SessionRoles = RoleTag[];

export function isAdmin(roles: SessionRoles) {
  return roles.includes("ADMIN");
}

/** Directors are the board: they see everything an admin sees. What they can
 * *change* is narrower (see the director rules below and in the actions). */
export function isDirector(roles: SessionRoles) {
  return roles.includes("DIRECTOR");
}

/** Admin or director — anyone who gets the staff side of the portal. */
export function isStaff(roles: SessionRoles) {
  return isAdmin(roles) || isDirector(roles);
}

/** How long a director can still edit or delete an account they created. */
export const DIRECTOR_EDIT_WINDOW_MS = 60 * 60 * 1000;

/** Can this person change or delete this account? Admins always (the action
 * adds its own guards, like not deleting yourself). A director only for an
 * account they created themselves, within the first hour, and never for one
 * that carries ADMIN or DIRECTOR. */
export function canManageAccount(
  actor: { id: string; roles: SessionRoles },
  target: { roles: SessionRoles; createdById: string | null; createdAt: Date }
) {
  if (isAdmin(actor.roles)) return true;
  if (!isDirector(actor.roles)) return false;
  if (target.createdById !== actor.id) return false;
  if (target.roles.includes("ADMIN") || target.roles.includes("DIRECTOR")) return false;
  return Date.now() - target.createdAt.getTime() < DIRECTOR_EDIT_WINDOW_MS;
}

export function isOwner(roles: SessionRoles) {
  return roles.includes("OWNER");
}

export function isRenter(roles: SessionRoles) {
  return roles.includes("RENTER");
}

/** Highest access level implied by a role set, for display / defaults only —
 * the real gate on any given page or action is the explicit check there. */
export function accessLevelLabel(roles: SessionRoles) {
  if (isAdmin(roles)) return "full (admin)";
  if (isDirector(roles)) return "full (director)";
  if (isOwner(roles)) return "standard (owner)";
  if (isRenter(roles)) return "limited (renter)";
  return "none";
}

/** Can this role set view a document/announcement with the given visibility?
 * Doesn't handle "PERSONAL" — that one needs to know *which* resident the
 * document is for, not just their role, so it's not something a role set
 * alone can answer. See canViewDocument below. */
export function canView(roles: SessionRoles, visibility: DocVisibility) {
  if (isStaff(roles)) return true;
  switch (visibility) {
    case "ALL_RESIDENTS":
      return isOwner(roles) || isRenter(roles);
    case "OWNERS_ONLY":
      return isOwner(roles);
    case "RENTERS_ONLY":
      return isRenter(roles);
    case "ADMIN_ONLY":
      return false;
    case "PERSONAL":
      return false;
    default:
      return false;
  }
}

/** Same question as canView, but for a document specifically — handles the
 * "PERSONAL" case (visible only to the one resident it's assigned to, plus
 * any admin) by also checking who's asking, not just their role. */
export function canViewDocument(
  roles: SessionRoles,
  userId: string,
  doc: { visibility: DocVisibility; assignedToId: string | null }
) {
  if (isStaff(roles)) return true;
  if (doc.visibility === "PERSONAL") return doc.assignedToId === userId;
  return canView(roles, doc.visibility);
}

/** Whole minutes left in a director's edit window for an account. */
export function editMinutesLeft(createdAt: Date) {
  return Math.max(0, Math.ceil((createdAt.getTime() + DIRECTOR_EDIT_WINDOW_MS - Date.now()) / 60000));
}
