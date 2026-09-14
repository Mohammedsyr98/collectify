CREATE TABLE "debt_schedule_items" (
	"id" text PRIMARY KEY,
	"debt_id" text NOT NULL,
	"position" integer NOT NULL,
	"amount" numeric(18,2) NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "debt_schedule_items_position_positive" CHECK ("position" > 0),
	CONSTRAINT "debt_schedule_items_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" text PRIMARY KEY,
	"customer_id" text NOT NULL,
	"description" text NOT NULL,
	"total_amount" numeric(18,2) NOT NULL,
	"currency" "currency" NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "debts_total_amount_positive" CHECK ("total_amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "debt_schedule_items_debt_id_position_unique" ON "debt_schedule_items" ("debt_id","position");--> statement-breakpoint
ALTER TABLE "debt_schedule_items" ADD CONSTRAINT "debt_schedule_items_debt_id_debts_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;