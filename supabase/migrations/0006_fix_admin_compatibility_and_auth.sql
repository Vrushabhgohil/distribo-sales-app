-- Migration: 0006_fix_admin_compatibility_and_auth.sql
-- Description:
--   1. Restore backward compatibility for Admin Panel (add password column to sales_person_profiles and delivery_person_profiles).
--   2. Fix Admin Panel RLS policies on profiles (grant staff/admin full management access so PATCH/PUT/DELETE succeeds).
--   3. Enable pending & active users in resolve_login_identifier.
--   4. Trigger to sync admin-set passwords to auth.users with bcrypt hashing and user_id linking.
--   5. Provide secure RPC to sync and authenticate database-stored credentials with auth.users.

-- ====================================================================
-- 1. Restore password columns and ensure location consent columns exist
-- ====================================================================
ALTER TABLE public.sales_person_profiles
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS location_consent_version text,
  ADD COLUMN IF NOT EXISTS location_consent_at timestamptz;

ALTER TABLE public.delivery_person_profiles
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS location_consent_version text,
  ADD COLUMN IF NOT EXISTS location_consent_at timestamptz;

-- ====================================================================
-- 2. Staff & Admin Role Resolution Helpers
-- ====================================================================
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    (auth.jwt()->'app_metadata'->>'role'),
    (auth.jwt()->'user_metadata'->>'role'),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(public.current_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(public.current_role() IN ('admin', 'manager'), false);
$$;

-- ====================================================================
-- 3. RLS Policies: Allow Staff / Admin Management of Profiles
-- ====================================================================

-- Sales Person Profiles RLS
DROP POLICY IF EXISTS "sales_profiles_select" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_select" ON public.sales_person_profiles
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "sales_profiles_update" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_update" ON public.sales_person_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "sales_profiles_insert" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_insert" ON public.sales_person_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "sales_profiles_delete" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_delete" ON public.sales_person_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Delivery Person Profiles RLS
DROP POLICY IF EXISTS "delivery_profiles_select" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_select" ON public.delivery_person_profiles
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "delivery_profiles_update" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_update" ON public.delivery_person_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "delivery_profiles_insert" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_insert" ON public.delivery_person_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delivery_profiles_delete" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_delete" ON public.delivery_person_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ====================================================================
-- 4. Update resolve_login_identifier to include pending and active accounts
-- ====================================================================
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

  -- Check sales_person_profiles by email or employee_id
  SELECT email INTO v_email
  FROM public.sales_person_profiles
  WHERE (lower(email) = v_clean OR lower(employee_id) = v_clean)
    AND status IN ('active', 'pending')
  LIMIT 1;

  -- Check delivery_person_profiles if not found in sales
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM public.delivery_person_profiles
    WHERE (lower(email) = v_clean OR lower(employee_id) = v_clean)
      AND status IN ('active', 'pending')
    LIMIT 1;
  END IF;

  -- If input looks like an email, return clean email to test against auth
  IF v_email IS NULL THEN
    IF v_clean LIKE '%@%.%' THEN
      RETURN v_clean;
    END IF;
    RAISE EXCEPTION 'Invalid login credentials';
  END IF;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated, service_role;

-- ====================================================================
-- 5. Auto-sync Trigger: Sync passwords created/updated in Admin Panel to auth.users
-- ====================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_password_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_hashed_password text;
  v_email text;
BEGIN
  v_email := lower(trim(NEW.email));

  -- If a password is provided / updated, ensure auth.users has bcrypt hash
  IF NEW.password IS NOT NULL AND trim(NEW.password) <> '' AND (TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password) THEN
    -- Find existing auth user
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

    -- Bcrypt hash with cost 10
    v_hashed_password := extensions.crypt(NEW.password, extensions.gen_salt('bf', 10));

    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET encrypted_password = v_hashed_password,
          updated_at = now()
      WHERE id = v_user_id;
      NEW.user_id := v_user_id;
    ELSE
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        v_hashed_password,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', NEW.name, 'mobile', NEW.mobile),
        now(),
        now()
      );
      NEW.user_id := v_user_id;
    END IF;
  ELSIF NEW.user_id IS NULL THEN
    -- If no password was provided, check if auth.users already has a matching account
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sales_person_password ON public.sales_person_profiles;
CREATE TRIGGER trg_sync_sales_person_password
  BEFORE INSERT OR UPDATE ON public.sales_person_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_password_to_auth();

DROP TRIGGER IF EXISTS trg_sync_delivery_person_password ON public.delivery_person_profiles;
CREATE TRIGGER trg_sync_delivery_person_password
  BEFORE INSERT OR UPDATE ON public.delivery_person_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_password_to_auth();

-- ====================================================================
-- 6. RPC: Verify & Sync Database Credentials to Supabase Auth
-- ====================================================================
CREATE OR REPLACE FUNCTION public.sync_legacy_user_credentials(p_identifier text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_clean_id text;
  v_email text;
  v_stored_password text;
  v_user_id uuid;
  v_name text;
  v_mobile text;
  v_matched boolean := false;
BEGIN
  IF p_identifier IS NULL OR p_password IS NULL OR trim(p_identifier) = '' OR trim(p_password) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid input parameters');
  END IF;

  v_clean_id := lower(trim(p_identifier));

  -- 1. Check sales_person_profiles
  SELECT email, password, user_id, name, mobile
  INTO v_email, v_stored_password, v_user_id, v_name, v_mobile
  FROM public.sales_person_profiles
  WHERE (lower(email) = v_clean_id OR lower(employee_id) = v_clean_id)
    AND status IN ('active', 'pending')
  LIMIT 1;

  -- 2. Check delivery_person_profiles
  IF v_email IS NULL THEN
    SELECT email, password, user_id, name, mobile
    INTO v_email, v_stored_password, v_user_id, v_name, v_mobile
    FROM public.delivery_person_profiles
    WHERE (lower(email) = v_clean_id OR lower(employee_id) = v_clean_id)
      AND status IN ('active', 'pending')
    LIMIT 1;
  END IF;

  IF v_email IS NULL OR v_stored_password IS NULL OR trim(v_stored_password) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No stored database credentials found');
  END IF;

  -- Compare plain password OR bcrypt hash
  IF v_stored_password = p_password OR v_stored_password = extensions.crypt(p_password, v_stored_password) THEN
    v_matched := true;
  END IF;

  IF NOT v_matched THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password mismatch');
  END IF;

  -- Find or create auth.users entry
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', v_name, 'mobile', v_mobile),
      now(),
      now()
    );
  END IF;

  -- Ensure profile record is linked to this user_id
  UPDATE public.sales_person_profiles
  SET user_id = v_user_id, updated_at = now()
  WHERE lower(email) = lower(v_email) AND (user_id IS NULL OR user_id <> v_user_id);

  UPDATE public.delivery_person_profiles
  SET user_id = v_user_id, updated_at = now()
  WHERE lower(email) = lower(v_email) AND (user_id IS NULL OR user_id <> v_user_id);

  RETURN jsonb_build_object('success', true, 'email', v_email, 'user_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_legacy_user_credentials(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_legacy_user_credentials(text, text) TO anon, authenticated, service_role;
