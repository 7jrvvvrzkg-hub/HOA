ALTER TYPE "public"."doc_visibility" ADD VALUE 'PERSONAL';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;