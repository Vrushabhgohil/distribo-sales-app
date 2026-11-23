-- Test Suite: rls_test.sql
-- Description: Positive and negative RLS verification tests per table per role (anon, sales_person, delivery_person).
-- Run inside a transactional block so changes are rolled back automatically.

BEGIN;

-- ========================================================
-- SETUP: Create mock auth users and profiles for testing
-- ========================================================
DO $$
DECLARE
  v_sales_user_id uuid := '11111111-1111-1111-1111-111111111111';
  v_other_sales_user_id uuid := '22222222-2222-2222-2222-222222222222';
  v_delivery_user_id uuid := '33333333-3333-3333-3333-333333333333';
  v_other_delivery_user_id uuid := '44444444-4444-4444-4444-444444444444';
  v_sales_profile_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_other_sales_profile_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_delivery_profile_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_store_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_other_store_id uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_order_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_other_order_id uuid := '99999999-9999-9999-9999-999999999999';
  v_product_id uuid := '88888888-8888-8888-8888-888888888888';
  v_cnt integer;
BEGIN
  RAISE NOTICE '>>> STARTING RLS TEST SUITE <<<';

  -- Create Sales Profile 1
  INSERT INTO public.sales_person_profiles (id, user_id, name, employee_id, email, mobile, status)
  VALUES (v_sales_profile_id, v_sales_user_id, 'Test Sales', 'EMP-S9001', 'sales1@test.com', '9876543210', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create Sales Profile 2 (other rep)
  INSERT INTO public.sales_person_profiles (id, user_id, name, employee_id, email, mobile, status)
  VALUES (v_other_sales_profile_id, v_other_sales_user_id, 'Other Sales', 'EMP-S9002', 'sales2@test.com', '9876543211', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create Delivery Profile
  INSERT INTO public.delivery_person_profiles (id, user_id, name, employee_id, email, mobile, vehicle_type, vehicle_number, status)
  VALUES (v_delivery_profile_id, v_delivery_user_id, 'Test Pilot', 'EMP-D9001', 'pilot1@test.com', '9876543212', 'Van', 'GJ01AB1234', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create Test Stores
  INSERT INTO public.stores (id, name, owner_name, mobile, address, area, city, pincode, store_type, assigned_salesperson_id, credit_limit, status)
  VALUES (v_store_id, 'Store 1', 'Owner 1', '9876500001', 'Addr 1', 'Area 1', 'City', '380001', 'Kirana', v_sales_profile_id, 50000, 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.stores (id, name, owner_name, mobile, address, area, city, pincode, store_type, assigned_salesperson_id, credit_limit, status)
  VALUES (v_other_store_id, 'Store 2', 'Owner 2', '9876500002', 'Addr 2', 'Area 2', 'City', '380001', 'Kirana', v_other_sales_profile_id, 50000, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create Test Product
  INSERT INTO public.products (id, name, sku, pack_size, unit, mrp, selling_price, distributor_price, gst_percentage, min_order_qty, status)
  VALUES (v_product_id, 'Test Product', 'SKU-001', '1kg', 'kg', 100, 90, 80, 5, 1, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create Test Order for Sales 1
  INSERT INTO public.orders (id, order_number, store_id, salesperson_id, order_date, discount_amount, tax_amount, total_amount, status)
  VALUES (v_order_id, 'ORD-9001', v_store_id, v_sales_profile_id, current_date, 0, 5, 105, 'pending')
  ON CONFLICT (id) DO NOTHING;

  -- Create Test Order for Other Sales
  INSERT INTO public.orders (id, order_number, store_id, salesperson_id, order_date, discount_amount, tax_amount, total_amount, status)
  VALUES (v_other_order_id, 'ORD-9002', v_other_store_id, v_other_sales_profile_id, current_date, 0, 5, 105, 'pending')
  ON CONFLICT (id) DO NOTHING;

  -- Create Delivery Assignment for Delivery Pilot on Order 1
  INSERT INTO public.delivery_assignments (id, order_id, delivery_person_id, assigned_date, status)
  VALUES (gen_random_uuid(), v_order_id, v_delivery_profile_id, current_date, 'assigned')
  ON CONFLICT DO NOTHING;

  -- Create Ledger record for Store 1
  INSERT INTO public.ledger_transactions (id, store_id, transaction_date, description, amount, balance_after, transaction_type)
  VALUES (gen_random_uuid(), v_store_id, current_date, 'Opening Balance', 1000, 1000, 'credit')
  ON CONFLICT DO NOTHING;

  -- ========================================================
  -- 1. ANON ROLE TESTS (DENY ALL)
  -- ========================================================
  RAISE NOTICE 'Testing Anon Role Policies...';
  -- Simulate anon
  SET LOCAL ROLE anon;
  SET LOCAL "request.jwt.claims" TO '{"role": "anon"}';

  -- Negative Test: Anon cannot read stores
  BEGIN
    SELECT count(*) INTO v_cnt FROM public.stores;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'RLS FAIL: Anon read stores (% rows)', v_cnt;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    -- Expected: permission denied
    NULL;
  END;

  -- Negative Test: Anon cannot read orders
  BEGIN
    SELECT count(*) INTO v_cnt FROM public.orders;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'RLS FAIL: Anon read orders (% rows)', v_cnt;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Negative Test: Anon cannot insert orders
  BEGIN
    INSERT INTO public.orders (order_number, store_id, salesperson_id, order_date, total_amount, status)
    VALUES ('ORD-ANON', v_store_id, v_sales_profile_id, current_date, 100, 'pending');
    RAISE EXCEPTION 'RLS FAIL: Anon inserted order';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- Reset role
  RESET ROLE;

  -- ========================================================
  -- 2. SALES PERSON ROLE TESTS
  -- ========================================================
  RAISE NOTICE 'Testing Sales Person Role Policies...';
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sales_user_id, 'role', 'authenticated')::text, true);

  -- POSITIVE TESTS
  -- 1. Salesperson can view active products
  SELECT count(*) INTO v_cnt FROM public.products WHERE id = v_product_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Salesperson cannot read active products';

  -- 2. Salesperson can read assigned stores
  SELECT count(*) INTO v_cnt FROM public.stores WHERE id = v_store_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Salesperson cannot read assigned store';

  -- 3. Salesperson can read own orders
  SELECT count(*) INTO v_cnt FROM public.orders WHERE id = v_order_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Salesperson cannot read own order';

  -- 4. Salesperson can insert store visits
  INSERT INTO public.store_visits (store_id, salesperson_id, visit_date, check_in_time)
  VALUES (v_store_id, v_sales_profile_id, current_date, '10:00:00');

  -- NEGATIVE TESTS
  -- 1. Salesperson CANNOT read orders of other salespeople
  SELECT count(*) INTO v_cnt FROM public.orders WHERE id = v_other_order_id;
  ASSERT v_cnt = 0, 'RLS FAIL: Salesperson was able to read another rep order';

  -- 2. Salesperson CANNOT directly modify order status or totals
  BEGIN
    UPDATE public.orders SET status = 'delivered', total_amount = 0 WHERE id = v_order_id;
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'RLS FAIL: Salesperson directly updated order status/total';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- 3. Salesperson CANNOT write to ledger directly
  BEGIN
    INSERT INTO public.ledger_transactions (store_id, transaction_date, description, amount, balance_after, transaction_type)
    VALUES (v_store_id, current_date, 'Fake Credit', 99999, 0, 'payment');
    RAISE EXCEPTION 'RLS FAIL: Salesperson directly inserted ledger transaction';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- 4. Salesperson CANNOT write to inventory directly
  BEGIN
    INSERT INTO public.inventory (product_id, current_stock, available_stock, reserved_stock, incoming_stock, outgoing_stock, low_stock_threshold)
    VALUES (v_product_id, 1000, 1000, 0, 0, 0, 10);
    RAISE EXCEPTION 'RLS FAIL: Salesperson directly inserted inventory';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- ========================================================
  -- 3. DELIVERY PERSON ROLE TESTS
  -- ========================================================
  RAISE NOTICE 'Testing Delivery Person Role Policies...';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_delivery_user_id, 'role', 'authenticated')::text, true);

  -- POSITIVE TESTS
  -- 1. Delivery pilot can view their assigned delivery
  SELECT count(*) INTO v_cnt FROM public.delivery_assignments WHERE delivery_person_id = v_delivery_profile_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Delivery pilot cannot view assigned deliveries';

  -- 2. Delivery pilot can view the order associated with their delivery assignment
  SELECT count(*) INTO v_cnt FROM public.orders WHERE id = v_order_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Delivery pilot cannot view assigned order';

  -- NEGATIVE TESTS
  -- 1. Delivery pilot CANNOT view unassigned orders
  SELECT count(*) INTO v_cnt FROM public.orders WHERE id = v_other_order_id;
  ASSERT v_cnt = 0, 'RLS FAIL: Delivery pilot viewed unassigned order';

  -- 2. Delivery pilot CANNOT directly update delivery assignment status (must use RPC)
  BEGIN
    UPDATE public.delivery_assignments SET status = 'delivered' WHERE delivery_person_id = v_delivery_profile_id;
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'RLS FAIL: Delivery pilot directly updated assignment status';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- 3. Delivery pilot CANNOT insert stores
  BEGIN
    INSERT INTO public.stores (name, owner_name, mobile, address, area, city, pincode, store_type, credit_limit, status)
    VALUES ('Delivery Store', 'Owner', '9876599999', 'Addr', 'Area', 'City', '380001', 'Kirana', 50000, 'active');
    RAISE EXCEPTION 'RLS FAIL: Delivery pilot directly inserted store';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- 4. Delivery pilot CANNOT write to stock_movements directly
  BEGIN
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, created_by)
    VALUES (v_product_id, 'out', 5, v_delivery_user_id);
    RAISE EXCEPTION 'RLS FAIL: Delivery pilot directly inserted stock movement';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- ========================================================
  -- 4. LOCATION PRIVACY & TELEMETRY RLS TESTS
  -- ========================================================
  RAISE NOTICE 'Testing Location Privacy & Telemetry Policies...';

  -- 1. Delivery pilot CAN insert and view their own location ping
  INSERT INTO public.location_history (delivery_person_id, latitude, longitude, status, recorded_at)
  VALUES (v_delivery_profile_id, 23.0225, 72.5714, 'online', now());

  SELECT count(*) INTO v_cnt FROM public.location_history WHERE delivery_person_id = v_delivery_profile_id;
  ASSERT v_cnt >= 1, 'RLS FAIL: Delivery pilot cannot view their own location pings';

  -- 2. Delivery pilot CAN record their own privacy consent
  INSERT INTO public.location_consents (user_id, role, consent_version, consented_at)
  VALUES (v_delivery_user_id, 'delivery_person', '2026.1-DPDP', now());

  SELECT count(*) INTO v_cnt FROM public.location_consents WHERE user_id = v_delivery_user_id;
  ASSERT v_cnt = 1, 'RLS FAIL: Delivery pilot cannot view their own location consent';

  -- 3. Delivery pilot CANNOT insert location ping for another user or salesperson
  BEGIN
    INSERT INTO public.location_history (salesperson_id, latitude, longitude, status, recorded_at)
    VALUES (v_sales_profile_id, 23.0225, 72.5714, 'online', now());
    RAISE EXCEPTION 'RLS FAIL: Delivery pilot inserted location ping for salesperson';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  -- 4. Delivery pilot CANNOT view other user's consent records
  SELECT count(*) INTO v_cnt FROM public.location_consents WHERE user_id = v_sales_user_id;
  ASSERT v_cnt = 0, 'RLS FAIL: Delivery pilot viewed another user privacy consent record';

  RAISE NOTICE '>>> ALL 18 TABLE & PRIVACY RLS TESTS PASSED SUCCESSFULLY! <<<';
END $$;

-- Rollback test transaction to keep database pristine
ROLLBACK;
