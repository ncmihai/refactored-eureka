-- Beta audit log collection for sensitive Payload actions.
-- Records actor, firm, target collection/document, action, and metadata.

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "action" varchar NOT NULL,
  "collection_slug" varchar NOT NULL,
  "document_id" varchar NOT NULL,
  "actor_id" integer,
  "firm_id" integer,
  "metadata" jsonb,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "audit_logs_id_seq" OWNED BY "audit_logs"."id";
SELECT setval('"audit_logs_id_seq"', COALESCE((SELECT MAX("id") FROM "audit_logs"), 0) + 1, false);
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT nextval('"audit_logs_id_seq"'::regclass);

CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_collection_slug_idx" ON "audit_logs" ("collection_slug");
CREATE INDEX IF NOT EXISTS "audit_logs_document_id_idx" ON "audit_logs" ("document_id");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "audit_logs_firm_idx" ON "audit_logs" ("firm_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_id_users_id_fk') THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_actor_id_users_id_fk"
      FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_firm_id_firme_id_fk') THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_firm_id_firme_id_fk"
      FOREIGN KEY ("firm_id") REFERENCES "firme"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "audit_logs_id" integer;

CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audit_logs_id_idx"
  ON "payload_locked_documents_rels" ("audit_logs_id");
