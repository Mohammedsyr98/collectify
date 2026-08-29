DROP INDEX "customers_owner_profile_lower_code_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_owner_profile_lower_code_unique" ON "customers" ("owner_profile_id", lower(trim("code")));
