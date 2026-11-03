CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_item_id" text NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"note" text,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_note_max_length" CHECK ("payments"."note" IS NULL OR char_length("payments"."note") <= 500),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_schedule_item_id_debt_schedule_items_id_fk" FOREIGN KEY ("schedule_item_id") REFERENCES "debt_schedule_items"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX "payments_schedule_item_history_idx" ON "payments" USING btree ("schedule_item_id", "payment_date" DESC, "created_at" DESC, "id" DESC) INCLUDE ("amount");
--> statement-breakpoint
CREATE FUNCTION "payments_request_fingerprint_immutable"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."request_fingerprint" IS DISTINCT FROM OLD."request_fingerprint" THEN
		RAISE EXCEPTION USING
			ERRCODE = '23514',
			CONSTRAINT = 'payments_request_fingerprint_immutable',
			MESSAGE = 'Payment request fingerprint is immutable';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "payments_request_fingerprint_immutable"
BEFORE UPDATE OF "request_fingerprint" ON "payments"
FOR EACH ROW
EXECUTE FUNCTION "payments_request_fingerprint_immutable"();
