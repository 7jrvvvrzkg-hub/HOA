CREATE TABLE "document_category_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"resident_user_id" text NOT NULL,
	"category" "doc_category" NOT NULL,
	"message" text NOT NULL,
	"author_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_category_notes_resident_user_id_category_unique" UNIQUE("resident_user_id","category")
);
--> statement-breakpoint
ALTER TABLE "document_category_notes" ADD CONSTRAINT "document_category_notes_resident_user_id_users_id_fk" FOREIGN KEY ("resident_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_category_notes" ADD CONSTRAINT "document_category_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;