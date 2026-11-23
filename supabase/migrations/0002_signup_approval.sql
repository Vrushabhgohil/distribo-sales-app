-- Migration: 0002_signup_approval.sql
-- Description: Server-side signup approval trigger, sequence-based employee IDs, and status CHECK constraints.

-- 1. Status CHECK constraints
DO $$
BEGIN
  -- Add CHECK constraint to sales_person_profiles if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_person_profiles_status_check'
  ) THEN
    ALTER TABLE public.sales_person_profiles
    ADD CONSTRAINT sales_person_profiles_status_check
    CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;

  -- Add CHECK constraint to delivery_person_profiles if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_person_profiles_status_check'
  ) THEN
    ALTER TABLE public.delivery_person_profiles
    ADD CONSTRAINT delivery_person_profiles_status_check
    CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;
END $$;

-- 2. Sequences for server-generated employee IDs
CREATE SEQUENCE IF NOT EXISTS public.sales_employee_id_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.delivery_employee_id_seq START WITH 1001;

-- 3. Trigger function to create pending profiles on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name text;
  v_mobile text;
  v_assigned_area text;
  v_existing_id uuid;
  v_emp_id text;
  v_requested_role text;
BEGIN
  -- Extract metadata safely (no client-controlled role escalation)
  v_full_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_mobile := NEW.raw_user_meta_data->>'mobile';
  v_assigned_area := coalesce(NEW.raw_user_meta_data->>'assigned_area', 'Unassigned Beat');
  v_requested_role := lower(coalesce(NEW.raw_user_meta_data->>'requested_role', 'sales_person'));

  -- Check if a pre-enrolled profile exists by email in sales_person_profiles
  SELECT id INTO v_existing_id
  FROM public.sales_person_profiles
  WHERE lower(email) = lower(NEW.email) AND user_id IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Link existing pre-enrolled salesperson
    UPDATE public.sales_person_profiles
    SET
      user_id = NEW.id,
      name = coalesce(v_full_name, name),
      mobile = coalesce(v_mobile, mobile),
      updated_at = now()
    WHERE id = v_existing_id;
    RETURN NEW;
  END IF;

  -- Check if a pre-enrolled profile exists by email in delivery_person_profiles
  SELECT id INTO v_existing_id
  FROM public.delivery_person_profiles
  WHERE lower(email) = lower(NEW.email) AND user_id IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Link existing pre-enrolled delivery person
    UPDATE public.delivery_person_profiles
    SET
      user_id = NEW.id,
      name = coalesce(v_full_name, name),
      mobile = coalesce(v_mobile, mobile),
      updated_at = now()
    WHERE id = v_existing_id;
    RETURN NEW;
  END IF;

  -- Create new profile strictly with 'pending' status
  IF v_requested_role IN ('delivery_person', 'delivery_pilot') THEN
    v_emp_id := 'EMP-D' || lpad(nextval('public.delivery_employee_id_seq')::text, 4, '0');
    INSERT INTO public.delivery_person_profiles (
      user_id,
      name,
      employee_id,
      email,
      mobile,
      vehicle_type,
      vehicle_number,
      status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_full_name,
      v_emp_id,
      NEW.email,
      coalesce(v_mobile, ''),
      'Unassigned',
      'Pending',
      'pending',
      now(),
      now()
    );
  ELSE
    -- Default to sales representative
    v_emp_id := 'EMP-S' || lpad(nextval('public.sales_employee_id_seq')::text, 4, '0');
    INSERT INTO public.sales_person_profiles (
      user_id,
      name,
      employee_id,
      email,
      mobile,
      assigned_area,
      status,
      joining_date,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_full_name,
      v_emp_id,
      NEW.email,
      coalesce(v_mobile, ''),
      v_assigned_area,
      'pending',
      current_date,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automated profile creation with pending approval status and server-generated employee ID on auth.users registration.';
