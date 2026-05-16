-- SaaS beta saved simulations schema.
-- Documents the production Neon changes applied for Payload collection `simulari`.
-- Safe to re-run in normal Postgres environments; enum creation uses duplicate guards.

DO $$
BEGIN
  CREATE TYPE "enum_simulari_tool" AS ENUM (
    'credit',
    'optimizare',
    'depozit',
    'investitii',
    'unit_linked',
    'comparator'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum_simulari_status" AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "simulari" (
  "id" serial PRIMARY KEY,
  "tool" "enum_simulari_tool" NOT NULL,
  "input_snapshot" jsonb NOT NULL,
  "output_summary" jsonb NOT NULL,
  "product_snapshots" jsonb,
  "firm_id" integer,
  "user_id" integer,
  "client_alias" varchar DEFAULT 'Client demo' NOT NULL,
  "share_id" varchar NOT NULL,
  "share_expires_at" timestamp(3) with time zone NOT NULL,
  "status" "enum_simulari_status" DEFAULT 'active' NOT NULL,
  "pdf_exported_at" timestamp(3) with time zone,
  "pdf_hash" varchar,
  "pdf_version" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "_simulari_v" (
  "id" serial PRIMARY KEY,
  "parent_id" integer,
  "version_tool" "enum_simulari_tool",
  "version_input_snapshot" jsonb,
  "version_output_summary" jsonb,
  "version_product_snapshots" jsonb,
  "version_firm_id" integer,
  "version_user_id" integer,
  "version_client_alias" varchar,
  "version_share_id" varchar,
  "version_share_expires_at" timestamp(3) with time zone,
  "version_status" "enum_simulari_status",
  "version_pdf_exported_at" timestamp(3) with time zone,
  "version_pdf_hash" varchar,
  "version_pdf_version" varchar,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "simulari_share_id_idx" ON "simulari" ("share_id");
CREATE INDEX IF NOT EXISTS "simulari_tool_idx" ON "simulari" ("tool");
CREATE INDEX IF NOT EXISTS "simulari_firm_idx" ON "simulari" ("firm_id");
CREATE INDEX IF NOT EXISTS "simulari_user_idx" ON "simulari" ("user_id");
CREATE INDEX IF NOT EXISTS "simulari_status_idx" ON "simulari" ("status");
CREATE INDEX IF NOT EXISTS "simulari_created_at_idx" ON "simulari" ("created_at");
CREATE INDEX IF NOT EXISTS "_simulari_v_parent_idx" ON "_simulari_v" ("parent_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulari_firm_id_firme_id_fk') THEN
    ALTER TABLE "simulari"
      ADD CONSTRAINT "simulari_firm_id_firme_id_fk"
      FOREIGN KEY ("firm_id") REFERENCES "firme"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulari_user_id_users_id_fk') THEN
    ALTER TABLE "simulari"
      ADD CONSTRAINT "simulari_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_simulari_v_parent_id_simulari_id_fk') THEN
    ALTER TABLE "_simulari_v"
      ADD CONSTRAINT "_simulari_v_parent_id_simulari_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "simulari"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_simulari_v_version_firm_id_firme_id_fk') THEN
    ALTER TABLE "_simulari_v"
      ADD CONSTRAINT "_simulari_v_version_firm_id_firme_id_fk"
      FOREIGN KEY ("version_firm_id") REFERENCES "firme"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_simulari_v_version_user_id_users_id_fk') THEN
    ALTER TABLE "_simulari_v"
      ADD CONSTRAINT "_simulari_v_version_user_id_users_id_fk"
      FOREIGN KEY ("version_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "simulari_id" integer,
  ADD COLUMN IF NOT EXISTS "produse_ul_id" integer,
  ADD COLUMN IF NOT EXISTS "fonduri_etf_id" integer,
  ADD COLUMN IF NOT EXISTS "indici_istorici_id" integer;

CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_simulari_id_idx"
  ON "payload_locked_documents_rels" ("simulari_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_produse_ul_id_idx"
  ON "payload_locked_documents_rels" ("produse_ul_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_fonduri_etf_id_idx"
  ON "payload_locked_documents_rels" ("fonduri_etf_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_indici_istorici_id_idx"
  ON "payload_locked_documents_rels" ("indici_istorici_id");

-- If this file is applied to an empty database via Payload migrations, Payload may create equivalent
-- constraints with generated names. Keep this migration reviewed before applying to production.
