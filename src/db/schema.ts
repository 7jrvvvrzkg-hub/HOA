// place holder (hoa name) — resident & admin portal database schema (Drizzle ORM)
//
// Two logical stores as requested: residentProfiles ("resident database")
// and adminAccounts ("admin database"), both linked to a shared `users`
// table that holds login credentials and role tags. A person can hold both
// rows at once (e.g. an admin who is also a renter).

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  customType,
  unique,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleTagEnum = pgEnum("role_tag", ["ADMIN", "OWNER", "RENTER", "DIRECTOR"]);
export const portalAccessLevelEnum = pgEnum("portal_access_level", ["FULL", "STANDARD", "LIMITED"]);
export const docVisibilityEnum = pgEnum("doc_visibility", [
  "ALL_RESIDENTS",
  "OWNERS_ONLY",
  "RENTERS_ONLY",
  "ADMIN_ONLY",
  // Only meaningful for `documents.visibility` (paired with `assignedToId`
  // below) — a document for one specific resident, like an individual lease
  // or contract, rather than everyone with a given role. Announcements share
  // this same enum for their `audience` column but never use this value; the
  // announcement form and its validation schema both deliberately leave it
  // out of what they accept.
  "PERSONAL",
]);
export const docCategoryEnum = pgEnum("doc_category", [
  "BYLAWS",
  "MEETING_MINUTES",
  "FORMS",
  "FINANCIAL",
  "OTHER",
]);
export const announcementPriorityEnum = pgEnum("announcement_priority", ["NORMAL", "IMPORTANT", "URGENT"]);
export const leadStatusEnum = pgEnum("lead_status", ["NEW", "IN_PROGRESS", "RESOLVED"]);

/** bytea column, mapped to/from Node Buffer — documents are stored directly
 * in Postgres so a test deploy needs nothing beyond one connection string. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

function id() {
  return text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

// Shared login identity. `roles` is the tag set only admins can see on a
// profile — a resident never sees their own tag, they just see their portal.
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roles: roleTagEnum("roles").array().notNull().default([]),
  // Who created this account, if a director did. Directors can only change
  // or delete accounts they created themselves, and only for one hour after
  // (see src/lib/access.ts), so the creator has to be remembered.
  createdById: text("created_by_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// "resident database" — owners and renters. Each resident can only edit
// their own row (name, contact info, and which optional fields are shared
// in the directory).
export const residentProfiles = pgTable("resident_profiles", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  unit: text("unit"),
  address: text("address"),
  phone: text("phone"),
  contactEmail: text("contact_email"),
  shareUnit: boolean("share_unit").notNull().default(false),
  sharePhone: boolean("share_phone").notNull().default(false),
  shareContactEmail: boolean("share_contact_email").notNull().default(false),
  portalAccessLevel: portalAccessLevelEnum("portal_access_level").notNull().default("STANDARD"),
  // A profile picture, stored the same way documents are — directly in
  // Postgres, so there's still nothing extra to configure. Always visible
  // (like a name), not gated by the directory-sharing toggles above.
  avatarData: bytea("avatar_data"),
  avatarMimeType: text("avatar_mime_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// "admin database" — website management accounts + permissions.
export const adminAccounts = pgTable("admin_accounts", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  canManageUsers: boolean("can_manage_users").notNull().default(true),
  canManageDocuments: boolean("can_manage_documents").notNull().default(true),
  canManageAnnouncements: boolean("can_manage_announcements").notNull().default(true),
  canManageLeads: boolean("can_manage_leads").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Folders that documents are sorted into. Staff create and name them.
export const documentFolders = pgTable("document_folders", {
  id: id(),
  name: text("name").notNull(),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// secure document repo.
export const documents = pgTable("documents", {
  id: id(),
  title: text("title").notNull(),
  // Legacy: documents used to be sorted into five fixed categories. Folders
  // replaced that; the column is kept (and empty for new uploads) so old rows
  // survive the move.
  category: docCategoryEnum("category"),
  // Deleting a folder leaves its documents behind, just unfiled.
  folderId: text("folder_id").references(() => documentFolders.id, { onDelete: "set null" }),
  visibility: docVisibilityEnum("visibility").notNull().default("ALL_RESIDENTS"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: bytea("file_data").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
  // Only set when visibility is "PERSONAL" — the one resident (beyond
  // admins) who can see this document, e.g. an individual lease or contract
  // rather than a building-wide one. Cascades so a deleted account doesn't
  // leave an orphaned personal document behind.
  assignedToId: text("assigned_to_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// bulletin-board announcements, admin-editable.
export const announcements = pgTable("announcements", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: announcementPriorityEnum("priority").notNull().default("NORMAL"),
  pinned: boolean("pinned").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  audience: docVisibilityEnum("audience").notNull().default("ALL_RESIDENTS"),
  authorId: text("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// simple built-in CRM: contact form submissions land here.
export const leads = pgTable("leads", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: leadStatusEnum("status").notNull().default("NEW"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// private admin-only notes on a resident profile.
export const adminNotes = pgTable("admin_notes", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => residentProfiles.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// private admin-only communication history on a resident profile.
export const communicationLogs = pgTable("communication_logs", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => residentProfiles.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  channel: text("channel").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A note staff leave for one resident under one document folder —
// "please upload your updated insurance certificate" and the like. One slot
// per resident+folder (edited in place rather than piling up a thread),
// shown to that resident on their Documents page.
export const documentFolderNotes = pgTable(
  "document_folder_notes",
  {
    id: id(),
    residentUserId: text("resident_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull().references(() => documentFolders.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    authorId: text("author_id").notNull().references(() => users.id),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.residentUserId, table.folderId)]
);

// Fillable forms. Staff upload a Word (.docx) file; residents open it in the
// viewer, type into the blanks, and submit.
export const forms = pgTable("forms", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  visibility: docVisibilityEnum("visibility").notNull().default("ALL_RESIDENTS"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: bytea("file_data").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FormAnswer = { label: string; value: string };

// A resident's filled-in copy of a form. `formTitle` is copied in so the
// record still reads correctly if the form itself is later removed.
export const formSubmissions = pgTable("form_submissions", {
  id: id(),
  formId: text("form_id").references(() => forms.id, { onDelete: "set null" }),
  formTitle: text("form_title").notNull(),
  submittedById: text("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<FormAnswer[]>().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  residentProfile: one(residentProfiles, {
    fields: [users.id],
    references: [residentProfiles.userId],
  }),
  adminAccount: one(adminAccounts, {
    fields: [users.id],
    references: [adminAccounts.userId],
  }),
  uploadedDocuments: many(documents, { relationName: "documentUploadedBy" }),
  assignedDocuments: many(documents, { relationName: "documentAssignedTo" }),
  announcementsWritten: many(announcements),
  adminNotesWritten: many(adminNotes),
  communicationLogs: many(communicationLogs),
  documentFolderNotes: many(documentFolderNotes, { relationName: "documentFolderNoteResident" }),
  formSubmissions: many(formSubmissions),
}));

export const residentProfilesRelations = relations(residentProfiles, ({ one, many }) => ({
  user: one(users, { fields: [residentProfiles.userId], references: [users.id] }),
  adminNotes: many(adminNotes),
  communicationLogs: many(communicationLogs),
}));

export const adminAccountsRelations = relations(adminAccounts, ({ one }) => ({
  user: one(users, { fields: [adminAccounts.userId], references: [users.id] }),
}));

export const documentFoldersRelations = relations(documentFolders, ({ many }) => ({
  documents: many(documents),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, { fields: [formSubmissions.formId], references: [forms.id] }),
  submittedBy: one(users, { fields: [formSubmissions.submittedById], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  folder: one(documentFolders, { fields: [documents.folderId], references: [documentFolders.id] }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
    relationName: "documentUploadedBy",
  }),
  assignedTo: one(users, {
    fields: [documents.assignedToId],
    references: [users.id],
    relationName: "documentAssignedTo",
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  assignedTo: one(users, { fields: [leads.assignedToId], references: [users.id] }),
}));

export const documentFolderNotesRelations = relations(documentFolderNotes, ({ one }) => ({
  resident: one(users, {
    fields: [documentFolderNotes.residentUserId],
    references: [users.id],
    relationName: "documentFolderNoteResident",
  }),
  folder: one(documentFolders, { fields: [documentFolderNotes.folderId], references: [documentFolders.id] }),
  author: one(users, { fields: [documentFolderNotes.authorId], references: [users.id] }),
}));

export const adminNotesRelations = relations(adminNotes, ({ one }) => ({
  profile: one(residentProfiles, { fields: [adminNotes.profileId], references: [residentProfiles.id] }),
  author: one(users, { fields: [adminNotes.authorId], references: [users.id] }),
}));

export const communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  profile: one(residentProfiles, { fields: [communicationLogs.profileId], references: [residentProfiles.id] }),
  author: one(users, { fields: [communicationLogs.authorId], references: [users.id] }),
}));

export type RoleTag = "ADMIN" | "DIRECTOR" | "OWNER" | "RENTER";
export type PortalAccessLevel = "FULL" | "STANDARD" | "LIMITED";
export type DocVisibility = "ALL_RESIDENTS" | "OWNERS_ONLY" | "RENTERS_ONLY" | "ADMIN_ONLY" | "PERSONAL";
export type DocCategory = "BYLAWS" | "MEETING_MINUTES" | "FORMS" | "FINANCIAL" | "OTHER";
export type AnnouncementPriority = "NORMAL" | "IMPORTANT" | "URGENT";
export type LeadStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
