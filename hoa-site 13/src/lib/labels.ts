// Human-readable labels for enum values, kept in one place so casing stays
// consistent everywhere a value is shown (dropdown options, table cells,
// badges). Real interface text is written in normal capitalization; only
// the actual `place holder (...)` content markers stay lowercase, per how
// this whole site's placeholder convention works.
import type {
  RoleTag,
  DocVisibility,
  AnnouncementPriority,
  LeadStatus,
  PortalAccessLevel,
} from "@/db/schema";

export const roleLabels: Record<RoleTag, string> = {
  ADMIN: "Admin",
  DIRECTOR: "Director",
  OWNER: "Owner",
  RENTER: "Renter",
};

export const docVisibilityLabels: Record<DocVisibility, string> = {
  ALL_RESIDENTS: "All Residents",
  OWNERS_ONLY: "Owners Only",
  RENTERS_ONLY: "Renters Only",
  ADMIN_ONLY: "Admin Only",
  PERSONAL: "Personal (Specific Resident)",
};

// Announcements reuse the same enum for their "audience" column but have no
// concept of a single assigned resident — this is docVisibilityLabels minus
// the one option that only makes sense for a document.
export const announcementAudienceLabels: Record<Exclude<DocVisibility, "PERSONAL">, string> = {
  ALL_RESIDENTS: "All Residents",
  OWNERS_ONLY: "Owners Only",
  RENTERS_ONLY: "Renters Only",
  ADMIN_ONLY: "Admin Only",
};

export const announcementPriorityLabels: Record<AnnouncementPriority, string> = {
  NORMAL: "Normal",
  IMPORTANT: "Important",
  URGENT: "Urgent",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

export const accessLevelLabels: Record<PortalAccessLevel, string> = {
  FULL: "Full",
  STANDARD: "Standard",
  LIMITED: "Limited",
};

export const communicationChannelLabels: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  "in-person": "In-Person",
  other: "Other",
};
