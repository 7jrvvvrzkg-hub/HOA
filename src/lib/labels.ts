// Human-readable labels for enum values, kept in one place so casing stays
// consistent everywhere a value is shown (dropdown options, table cells,
// badges). Real interface text is written in normal capitalization; only
// the actual `place holder (...)` content markers stay lowercase, per how
// this whole site's placeholder convention works.
import type {
  RoleTag,
  DocVisibility,
  DocCategory,
  AnnouncementPriority,
  LeadStatus,
  PortalAccessLevel,
} from "@/db/schema";

export const roleLabels: Record<RoleTag, string> = {
  ADMIN: "Admin",
  OWNER: "Owner",
  RENTER: "Renter",
};

export const docVisibilityLabels: Record<DocVisibility, string> = {
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

// These five are intentionally left as generic, numbered placeholders —
// every HOA names its own document categories, so there's no real default
// to guess at here. Swap each value below for the real category name
// whenever you're ready; the underlying data still just says "BYLAWS",
// "FORMS", etc. under the hood, so nothing else needs to change.
export const documentCategoryLabels: Record<DocCategory, string> = {
  BYLAWS: "place holder (category 1)",
  MEETING_MINUTES: "place holder (category 2)",
  FORMS: "place holder (category 3)",
  FINANCIAL: "place holder (category 4)",
  OTHER: "place holder (category 5)",
};
