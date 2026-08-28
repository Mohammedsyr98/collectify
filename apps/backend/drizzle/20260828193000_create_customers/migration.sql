CREATE TABLE "customers" (
	"id" text PRIMARY KEY,
	"owner_profile_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"phone_number" text NOT NULL,
	"address" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_profile_id_owner_profiles_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_owner_profile_lower_code_unique" ON "customers" ("owner_profile_id", lower("code"));
