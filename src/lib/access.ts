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

/** Can this role set view a document/announcement with the given visibility? */
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
    default:
      return false;
  }
}
