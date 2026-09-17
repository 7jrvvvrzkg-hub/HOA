CREATE TYPE "public"."announcement_priority" AS ENUM('NORMAL', 'IMPORTANT', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."doc_category" AS ENUM('BYLAWS', 'MEETING_MINUTES', 'FORMS', 'FINANCIAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."doc_visibility" AS ENUM('ALL_RESIDENTS', 'OWNERS_ONLY', 'RENTERS_ONLY', 'ADMIN_ONLY');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'IN_PROGRESS', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."portal_access_level" AS ENUM('FULL', 'STANDARD', 'LIMITED');--> statement-breakpoint
CREATE TYPE "public"."role_tag" AS ENUM('ADMIN', 'OWNER', 'RENTER');--> statement-breakpoint
CREATE TABLE "admin_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"can_manage_users" boolean DEFAULT true NOT NULL,
	"can_manage_documents" boolean DEFAULT true NOT NULL,
	"can_manage_announcements" boolean DEFAULT true NOT NULL,
	"can_manage_leads" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "admin_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "announcement_priority" DEFAULT 'NORMAL' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"audience" "doc_visibility" DEFAULT 'ALL_RESIDENTS' NOT NULL,
	"author_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"author_id" text NOT NULL,
	"channel" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" "doc_category" NOT NULL,
	"visibility" "doc_visibility" DEFAULT 'ALL_RESIDENTS' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_data" "bytea" NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"assigned_to_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"unit" text,
	"address" text,
	"phone" text,
	"contact_email" text,
	"share_unit" boolean DEFAULT false NOT NULL,
	"share_phone" boolean DEFAULT false NOT NULL,
	"share_contact_email" boolean DEFAULT false NOT NULL,
	"portal_access_level" "portal_access_level" DEFAULT 'STANDARD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resident_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"roles" "role_tag"[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD CONSTRAINT "admin_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_profile_id_resident_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."resident_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_profile_id_resident_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."resident_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_profiles" ADD CONSTRAINT "resident_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;