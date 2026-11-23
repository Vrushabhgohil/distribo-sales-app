-- ========================================================
-- Motiba Sales & Distribution Management Platform
-- Migration: 0005_location_privacy.sql
-- Description: Location Privacy, DPDP Act 2023 Compliance,
--              Delivery Telemetry Tracking, Consent Storage,
--              24-Hour Ping Cutoff & 90-Day Retention Purge.
-- ========================================================

-- BACKUP NOTE:
-- Before running this migration, take a backup of public.location_history:
-- CREATE TABLE location_history_backup_20261123 AS SELECT * FROM public.location_history;

-- ========================================================
-- 1. Ensure delivery_person_id Column & Index on location_history
-- ========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'location_history'
      AND column_name = 'delivery_person_id'
  ) THEN
    ALTER TABLE public.location_history
      ADD COLUMN delivery_person_id UUID REFERENCES public.delivery_person_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_location_history_delivery_person_id
  ON public.location_history(delivery_person_id);

CREATE INDEX IF NOT EXISTS idx_location_history_salesperson_id
  ON public.location_history(salesperson_id);

CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at
  ON public.location_history(recorded_at DESC);

-- Ensure RLS on location_history properly covers delivery_person_id
DROP POLICY IF EXISTS "location_history_select" ON public.location_history;
CREATE POLICY "location_history_select" ON public.location_history
  FOR SELECT TO authenticated
  USING (
    salesperson_id = public.current_salesperson_id()
    OR delivery_person_id = public.current_delivery_person_id()
  );

DROP POLICY IF EXISTS "location_history_insert" ON public.location_history;
CREATE POLICY "location_history_insert" ON public.location_history
  FOR INSERT TO authenticated
  WITH CHECK (
    salesperson_id = public.current_salesperson_id()
    OR delivery_person_id = public.current_delivery_person_id()
  );

-- ========================================================
-- 2. First-Run Consent Storage (DPDP Act 2023)
-- ========================================================

-- Add consent tracking to salesperson and delivery profiles
ALTER TABLE public.sales_person_profiles
  ADD COLUMN IF NOT EXISTS location_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

ALTER TABLE public.delivery_person_profiles
  ADD COLUMN IF NOT EXISTS location_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

-- Dedicated immutable audit log for location privacy consent records
CREATE TABLE IF NOT EXISTS public.location_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('sales_person', 'delivery_person')),
  consent_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.location_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_consents FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.location_consents FROM anon;
GRANT SELECT, INSERT ON public.location_consents TO authenticated;

DROP POLICY IF EXISTS "location_consents_select" ON public.location_consents;
CREATE POLICY "location_consents_select" ON public.location_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "location_consents_insert" ON public.location_consents;
CREATE POLICY "location_consents_insert" ON public.location_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER RPC to record location privacy consent
CREATE OR REPLACE FUNCTION public.record_location_consent(
  p_consent_version TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_consent_version IS NULL OR length(trim(p_consent_version)) = 0 THEN
    RAISE EXCEPTION 'Consent version is required';
  END IF;

  -- Determine user role and update corresponding profile
  IF EXISTS (SELECT 1 FROM public.sales_person_profiles WHERE user_id = v_user_id) THEN
    v_role := 'sales_person';
    UPDATE public.sales_person_profiles
    SET location_consent_version = p_consent_version,
        location_consent_at = v_now,
        updated_at = v_now
    WHERE user_id = v_user_id;
  ELSIF EXISTS (SELECT 1 FROM public.delivery_person_profiles WHERE user_id = v_user_id) THEN
    v_role := 'delivery_person';
    UPDATE public.delivery_person_profiles
    SET location_consent_version = p_consent_version,
        location_consent_at = v_now,
        updated_at = v_now
    WHERE user_id = v_user_id;
  ELSE
    RAISE EXCEPTION 'No active profile found for authenticated user';
  END IF;

  -- Insert immutable audit record
  INSERT INTO public.location_consents (
    user_id,
    role,
    consent_version,
    consented_at,
    ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    v_role,
    p_consent_version,
    v_now,
    p_ip_address,
    p_user_agent
  );

  RETURN jsonb_build_object(
    'success', true,
    'role', v_role,
    'consent_version', p_consent_version,
    'consented_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_location_consent(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_location_consent(TEXT, TEXT, TEXT) TO authenticated;

-- ========================================================
-- 3. Telemetry Ingest Validation: 24-Hour Cutoff
-- Rejects / drops stale pings older than 24 hours
-- ========================================================

CREATE OR REPLACE FUNCTION public.validate_location_ping()
RETURNS TRIGGER AS $$
BEGIN
  -- Default recorded_at if omitted
  IF NEW.recorded_at IS NULL THEN
    NEW.recorded_at := now();
  END IF;

  -- Drop pings older than 24 hours (data minimization & stale telemetry prevention)
  IF NEW.recorded_at < (now() - INTERVAL '24 hours') THEN
    RAISE EXCEPTION 'Stale location ping rejected: timestamp % is older than 24 hours', NEW.recorded_at;
  END IF;

  -- Normalize future clock skew (greater than 5 minutes ahead)
  IF NEW.recorded_at > (now() + INTERVAL '5 minutes') THEN
    NEW.recorded_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_location_ping ON public.location_history;
CREATE TRIGGER trg_validate_location_ping
  BEFORE INSERT ON public.location_history
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_location_ping();

-- ========================================================
-- 4. 90-Day Retention Purge Function (DPDP Act 2023)
-- ========================================================

CREATE OR REPLACE FUNCTION public.purge_expired_location_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Permanently purge telemetry rows older than 90 days
  DELETE FROM public.location_history
  WHERE recorded_at < (now() - INTERVAL '90 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.purge_expired_location_history() IS
  'Purges telemetry older than 90 days. Run via pg_cron (daily at 03:00 UTC) or scheduled Edge Function.';

-- Conditionally schedule pg_cron job if pg_cron extension is active
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.unschedule('purge-location-history-90d');
    PERFORM cron.schedule(
      'purge-location-history-90d',
      '0 3 * * *', -- Everyday at 03:00 UTC
      'SELECT public.purge_expired_location_history();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron schema or unschedule is not configured in current environment
    NULL;
END $$;
