-- Director role, document folders, fillable forms.
-- Safe to run once on a database that already has files 1-5 applied.

ALTER TYPE "public"."role_tag" ADD VALUE IF NOT EXISTS 'DIRECTOR';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by_id" text;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "document_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by_id" text REFERENCES "public"."users"("id") ON DELETE set null,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "documents" ALTER COLUMN "category" DROP NOT NULL;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "folder_id" text;
DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_document_folders_id_fk"
    FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "document_folder_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"resident_user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"folder_id" text NOT NULL REFERENCES "public"."document_folders"("id") ON DELETE cascade,
	"message" text NOT NULL,
	"author_id" text NOT NULL REFERENCES "public"."users"("id"),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_folder_notes_resident_user_id_folder_id_unique" UNIQUE("resident_user_id","folder_id")
);

CREATE TABLE IF NOT EXISTS "forms" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"visibility" "doc_visibility" DEFAULT 'ALL_RESIDENTS' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_data" bytea NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by_id" text REFERENCES "public"."users"("id") ON DELETE set null,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "form_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text REFERENCES "public"."forms"("id") ON DELETE set null,
	"form_title" text NOT NULL,
	"submitted_by_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"answers" jsonb NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_id" text REFERENCES "public"."users"("id") ON DELETE set null,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Move the five old fixed categories into real folders (only if they still
-- have anything to move), carrying documents and per-resident notes over.
DO $$
DECLARE
  cats text[] := ARRAY['BYLAWS','MEETING_MINUTES','FORMS','FINANCIAL','OTHER'];
  c text;
  n int := 0;
  fid text;
BEGIN
  IF to_regclass('public.document_category_notes') IS NULL THEN RETURN; END IF;
  FOREACH c IN ARRAY cats LOOP
    n := n + 1;
    IF EXISTS (SELECT 1 FROM documents WHERE category::text = c AND folder_id IS NULL)
       OR EXISTS (SELECT 1 FROM document_category_notes WHERE category::text = c) THEN
      fid := gen_random_uuid()::text;
      INSERT INTO document_folders (id, name) VALUES (fid, 'Folder ' || n);
      UPDATE documents SET folder_id = fid WHERE category::text = c AND folder_id IS NULL;
      INSERT INTO document_folder_notes (id, resident_user_id, folder_id, message, author_id, updated_at)
        SELECT gen_random_uuid()::text, resident_user_id, fid, message, author_id, updated_at
        FROM document_category_notes WHERE category::text = c
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  DROP TABLE document_category_notes;
END $$;
