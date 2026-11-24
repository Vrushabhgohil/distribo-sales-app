import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { STORE_COLUMNS, SALES_PROFILE_COLUMNS } from './store-service';
import { PRODUCT_COLUMNS } from './product-service';
import { logger } from '@/lib/logger';

export const ORDER_COLUMNS =
  'id, order_number, store_id, salesperson_id, order_date, discount_amount, tax_amount, total_amount, notes, status, rejection_reason, confirmed_by, confirmed_at, created_at, updated_at' as const;

export const ORDER_ITEM_COLUMNS =
  'id, order_id, product_id, quantity, delivered_quantity, unit_price, total_price, created_at' as const;

export const orderService = {
  async getOrders(salespersonId?: string, status?: string): Promise<Order[]> {
    try {
      let query = supabase
        .from('orders')
        .select(
          `${ORDER_COLUMNS}, store:stores(${STORE_COLUMNS}), items:order_items(${ORDER_ITEM_COLUMNS}, product:products(${PRODUCT_COLUMNS}))`
        )
        .order('created_at', { ascending: false });

      if (salespersonId) {
        query = query.eq('salesperson_id', salespersonId);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        logger.warn('Orders fetch error:', error);
        return [];
      }
      return ((data || []) as unknown) as Order[];
    } catch (err) {
      logger.warn('Orders fetch exception:', err);
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `${ORDER_COLUMNS}, store:stores(${STORE_COLUMNS}), items:order_items(${ORDER_ITEM_COLUMNS}, product:products(${PRODUCT_COLUMNS}))`
        )
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        logger.warn('getOrderById error:', error);
        return null;
      }
      if (!data) return null;

      if (data.salesperson_id) {
        try {
          const { data: sp } = await supabase
            .from('sales_person_profiles')
            .select(SALES_PROFILE_COLUMNS)
            .eq('id', data.salesperson_id)
            .maybeSingle();
          if (sp) {
            (data as Record<string, unknown>).salesperson = sp;
          }
        } catch {
          // Profile lookup fallback
        }
      }

      return (data as unknown) as Order | null;
    } catch (err) {
      logger.warn('getOrderById exception:', err);
      return null;
    }
  },

  async createOrder(params: {
    storeId: string;
    salespersonId?: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
    notes?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; data?: Order; error?: string }> {
    try {
      if (!params.items || params.items.length === 0) {
        return { success: false, error: 'Order must contain at least one product.' };
      }

      const payloadItems = params.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.rpc('create_order', {
        p_store_id: params.storeId,
        p_items: payloadItems,
        p_notes: params.notes || null,
        p_idempotency_key: params.idempotencyKey || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as unknown as Order };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit order for Admin confirmation.';
      return { success: false, error: message };
    }
  },
};
