-- Commercial beta admin flow fields for Payload `users`.
-- Documents the schema expected by `collections/Users.ts`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_account_status') THEN
    CREATE TYPE "enum_users_account_status" AS ENUM (
      'active',
      'pending_approval',
      'rejected',
      'disabled'
    );
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "account_status" "enum_users_account_status" DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS "invited_by_id" integer,
  ADD COLUMN IF NOT EXISTS "approved_by_id" integer,
  ADD COLUMN IF NOT EXISTS "approved_at" timestamp(3) with time zone;

CREATE INDEX IF NOT EXISTS "users_account_status_idx" ON "users" ("account_status");
CREATE INDEX IF NOT EXISTS "users_invited_by_idx" ON "users" ("invited_by_id");
CREATE INDEX IF NOT EXISTS "users_approved_by_idx" ON "users" ("approved_by_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_invited_by_id_users_id_fk') THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_invited_by_id_users_id_fk"
      FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_approved_by_id_users_id_fk') THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_approved_by_id_users_id_fk"
      FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF to_regclass('public._users_v') IS NOT NULL THEN
    ALTER TABLE "_users_v"
      ADD COLUMN IF NOT EXISTS "version_account_status" "enum_users_account_status",
      ADD COLUMN IF NOT EXISTS "version_invited_by_id" integer,
      ADD COLUMN IF NOT EXISTS "version_approved_by_id" integer,
      ADD COLUMN IF NOT EXISTS "version_approved_at" timestamp(3) with time zone;

    CREATE INDEX IF NOT EXISTS "_users_v_version_invited_by_idx" ON "_users_v" ("version_invited_by_id");
    CREATE INDEX IF NOT EXISTS "_users_v_version_approved_by_idx" ON "_users_v" ("version_approved_by_id");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_users_v_version_invited_by_id_users_id_fk') THEN
      ALTER TABLE "_users_v"
        ADD CONSTRAINT "_users_v_version_invited_by_id_users_id_fk"
        FOREIGN KEY ("version_invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_users_v_version_approved_by_id_users_id_fk') THEN
      ALTER TABLE "_users_v"
        ADD CONSTRAINT "_users_v_version_approved_by_id_users_id_fk"
        FOREIGN KEY ("version_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
