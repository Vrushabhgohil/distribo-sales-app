import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import {
  DeliveryAssignment,
  DeliveryAssignmentStatus,
  Order,
  Warehouse,
} from '@/types';

// Explicit column projection constants - no select('*') on application tables
const ASSIGNMENT_COLUMNS =
  'id, order_id, delivery_person_id, assigned_date, vehicle_type, vehicle_number, status, completed_at, notes, created_at, updated_at';
const ORDER_COLUMNS =
  'id, order_number, store_id, salesperson_id, order_date, discount_amount, tax_amount, total_amount, notes, status, rejection_reason, confirmed_by, confirmed_at, created_at, updated_at';
const STORE_COLUMNS =
  'id, name, owner_name, mobile, address, area, pincode, store_type, latitude, longitude, balance, credit_limit, gst_number, is_active, created_at, updated_at';
const ORDER_ITEM_COLUMNS =
  'id, order_id, product_id, quantity, delivered_quantity, unit_price, total_price, created_at';
const PRODUCT_COLUMNS =
  'id, name, sku, category_id, brand_id, unit, price, cost_price, description, image_url, is_active, created_at, updated_at';
const WAREHOUSE_COLUMNS =
  'id, name, code, address, city, contact_person, contact_mobile, is_active, created_at, updated_at';

export const deliveryService = {
  // ========================================================
  // 1. GET ASSIGNED DELIVERIES FOR DELIVERY PILOT
  // ========================================================
  async getAssignedDeliveries(
    deliveryPersonId: string,
    filterStatus?: string
  ): Promise<DeliveryAssignment[]> {
    if (!isSupabaseConfigured || !deliveryPersonId) {
      return await offlineStorage.getDeliveries();
    }

    try {
      let query = supabase
        .from('delivery_assignments')
        .select(`
          ${ASSIGNMENT_COLUMNS},
          order:orders (
            ${ORDER_COLUMNS},
            store:stores (${STORE_COLUMNS}),
            items:order_items (
              ${ORDER_ITEM_COLUMNS},
              product:products (${PRODUCT_COLUMNS})
            )
          )
        `)
        .eq('delivery_person_id', deliveryPersonId)
        .order('assigned_date', { ascending: false });

      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'pending') {
          query = query.in('status', ['assigned']);
        } else if (filterStatus === 'ready_for_pickup') {
          query = query.eq('status', 'assigned');
        } else if (filterStatus === 'out_for_delivery') {
          query = query.eq('status', 'in_transit');
        } else {
          query = query.eq('status', filterStatus);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Delivery fetch error, falling back to cache:', error);
        return await offlineStorage.getDeliveries();
      }

      const deliveries = ((data || []) as unknown) as DeliveryAssignment[];
      // Cache for offline resiliency
      await offlineStorage.saveDeliveries(deliveries);
      return deliveries;
    } catch (err) {
      console.warn('Network exception while fetching deliveries, using cache:', err);
      return await offlineStorage.getDeliveries();
    }
  },

  // ========================================================
  // 2. GET SINGLE DELIVERY BY ASSIGNMENT ID
  // ========================================================
  async getDeliveryById(
    assignmentId: string,
    deliveryPersonId?: string
  ): Promise<DeliveryAssignment | null> {
    try {
      let query = supabase
        .from('delivery_assignments')
        .select(`
          ${ASSIGNMENT_COLUMNS},
          order:orders (
            ${ORDER_COLUMNS},
            store:stores (${STORE_COLUMNS}),
            items:order_items (
              ${ORDER_ITEM_COLUMNS},
              product:products (${PRODUCT_COLUMNS})
            )
          )
        `)
        .eq('id', assignmentId);

      if (deliveryPersonId) {
        query = query.eq('delivery_person_id', deliveryPersonId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        const cached = await offlineStorage.getDeliveries();
        return cached.find((d) => d.id === assignmentId) || null;
      }

      const assignment = (data as unknown) as DeliveryAssignment;

      // Populate salesperson details if present
      if (assignment.order?.salesperson_id) {
        const { data: sp } = await supabase
          .from('sales_person_profiles')
          .select('id, name, employee_id, mobile')
          .eq('id', assignment.order.salesperson_id)
          .maybeSingle();
        if (sp) {
          assignment.order.salesperson = sp as any;
        }
      }

      return assignment;
    } catch (err) {
      console.warn('Error fetching delivery by ID:', err);
      const cached = await offlineStorage.getDeliveries();
      return cached.find((d) => d.id === assignmentId) || null;
    }
  },

  // ========================================================
  // 3. GET WAREHOUSE DETAILS (For Central FMCG Godown)
  // ========================================================
  async getCentralWarehouse(): Promise<Warehouse | null> {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select(WAREHOUSE_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return data as Warehouse;
      }
      return null;
    } catch {
      return null;
    }
  },

  // ========================================================
  // 4. CONFIRM WAREHOUSE PICKUP
  // ========================================================
  async confirmPickup(params: {
    assignmentId: string;
    orderId?: string;
    deliveryPersonId?: string;
    deliveryPersonName?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('confirm_pickup', {
        p_assignment_id: params.assignmentId,
        p_notes: params.notes || null,
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Failed to confirm warehouse pickup.',
        };
      }

      return {
        success: true,
        message: 'Warehouse pickup confirmed. The order is now out for delivery!',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to confirm warehouse pickup.';
      return { success: false, message };
    }
  },

  // ========================================================
  // 5. START DELIVERY / IN-TRANSIT UPDATE
  // ========================================================
  async startDelivery(params: {
    assignmentId: string;
    orderId?: string;
    deliveryPersonId?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('start_delivery', {
        p_assignment_id: params.assignmentId,
      });

      if (error) {
        return { success: false, message: error.message || 'Could not update transit status.' };
      }

      return { success: true, message: 'Transit started towards the retail outlet.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update transit status.';
      return { success: false, message };
    }
  },

  // ========================================================
  // 6. COMPLETE DELIVERY (FULL OR PARTIAL DROP)
  // ========================================================
  async completeDelivery(params: {
    assignmentId: string;
    orderId?: string;
    deliveryPersonId?: string;
    deliveryPersonName?: string;
    lineItemDeliveries: {
      orderItemId: string;
      productId: string;
      orderedQty: number;
      deliveredQty: number;
    }[];
    notes?: string;
  }): Promise<{ success: boolean; isPartial: boolean; message: string }> {
    try {
      const payloadLineItems = params.lineItemDeliveries.map((item) => ({
        orderItemId: item.orderItemId,
        deliveredQty: item.deliveredQty,
      }));

      const { data, error } = await supabase.rpc('complete_delivery', {
        p_assignment_id: params.assignmentId,
        p_line_items: payloadLineItems,
        p_notes: params.notes || null,
      });

      if (error) {
        return {
          success: false,
          isPartial: false,
          message: error.message || 'Failed to complete delivery.',
        };
      }

      const result = data as { is_partial?: boolean };
      const isPartial = Boolean(result?.is_partial);

      return {
        success: true,
        isPartial,
        message: isPartial
          ? 'Delivery recorded as Partial. Undelivered stock returned to warehouse inventory.'
          : 'Order successfully delivered to retailer!',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete delivery.';
      return { success: false, isPartial: false, message };
    }
  },

  // ========================================================
  // 7. GET DASHBOARD METRICS FOR DELIVERY PILOT
  // ========================================================
  async getDashboardMetrics(deliveryPersonId: string): Promise<{
    totalAssigned: number;
    pendingPickup: number;
    outForDelivery: number;
    completedToday: number;
    partiallyDelivered: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select('id, status, assigned_date, completed_at')
        .eq('delivery_person_id', deliveryPersonId);

      if (error || !data) {
        return {
          totalAssigned: 0,
          pendingPickup: 0,
          outForDelivery: 0,
          completedToday: 0,
          partiallyDelivered: 0,
        };
      }

      let totalAssigned = 0;
      let pendingPickup = 0;
      let outForDelivery = 0;
      let completedToday = 0;
      let partiallyDelivered = 0;

      for (const item of data) {
        totalAssigned++;
        if (item.status === 'assigned') {
          pendingPickup++;
        } else if (item.status === 'in_transit') {
          outForDelivery++;
        } else if (item.status === 'delivered') {
          completedToday++;
        } else if (item.status === 'partially_delivered') {
          partiallyDelivered++;
        }
      }

      return {
        totalAssigned,
        pendingPickup,
        outForDelivery,
        completedToday,
        partiallyDelivered,
      };
    } catch {
      return {
        totalAssigned: 0,
        pendingPickup: 0,
        outForDelivery: 0,
        completedToday: 0,
        partiallyDelivered: 0,
      };
    }
  },
};

