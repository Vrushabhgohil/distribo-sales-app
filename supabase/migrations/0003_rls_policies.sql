-- Migration: 0003_rls_policies.sql
-- Description: ENABLE + FORCE Row Level Security on all 18 application tables, deny anon, and enforce per-role ownership.
-- Non-negotiable: No client direct writes to status, totals, inventory, or ledger.

-- ========================================================
-- 1. Helper Functions for Role & Profile Identification
-- ========================================================

CREATE OR REPLACE FUNCTION public.current_salesperson_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.sales_person_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_delivery_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.delivery_person_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_salesperson_id() IS 'Returns current authenticated sales_person profile id without recursive RLS lookup.';
COMMENT ON FUNCTION public.current_delivery_person_id() IS 'Returns current authenticated delivery_person profile id without recursive RLS lookup.';

-- ========================================================
-- 2. Enable & Force RLS + Deny Anon Permissions
-- ========================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'sales_person_profiles',
    'delivery_person_profiles',
    'stores',
    'products',
    'categories',
    'brands',
    'store_visits',
    'orders',
    'order_items',
    'ledger_transactions',
    'follow_ups',
    'notifications',
    'location_history',
    'delivery_assignments',
    'warehouses',
    'inventory',
    'inventory_reservations',
    'stock_movements'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', t);
  END LOOP;
END $$;

-- ========================================================
-- 3. Profiles RLS
-- ========================================================

-- sales_person_profiles
DROP POLICY IF EXISTS "sales_profiles_select" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_select" ON public.sales_person_profiles
  FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

DROP POLICY IF EXISTS "sales_profiles_update" ON public.sales_person_profiles;
CREATE POLICY "sales_profiles_update" ON public.sales_person_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- delivery_person_profiles
DROP POLICY IF EXISTS "delivery_profiles_select" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_select" ON public.delivery_person_profiles
  FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

DROP POLICY IF EXISTS "delivery_profiles_update" ON public.delivery_person_profiles;
CREATE POLICY "delivery_profiles_update" ON public.delivery_person_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================================
-- 4. Stores RLS
-- ========================================================

DROP POLICY IF EXISTS "stores_select" ON public.stores;
CREATE POLICY "stores_select" ON public.stores
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR assigned_salesperson_id = public.current_salesperson_id()
  );

DROP POLICY IF EXISTS "stores_insert" ON public.stores;
CREATE POLICY "stores_insert" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (
    assigned_salesperson_id = public.current_salesperson_id()
    AND status = 'active'
  );

DROP POLICY IF EXISTS "stores_update" ON public.stores;
CREATE POLICY "stores_update" ON public.stores
  FOR UPDATE TO authenticated
  USING (assigned_salesperson_id = public.current_salesperson_id())
  WITH CHECK (assigned_salesperson_id = public.current_salesperson_id());

-- ========================================================
-- 5. Catalog Data (Products, Categories, Brands) RLS - Read Only
-- ========================================================

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "brands_select" ON public.brands;
CREATE POLICY "brands_select" ON public.brands
  FOR SELECT TO authenticated
  USING (status = 'active');

-- ========================================================
-- 6. Store Visits RLS
-- ========================================================

DROP POLICY IF EXISTS "store_visits_select" ON public.store_visits;
CREATE POLICY "store_visits_select" ON public.store_visits
  FOR SELECT TO authenticated
  USING (salesperson_id = public.current_salesperson_id());

DROP POLICY IF EXISTS "store_visits_insert" ON public.store_visits;
CREATE POLICY "store_visits_insert" ON public.store_visits
  FOR INSERT TO authenticated
  WITH CHECK (salesperson_id = public.current_salesperson_id());

DROP POLICY IF EXISTS "store_visits_update" ON public.store_visits;
CREATE POLICY "store_visits_update" ON public.store_visits
  FOR UPDATE TO authenticated
  USING (salesperson_id = public.current_salesperson_id())
  WITH CHECK (salesperson_id = public.current_salesperson_id());

-- ========================================================
-- 7. Orders & Order Items RLS (No direct client updates to status or totals)
-- ========================================================

DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    salesperson_id = public.current_salesperson_id()
    OR EXISTS (
      SELECT 1 FROM public.delivery_assignments da
      WHERE da.order_id = orders.id
        AND da.delivery_person_id = public.current_delivery_person_id()
    )
  );

-- Direct client updates to status, totals, or order records are DENIED.
-- Transitions and adjustments occur strictly through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "orders_deny_update" ON public.orders;
CREATE POLICY "orders_deny_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "orders_deny_delete" ON public.orders;
CREATE POLICY "orders_deny_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (false);

-- Order Items
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.salesperson_id = public.current_salesperson_id()
          OR EXISTS (
            SELECT 1 FROM public.delivery_assignments da
            WHERE da.order_id = o.id
              AND da.delivery_person_id = public.current_delivery_person_id()
          )
        )
    )
  );

-- Direct client inserts/updates to order items denied (handled via create_order RPC)
DROP POLICY IF EXISTS "order_items_deny_client_insert" ON public.order_items;
CREATE POLICY "order_items_deny_client_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "order_items_deny_client_update" ON public.order_items;
CREATE POLICY "order_items_deny_client_update" ON public.order_items
  FOR UPDATE TO authenticated
  USING (false);

-- ========================================================
-- 8. Ledger Transactions RLS (No client writes to ledger)
-- ========================================================

DROP POLICY IF EXISTS "ledger_select" ON public.ledger_transactions;
CREATE POLICY "ledger_select" ON public.ledger_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = ledger_transactions.store_id
        AND s.assigned_salesperson_id = public.current_salesperson_id()
    )
  );

-- Client writes to ledger transactions strictly denied (managed via record_payment RPC)
DROP POLICY IF EXISTS "ledger_deny_client_insert" ON public.ledger_transactions;
CREATE POLICY "ledger_deny_client_insert" ON public.ledger_transactions
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "ledger_deny_client_update" ON public.ledger_transactions;
CREATE POLICY "ledger_deny_client_update" ON public.ledger_transactions
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "ledger_deny_client_delete" ON public.ledger_transactions;
CREATE POLICY "ledger_deny_client_delete" ON public.ledger_transactions
  FOR DELETE TO authenticated
  USING (false);

-- ========================================================
-- 9. Follow Ups RLS
-- ========================================================

DROP POLICY IF EXISTS "follow_ups_select" ON public.follow_ups;
CREATE POLICY "follow_ups_select" ON public.follow_ups
  FOR SELECT TO authenticated
  USING (salesperson_id = public.current_salesperson_id());

DROP POLICY IF EXISTS "follow_ups_insert" ON public.follow_ups;
CREATE POLICY "follow_ups_insert" ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (salesperson_id = public.current_salesperson_id());

DROP POLICY IF EXISTS "follow_ups_update" ON public.follow_ups;
CREATE POLICY "follow_ups_update" ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (salesperson_id = public.current_salesperson_id())
  WITH CHECK (salesperson_id = public.current_salesperson_id());

DROP POLICY IF EXISTS "follow_ups_delete" ON public.follow_ups;
CREATE POLICY "follow_ups_delete" ON public.follow_ups
  FOR DELETE TO authenticated
  USING (salesperson_id = public.current_salesperson_id());

-- ========================================================
-- 10. Notifications RLS
-- ========================================================

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Direct client inserts and deletes denied (generated by server/RPCs)
DROP POLICY IF EXISTS "notifications_deny_insert" ON public.notifications;
CREATE POLICY "notifications_deny_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_deny_delete" ON public.notifications;
CREATE POLICY "notifications_deny_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (false);

-- ========================================================
-- 11. Location History RLS
-- ========================================================

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

DROP POLICY IF EXISTS "location_history_deny_update" ON public.location_history;
CREATE POLICY "location_history_deny_update" ON public.location_history
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "location_history_deny_delete" ON public.location_history;
CREATE POLICY "location_history_deny_delete" ON public.location_history
  FOR DELETE TO authenticated
  USING (false);

-- ========================================================
-- 12. Delivery Assignments RLS (No direct client updates to status)
-- ========================================================

DROP POLICY IF EXISTS "delivery_assignments_select" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_select" ON public.delivery_assignments
  FOR SELECT TO authenticated
  USING (
    delivery_person_id = public.current_delivery_person_id()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = delivery_assignments.order_id
        AND o.salesperson_id = public.current_salesperson_id()
    )
  );

-- Direct client status modification denied (must use RPCs: confirm_pickup, complete_delivery)
DROP POLICY IF EXISTS "delivery_assignments_deny_client_update" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_deny_client_update" ON public.delivery_assignments
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "delivery_assignments_deny_client_insert" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_deny_client_insert" ON public.delivery_assignments
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ========================================================
-- 13. Warehouses RLS (Read-only for authenticated)
-- ========================================================

DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "warehouses_deny_insert" ON public.warehouses;
CREATE POLICY "warehouses_deny_insert" ON public.warehouses
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "warehouses_deny_update" ON public.warehouses;
CREATE POLICY "warehouses_deny_update" ON public.warehouses
  FOR UPDATE TO authenticated
  USING (false);

-- ========================================================
-- 14. Inventory & Inventory Reservations RLS (No client writes)
-- ========================================================

DROP POLICY IF EXISTS "inventory_select" ON public.inventory;
CREATE POLICY "inventory_select" ON public.inventory
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "inventory_deny_insert" ON public.inventory;
CREATE POLICY "inventory_deny_insert" ON public.inventory
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "inventory_deny_update" ON public.inventory;
CREATE POLICY "inventory_deny_update" ON public.inventory
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "inventory_deny_delete" ON public.inventory;
CREATE POLICY "inventory_deny_delete" ON public.inventory
  FOR DELETE TO authenticated
  USING (false);

-- Inventory Reservations
DROP POLICY IF EXISTS "inventory_reservations_select" ON public.inventory_reservations;
CREATE POLICY "inventory_reservations_select" ON public.inventory_reservations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = inventory_reservations.order_id
        AND (
          o.salesperson_id = public.current_salesperson_id()
          OR EXISTS (
            SELECT 1 FROM public.delivery_assignments da
            WHERE da.order_id = o.id
              AND da.delivery_person_id = public.current_delivery_person_id()
          )
        )
    )
  );

DROP POLICY IF EXISTS "inventory_reservations_deny_insert" ON public.inventory_reservations;
CREATE POLICY "inventory_reservations_deny_insert" ON public.inventory_reservations
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "inventory_reservations_deny_update" ON public.inventory_reservations;
CREATE POLICY "inventory_reservations_deny_update" ON public.inventory_reservations
  FOR UPDATE TO authenticated
  USING (false);

-- ========================================================
-- 15. Stock Movements RLS (No direct client writes)
-- ========================================================

DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "stock_movements_deny_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_deny_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "stock_movements_deny_update" ON public.stock_movements;
CREATE POLICY "stock_movements_deny_update" ON public.stock_movements
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "stock_movements_deny_delete" ON public.stock_movements;
CREATE POLICY "stock_movements_deny_delete" ON public.stock_movements
  FOR DELETE TO authenticated
  USING (false);
