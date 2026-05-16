-- Adds the historical-return mapping used by Unit-Linked Monte Carlo.
-- Existing demo UL products default to MSCI World until each product is mapped manually.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_produse_ul_underlying_index') THEN
    CREATE TYPE "enum_produse_ul_underlying_index" AS ENUM (
      'SP500',
      'MSCI_WORLD',
      'FTSE_ALL_WORLD',
      'STOXX_600',
      'BET',
      'OTHER'
    );
  END IF;
END $$;

ALTER TABLE "produse_ul"
  ADD COLUMN IF NOT EXISTS "underlying_index" "enum_produse_ul_underlying_index" DEFAULT 'MSCI_WORLD' NOT NULL;

CREATE INDEX IF NOT EXISTS "produse_ul_underlying_index_idx"
  ON "produse_ul" ("underlying_index");

DO $$
BEGIN
  IF to_regclass('public._produse_ul_v') IS NOT NULL THEN
    ALTER TABLE "_produse_ul_v"
      ADD COLUMN IF NOT EXISTS "version_underlying_index" "enum_produse_ul_underlying_index";

    CREATE INDEX IF NOT EXISTS "_produse_ul_v_version_underlying_index_idx"
      ON "_produse_ul_v" ("version_underlying_index");
  END IF;
END $$;
