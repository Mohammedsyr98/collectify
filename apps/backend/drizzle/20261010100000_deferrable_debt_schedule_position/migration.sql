DROP INDEX "debt_schedule_items_debt_id_position_unique";
--> statement-breakpoint
ALTER TABLE "debt_schedule_items"
  ADD CONSTRAINT "debt_schedule_items_debt_id_position_unique"
  UNIQUE ("debt_id", "position")
  DEFERRABLE INITIALLY IMMEDIATE;
