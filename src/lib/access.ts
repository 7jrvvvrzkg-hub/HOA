import type { RoleTag, DocVisibility } from "@/db/schema";

/** Roles a signed-in user's session carries. Admins can also carry OWNER or RENTER. */
export type SessionRoles = RoleTag[];

export function isAdmin(roles: SessionRoles) {
  return roles.includes("ADMIN");
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
  if (isOwner(roles)) return "standard (owner)";
  if (isRenter(roles)) return "limited (renter)";
  return "none";
}

/** Can this role set view a document/announcement with the given visibility?
 * Doesn't handle "PERSONAL" — that one needs to know *which* resident the
 * document is for, not just their role, so it's not something a role set
 * alone can answer. See canViewDocument below. */
export function canView(roles: SessionRoles, visibility: DocVisibility) {
  if (isAdmin(roles)) return true;
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
  if (isAdmin(roles)) return true;
  if (doc.visibility === "PERSONAL") return doc.assignedToId === userId;
  return canView(roles, doc.visibility);
}
