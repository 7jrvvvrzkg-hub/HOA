-- Activity log, forgot-password, and "needs review" tracking.
-- Run after the director/folders/forms file. Safe to run once.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
-- Everything already uploaded counts as seen, so the review list starts empty.
UPDATE "documents" SET "reviewed_at" = now() WHERE "reviewed_at" IS NULL;

CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text REFERENCES "public"."users"("id") ON DELETE set null,
	"actor_label" text NOT NULL,
	"category" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "activity_log_created_at_idx" ON "activity_log" ("created_at" DESC);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);

-- Lock the new tables from Supabase's public API, same as the rest.
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
