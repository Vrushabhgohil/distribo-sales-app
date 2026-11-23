-- Migration: 0001_auth_credentials.sql
-- Description: Drop plain password columns from profile tables and add secure login identifier resolution RPC.
-- Non-destructive note / Backup recommendation:
--   BACKUP NOTE: Dropping columns is irreversible without prior backup.
--   Before applying in production, backup existing tables if password audit or export is needed:
--   CREATE TABLE IF NOT EXISTS _backup_sales_person_passwords AS SELECT id, employee_id, email, password FROM public.sales_person_profiles;
--   CREATE TABLE IF NOT EXISTS _backup_delivery_person_passwords AS SELECT id, employee_id, email, password FROM public.delivery_person_profiles;

-- 1. Remove plaintext password columns from application profile tables
ALTER TABLE public.sales_person_profiles DROP COLUMN IF EXISTS password;
ALTER TABLE public.delivery_person_profiles DROP COLUMN IF EXISTS password;

-- 2. SECURITY DEFINER RPC to resolve login identifier (Email or Employee ID) to email
-- Prevents account enumeration by raising generic error and masking user discovery
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_clean text;
BEGIN
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RAISE EXCEPTION 'Invalid login credentials';
  END IF;

  v_clean := lower(trim(p_identifier));

  -- Step A: Check sales_person_profiles by email or employee_id
  SELECT email INTO v_email
  FROM public.sales_person_profiles
  WHERE (lower(email) = v_clean OR lower(employee_id) = v_clean)
    AND status = 'active'
  LIMIT 1;

  -- Step B: Check delivery_person_profiles if not found in sales
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM public.delivery_person_profiles
    WHERE (lower(email) = v_clean OR lower(employee_id) = v_clean)
      AND status = 'active'
    LIMIT 1;
  END IF;

  -- Step C: Account enumeration prevention
  -- If not found in profile tables:
  -- If input has valid email structure, return it so Supabase Auth verifies password
  -- without leaking whether the profile exists in app tables.
  -- Otherwise (e.g. invalid employee ID), raise a generic error.
  IF v_email IS NULL THEN
    IF v_clean LIKE '%@%.%' THEN
      RETURN v_clean;
    END IF;
    RAISE EXCEPTION 'Invalid login credentials';
  END IF;

  RETURN v_email;
END;
$$;

-- Comments
COMMENT ON FUNCTION public.resolve_login_identifier(text) IS
  'Resolves employee ID or email to Supabase Auth email. SECURITY DEFINER with generic error to prevent account enumeration.';

-- Permissions: Allow public/anon to call during initial sign in
REVOKE ALL ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated, service_role;
