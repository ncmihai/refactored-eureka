-- Trust layer snapshots for saved simulations.
-- Adds immutable assumptions, disclaimer version, and source/freshness metadata.

ALTER TABLE "simulari"
  ADD COLUMN IF NOT EXISTS "assumptions_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "disclaimer_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "source_snapshot" jsonb;

DO $$
BEGIN
  IF to_regclass('public._simulari_v') IS NOT NULL THEN
    ALTER TABLE "_simulari_v"
      ADD COLUMN IF NOT EXISTS "version_assumptions_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "version_disclaimer_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "version_source_snapshot" jsonb;
  END IF;
END $$;
