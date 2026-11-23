-- Migration: 0004_server_business_logic.sql
-- Description: Transactional SECURITY DEFINER RPCs with row locking, server calculations, and auth enforcement.
-- Tables affected: orders, order_items, ledger_transactions, delivery_assignments, inventory, inventory_reservations, stock_movements, notifications.

-- Sequence for unique order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- Table for idempotency key tracking to prevent replay attacks / duplicate orders/payments
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  caller_id uuid NOT NULL,
  endpoint text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.idempotency_keys FROM anon;
CREATE POLICY "idempotency_caller_own" ON public.idempotency_keys
  FOR ALL TO authenticated
  USING (caller_id = auth.uid());

-- ========================================================
-- 1. RPC: create_order
-- Atomic: server prices, order number sequence, header + items + notification
-- ========================================================
CREATE OR REPLACE FUNCTION public.create_order(
  p_store_id uuid,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_salesperson_id uuid;
  v_cached_response jsonb;
  v_order_id uuid;
  v_order_number text;
  v_total_amount numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_selling_price numeric;
  v_line_total numeric;
  v_store_name text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_cached_response
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND caller_id = v_caller_id;

    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  -- 2. Verify active salesperson
  SELECT id INTO v_salesperson_id
  FROM public.sales_person_profiles
  WHERE user_id = v_caller_id AND status = 'active';

  IF v_salesperson_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not an active sales representative';
  END IF;

  -- 3. Verify store
  SELECT name INTO v_store_name
  FROM public.stores
  WHERE id = p_store_id AND status = 'active';

  IF v_store_name IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive store';
  END IF;

  -- 4. Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one product';
  END IF;

  -- Generate unique atomic order number
  v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  v_order_id := gen_random_uuid();

  -- Calculate total amount server-side based on database selling_price
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;

    SELECT selling_price INTO v_selling_price
    FROM public.products
    WHERE id = v_product_id AND status = 'active';

    IF v_selling_price IS NULL THEN
      RAISE EXCEPTION 'Product % not found or inactive', v_product_id;
    END IF;

    v_line_total := v_quantity * v_selling_price;
    v_total_amount := v_total_amount + v_line_total;
  END LOOP;

  -- Insert order header
  INSERT INTO public.orders (
    id,
    order_number,
    store_id,
    salesperson_id,
    order_date,
    discount_amount,
    tax_amount,
    total_amount,
    notes,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    p_store_id,
    v_salesperson_id,
    current_date,
    0,
    0,
    v_total_amount,
    p_notes,
    'pending',
    now(),
    now()
  );

  -- Insert order items with server-resolved prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT selling_price INTO v_selling_price
    FROM public.products
    WHERE id = v_product_id;

    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      quantity,
      delivered_quantity,
      unit_price,
      total_price,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      v_product_id,
      v_quantity,
      0,
      v_selling_price,
      v_quantity * v_selling_price,
      now()
    );
  END LOOP;

  -- Insert notification for central admin and sales officer
  INSERT INTO public.notifications (
    id,
    user_id,
    title,
    message,
    type,
    reference_type,
    reference_id,
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_caller_id,
    'New Order Booked',
    format('Order %s booked for %s (Amount: ₹%s) awaiting confirmation.', v_order_number, v_store_name, v_total_amount),
    'order',
    'orders',
    v_order_id,
    false,
    now()
  );

  -- Build result object
  v_cached_response := jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'store_id', p_store_id,
    'salesperson_id', v_salesperson_id,
    'total_amount', v_total_amount,
    'status', 'pending'
  );

  -- Store idempotency record if key provided
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys (key, caller_id, endpoint, response)
    VALUES (p_idempotency_key, v_caller_id, 'create_order', v_cached_response)
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- ========================================================
-- 2. RPC: record_payment
-- Atomic: locked ledger, validation (amount > 0), server-computed balance
-- ========================================================
CREATE OR REPLACE FUNCTION public.record_payment(
  p_store_id uuid,
  p_amount numeric,
  p_payment_mode text,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_cached_response jsonb;
  v_prev_balance numeric := 0;
  v_new_balance numeric;
  v_txn_id uuid := gen_random_uuid();
  v_desc text;
  v_store_name text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- 1. Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_cached_response
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND caller_id = v_caller_id;

    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  -- 2. Verify store
  SELECT name INTO v_store_name
  FROM public.stores
  WHERE id = p_store_id;

  IF v_store_name IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  -- 3. Lock latest ledger transaction row for this store to prevent balance concurrency race conditions
  SELECT running_balance INTO v_prev_balance
  FROM public.ledger_transactions
  WHERE store_id = p_store_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_prev_balance := coalesce(v_prev_balance, 0);
  v_new_balance := greatest(0, v_prev_balance - p_amount);

  v_desc := format('Payment Collection (%s)%s%s',
    upper(coalesce(p_payment_mode, 'CASH')),
    case when p_reference_number is not null and trim(p_reference_number) <> '' then ' • Ref: ' || p_reference_number else '' end,
    case when p_notes is not null and trim(p_notes) <> '' then ' • ' || p_notes else '' end
  );

  INSERT INTO public.ledger_transactions (
    id,
    store_id,
    transaction_date,
    transaction_type,
    debit,
    credit,
    running_balance,
    description,
    reference_type,
    created_at
  ) VALUES (
    v_txn_id,
    p_store_id,
    current_date,
    'credit',
    0,
    p_amount,
    v_new_balance,
    v_desc,
    'payment',
    now()
  );

  v_cached_response := jsonb_build_object(
    'id', v_txn_id,
    'store_id', p_store_id,
    'amount', p_amount,
    'running_balance', v_new_balance,
    'status', 'success'
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys (key, caller_id, endpoint, response)
    VALUES (p_idempotency_key, v_caller_id, 'record_payment', v_cached_response)
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- ========================================================
-- 3. RPC: confirm_pickup
-- Atomic: inventory reservation transition, stock_movements (created_by = auth.uid)
-- ========================================================
CREATE OR REPLACE FUNCTION public.confirm_pickup(
  p_assignment_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_delivery_person_id uuid;
  v_delivery_person_name text;
  v_order_id uuid;
  v_order_number text;
  v_item record;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, name INTO v_delivery_person_id, v_delivery_person_name
  FROM public.delivery_person_profiles
  WHERE user_id = v_caller_id AND status = 'active';

  IF v_delivery_person_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not an active delivery pilot';
  END IF;

  -- Lock delivery assignment row
  SELECT order_id INTO v_order_id
  FROM public.delivery_assignments
  WHERE id = p_assignment_id AND delivery_person_id = v_delivery_person_id
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Delivery assignment not found or unauthorized';
  END IF;

  -- Lock order row
  SELECT order_number INTO v_order_number
  FROM public.orders
  WHERE id = v_order_id
  FOR UPDATE;

  -- Update assignment status
  UPDATE public.delivery_assignments
  SET
    status = 'in_transit',
    delivery_notes = coalesce(p_notes, delivery_notes),
    updated_at = now()
  WHERE id = p_assignment_id;

  -- Update order status
  UPDATE public.orders
  SET
    status = 'out_for_delivery',
    updated_at = now()
  WHERE id = v_order_id;

  -- Update reservations
  UPDATE public.inventory_reservations
  SET
    status = 'dispatched',
    updated_at = now()
  WHERE order_id = v_order_id AND status = 'active';

  -- Record stock movements with created_by = auth.uid()
  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = v_order_id LOOP
    INSERT INTO public.stock_movements (
      id,
      product_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_item.product_id,
      'dispatch',
      v_item.quantity,
      'orders',
      v_order_id,
      format('Dispatched to pilot %s for order %s', v_delivery_person_name, v_order_number),
      v_caller_id,
      now()
    );
  END LOOP;

  -- Notification
  INSERT INTO public.notifications (
    id,
    user_id,
    title,
    message,
    type,
    reference_type,
    reference_id,
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NULL,
    'Order Dispatched from Godown',
    format('Order %s has been picked up by %s and is out for delivery.', v_order_number, v_delivery_person_name),
    'delivery',
    'orders',
    v_order_id,
    false,
    now()
  );

  RETURN jsonb_build_object(
    'assignment_id', p_assignment_id,
    'order_id', v_order_id,
    'status', 'in_transit'
  );
END;
$$;

-- ========================================================
-- 4. RPC: start_delivery
-- ========================================================
CREATE OR REPLACE FUNCTION public.start_delivery(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_delivery_person_id uuid;
  v_order_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_delivery_person_id
  FROM public.delivery_person_profiles
  WHERE user_id = v_caller_id AND status = 'active';

  IF v_delivery_person_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT order_id INTO v_order_id
  FROM public.delivery_assignments
  WHERE id = p_assignment_id AND delivery_person_id = v_delivery_person_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  UPDATE public.delivery_assignments
  SET status = 'in_transit', updated_at = now()
  WHERE id = p_assignment_id;

  UPDATE public.orders
  SET status = 'out_for_delivery', updated_at = now()
  WHERE id = v_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'in_transit');
END;
$$;

-- ========================================================
-- 5. RPC: complete_delivery
-- Atomic: delivered_quantity validation, inventory arithmetic locking, stock_movements
-- ========================================================
CREATE OR REPLACE FUNCTION public.complete_delivery(
  p_assignment_id uuid,
  p_line_items jsonb,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_delivery_person_id uuid;
  v_delivery_person_name text;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_order_item_id uuid;
  v_delivered_qty integer;
  v_ordered_qty integer;
  v_product_id uuid;
  v_total_ordered integer := 0;
  v_total_delivered integer := 0;
  v_is_partial boolean;
  v_final_status text;
  v_undelivered integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, name INTO v_delivery_person_id, v_delivery_person_name
  FROM public.delivery_person_profiles
  WHERE user_id = v_caller_id AND status = 'active';

  IF v_delivery_person_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not an active delivery pilot';
  END IF;

  -- Lock assignment
  SELECT order_id INTO v_order_id
  FROM public.delivery_assignments
  WHERE id = p_assignment_id AND delivery_person_id = v_delivery_person_id
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Assignment not found or unauthorized';
  END IF;

  SELECT order_number INTO v_order_number
  FROM public.orders
  WHERE id = v_order_id
  FOR UPDATE;

  -- Process line items with locking
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items) LOOP
    v_order_item_id := (v_item->>'orderItemId')::uuid;
    v_delivered_qty := (v_item->>'deliveredQty')::integer;

    IF v_delivered_qty < 0 THEN
      RAISE EXCEPTION 'Delivered quantity cannot be negative';
    END IF;

    -- Lock order item
    SELECT quantity, product_id INTO v_ordered_qty, v_product_id
    FROM public.order_items
    WHERE id = v_order_item_id AND order_id = v_order_id
    FOR UPDATE;

    IF v_ordered_qty IS NULL THEN
      RAISE EXCEPTION 'Order item % not found for order', v_order_item_id;
    END IF;

    IF v_delivered_qty > v_ordered_qty THEN
      RAISE EXCEPTION 'Delivered quantity (%) exceeds ordered quantity (%)', v_delivered_qty, v_ordered_qty;
    END IF;

    v_total_ordered := v_total_ordered + v_ordered_qty;
    v_total_delivered := v_total_delivered + v_delivered_qty;

    -- Update order item delivered quantity
    UPDATE public.order_items
    SET delivered_quantity = v_delivered_qty
    WHERE id = v_order_item_id;

    -- Lock and adjust inventory atomically
    -- Deduct actual delivered stock from current_stock and reserved_stock
    v_undelivered := v_ordered_qty - v_delivered_qty;

    UPDATE public.inventory
    SET
      current_stock = greatest(0, current_stock - v_delivered_qty),
      reserved_stock = greatest(0, reserved_stock - v_ordered_qty),
      available_stock = available_stock + v_undelivered,
      updated_at = now()
    WHERE product_id = v_product_id;

    -- Record stock movement
    IF v_delivered_qty > 0 THEN
      INSERT INTO public.stock_movements (
        id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'delivery',
        v_delivered_qty,
        'orders',
        v_order_id,
        format('Delivered by pilot %s for order %s', v_delivery_person_name, v_order_number),
        v_caller_id,
        now()
      );
    END IF;
  END LOOP;

  v_is_partial := (v_total_delivered < v_total_ordered);
  v_final_status := case when v_is_partial then 'partially_delivered' else 'delivered' end;

  -- Update assignment
  UPDATE public.delivery_assignments
  SET
    status = v_final_status,
    delivery_notes = coalesce(p_notes, delivery_notes),
    completed_at = now(),
    updated_at = now()
  WHERE id = p_assignment_id;

  -- Update order
  UPDATE public.orders
  SET
    status = v_final_status,
    updated_at = now()
  WHERE id = v_order_id;

  -- Notification
  INSERT INTO public.notifications (
    id,
    user_id,
    title,
    message,
    type,
    reference_type,
    reference_id,
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NULL,
    case when v_is_partial then 'Order Partially Delivered' else 'Order Successfully Delivered' end,
    format('Order %s delivery status: %s (Delivered %s of %s units).', v_order_number, v_final_status, v_total_delivered, v_total_ordered),
    'delivery',
    'orders',
    v_order_id,
    false,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_partial', v_is_partial,
    'status', v_final_status,
    'total_delivered', v_total_delivered
  );
END;
$$;

-- ========================================================
-- 6. RPC: mark_all_notifications_read (Caller-scoped)
-- ========================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE (user_id = v_caller_id OR user_id IS NULL)
    AND is_read = false;
END;
$$;

-- Revoke from public, grant to authenticated
REVOKE ALL ON FUNCTION public.create_order(uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.record_payment(uuid, numeric, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_pickup(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_pickup(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.start_delivery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_delivery(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_delivery(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
