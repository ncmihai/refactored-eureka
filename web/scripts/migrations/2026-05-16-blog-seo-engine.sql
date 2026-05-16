-- Blog + SEO engine schema for Payload collections:
-- `categorii-educationale`, `continut-educational`, `demo-requests`, and redirects plugin.
-- Based on the Payload-generated schema observed on the Neon dev branch.
-- Idempotent where practical; review before applying to production Neon.

DO $$
BEGIN
  CREATE TYPE "enum_continut_educational_related_tool" AS ENUM (
    'credit',
    'optimizare',
    'depozit',
    'investitii',
    'unit_linked',
    'comparator',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum_continut_educational_status" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum__continut_educational_v_version_related_tool" AS ENUM (
    'credit',
    'optimizare',
    'depozit',
    'investitii',
    'unit_linked',
    'comparator',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum__continut_educational_v_version_status" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum_demo_requests_status" AS ENUM ('new', 'contacted', 'qualified', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "enum_redirects_to_type" AS ENUM ('reference', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "categorii_educationale" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "description" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "categorii_educationale" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "categorii_educationale_id_seq" OWNED BY "categorii_educationale"."id";
SELECT setval('"categorii_educationale_id_seq"', COALESCE((SELECT MAX("id") FROM "categorii_educationale"), 0) + 1, false);
ALTER TABLE "categorii_educationale" ALTER COLUMN "id" SET DEFAULT nextval('"categorii_educationale_id_seq"'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS "categorii_educationale_name_idx" ON "categorii_educationale" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "categorii_educationale_slug_idx" ON "categorii_educationale" ("slug");
CREATE INDEX IF NOT EXISTS "categorii_educationale_created_at_idx" ON "categorii_educationale" ("created_at");
CREATE INDEX IF NOT EXISTS "categorii_educationale_updated_at_idx" ON "categorii_educationale" ("updated_at");

CREATE TABLE IF NOT EXISTS "continut_educational" (
  "id" serial PRIMARY KEY,
  "title" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "excerpt" varchar NOT NULL,
  "content" jsonb NOT NULL,
  "category_id" integer,
  "hero_image_id" integer,
  "author_id" integer,
  "published_at" timestamp(3) with time zone,
  "featured" boolean DEFAULT false,
  "related_tool" "enum_continut_educational_related_tool" DEFAULT 'general',
  "seo_title" varchar,
  "seo_description" varchar,
  "seo_canonical_url" varchar,
  "seo_no_index" boolean DEFAULT false,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "_status" "enum_continut_educational_status" DEFAULT 'draft'
);

ALTER TABLE "continut_educational" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "continut_educational_id_seq" OWNED BY "continut_educational"."id";
SELECT setval('"continut_educational_id_seq"', COALESCE((SELECT MAX("id") FROM "continut_educational"), 0) + 1, false);
ALTER TABLE "continut_educational" ALTER COLUMN "id" SET DEFAULT nextval('"continut_educational_id_seq"'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS "continut_educational_slug_idx" ON "continut_educational" ("slug");
CREATE INDEX IF NOT EXISTS "continut_educational_category_idx" ON "continut_educational" ("category_id");
CREATE INDEX IF NOT EXISTS "continut_educational_hero_image_idx" ON "continut_educational" ("hero_image_id");
CREATE INDEX IF NOT EXISTS "continut_educational_author_idx" ON "continut_educational" ("author_id");
CREATE INDEX IF NOT EXISTS "continut_educational_published_at_idx" ON "continut_educational" ("published_at");
CREATE INDEX IF NOT EXISTS "continut_educational_featured_idx" ON "continut_educational" ("featured");
CREATE INDEX IF NOT EXISTS "continut_educational_created_at_idx" ON "continut_educational" ("created_at");
CREATE INDEX IF NOT EXISTS "continut_educational_updated_at_idx" ON "continut_educational" ("updated_at");
CREATE INDEX IF NOT EXISTS "continut_educational__status_idx" ON "continut_educational" ("_status");

CREATE TABLE IF NOT EXISTS "_continut_educational_v" (
  "id" serial PRIMARY KEY,
  "parent_id" integer,
  "version_title" varchar,
  "version_slug" varchar,
  "version_excerpt" varchar,
  "version_content" jsonb,
  "version_category_id" integer,
  "version_hero_image_id" integer,
  "version_author_id" integer,
  "version_published_at" timestamp(3) with time zone,
  "version_featured" boolean,
  "version_related_tool" "enum__continut_educational_v_version_related_tool",
  "version_seo_title" varchar,
  "version_seo_description" varchar,
  "version_seo_canonical_url" varchar,
  "version_seo_no_index" boolean,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" "enum__continut_educational_v_version_status",
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "latest" boolean
);

ALTER TABLE "_continut_educational_v" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "_continut_educational_v_id_seq" OWNED BY "_continut_educational_v"."id";
SELECT setval('"_continut_educational_v_id_seq"', COALESCE((SELECT MAX("id") FROM "_continut_educational_v"), 0) + 1, false);
ALTER TABLE "_continut_educational_v" ALTER COLUMN "id" SET DEFAULT nextval('"_continut_educational_v_id_seq"'::regclass);

CREATE INDEX IF NOT EXISTS "_continut_educational_v_parent_idx" ON "_continut_educational_v" ("parent_id");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_created_at_idx" ON "_continut_educational_v" ("created_at");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_updated_at_idx" ON "_continut_educational_v" ("updated_at");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_latest_idx" ON "_continut_educational_v" ("latest");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_slug_idx" ON "_continut_educational_v" ("version_slug");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_category_idx" ON "_continut_educational_v" ("version_category_id");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_hero_image_idx" ON "_continut_educational_v" ("version_hero_image_id");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_author_idx" ON "_continut_educational_v" ("version_author_id");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_published_at_idx" ON "_continut_educational_v" ("version_published_at");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_featured_idx" ON "_continut_educational_v" ("version_featured");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_created_at_idx" ON "_continut_educational_v" ("version_created_at");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version_updated_at_idx" ON "_continut_educational_v" ("version_updated_at");
CREATE INDEX IF NOT EXISTS "_continut_educational_v_version_version__status_idx" ON "_continut_educational_v" ("version__status");

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL,
  "email" varchar NOT NULL,
  "company" varchar,
  "phone" varchar,
  "message" varchar,
  "source_path" varchar,
  "status" "enum_demo_requests_status" DEFAULT 'new' NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "demo_requests" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "demo_requests_id_seq" OWNED BY "demo_requests"."id";
SELECT setval('"demo_requests_id_seq"', COALESCE((SELECT MAX("id") FROM "demo_requests"), 0) + 1, false);
ALTER TABLE "demo_requests" ALTER COLUMN "id" SET DEFAULT nextval('"demo_requests_id_seq"'::regclass);

CREATE INDEX IF NOT EXISTS "demo_requests_email_idx" ON "demo_requests" ("email");
CREATE INDEX IF NOT EXISTS "demo_requests_created_at_idx" ON "demo_requests" ("created_at");
CREATE INDEX IF NOT EXISTS "demo_requests_updated_at_idx" ON "demo_requests" ("updated_at");

CREATE TABLE IF NOT EXISTS "redirects" (
  "id" serial PRIMARY KEY,
  "from" varchar NOT NULL,
  "to_type" "enum_redirects_to_type" DEFAULT 'reference',
  "to_url" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "redirects" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "redirects_id_seq" OWNED BY "redirects"."id";
SELECT setval('"redirects_id_seq"', COALESCE((SELECT MAX("id") FROM "redirects"), 0) + 1, false);
ALTER TABLE "redirects" ALTER COLUMN "id" SET DEFAULT nextval('"redirects_id_seq"'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS "redirects_from_idx" ON "redirects" ("from");
CREATE INDEX IF NOT EXISTS "redirects_created_at_idx" ON "redirects" ("created_at");
CREATE INDEX IF NOT EXISTS "redirects_updated_at_idx" ON "redirects" ("updated_at");

CREATE TABLE IF NOT EXISTS "redirects_rels" (
  "id" serial PRIMARY KEY,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "continut_educational_id" integer
);

ALTER TABLE "redirects_rels" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS "redirects_rels_id_seq" OWNED BY "redirects_rels"."id";
SELECT setval('"redirects_rels_id_seq"', COALESCE((SELECT MAX("id") FROM "redirects_rels"), 0) + 1, false);
ALTER TABLE "redirects_rels" ALTER COLUMN "id" SET DEFAULT nextval('"redirects_rels_id_seq"'::regclass);

CREATE INDEX IF NOT EXISTS "redirects_rels_order_idx" ON "redirects_rels" ("order");
CREATE INDEX IF NOT EXISTS "redirects_rels_parent_idx" ON "redirects_rels" ("parent_id");
CREATE INDEX IF NOT EXISTS "redirects_rels_path_idx" ON "redirects_rels" ("path");
CREATE INDEX IF NOT EXISTS "redirects_rels_continut_educational_id_idx" ON "redirects_rels" ("continut_educational_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'continut_educational_category_id_categorii_educationale_id_fk') THEN
    ALTER TABLE "continut_educational"
      ADD CONSTRAINT "continut_educational_category_id_categorii_educationale_id_fk"
      FOREIGN KEY ("category_id") REFERENCES "categorii_educationale"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'continut_educational_hero_image_id_media_id_fk') THEN
    ALTER TABLE "continut_educational"
      ADD CONSTRAINT "continut_educational_hero_image_id_media_id_fk"
      FOREIGN KEY ("hero_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'continut_educational_author_id_users_id_fk') THEN
    ALTER TABLE "continut_educational"
      ADD CONSTRAINT "continut_educational_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_continut_educational_v_parent_id_continut_educational_id_fk') THEN
    ALTER TABLE "_continut_educational_v"
      ADD CONSTRAINT "_continut_educational_v_parent_id_continut_educational_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "continut_educational"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_continut_educational_v_version_category_id_categorii_education') THEN
    ALTER TABLE "_continut_educational_v"
      ADD CONSTRAINT "_continut_educational_v_version_category_id_categorii_education"
      FOREIGN KEY ("version_category_id") REFERENCES "categorii_educationale"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_continut_educational_v_version_hero_image_id_media_id_fk') THEN
    ALTER TABLE "_continut_educational_v"
      ADD CONSTRAINT "_continut_educational_v_version_hero_image_id_media_id_fk"
      FOREIGN KEY ("version_hero_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_continut_educational_v_version_author_id_users_id_fk') THEN
    ALTER TABLE "_continut_educational_v"
      ADD CONSTRAINT "_continut_educational_v_version_author_id_users_id_fk"
      FOREIGN KEY ("version_author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redirects_rels_parent_fk') THEN
    ALTER TABLE "redirects_rels"
      ADD CONSTRAINT "redirects_rels_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "redirects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redirects_rels_continut_educational_fk') THEN
    ALTER TABLE "redirects_rels"
      ADD CONSTRAINT "redirects_rels_continut_educational_fk"
      FOREIGN KEY ("continut_educational_id") REFERENCES "continut_educational"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "categorii_educationale_id" integer,
  ADD COLUMN IF NOT EXISTS "continut_educational_id" integer,
  ADD COLUMN IF NOT EXISTS "demo_requests_id" integer,
  ADD COLUMN IF NOT EXISTS "redirects_id" integer;

CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_categorii_educationale_id_idx"
  ON "payload_locked_documents_rels" ("categorii_educationale_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_continut_educational_id_idx"
  ON "payload_locked_documents_rels" ("continut_educational_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_demo_requests_id_idx"
  ON "payload_locked_documents_rels" ("demo_requests_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_redirects_id_idx"
  ON "payload_locked_documents_rels" ("redirects_id");
