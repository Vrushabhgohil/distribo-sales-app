import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { STORE_COLUMNS, SALES_PROFILE_COLUMNS } from './store-service';
import { PRODUCT_COLUMNS } from './product-service';
import { logger } from '@/lib/logger';
import { offlineStorage } from '@/lib/offline-storage';

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
        logger.warn('Orders primary fetch error, trying fallback:', error);
        let fallbackQuery = supabase
          .from('orders')
          .select('*, store:stores(*), items:order_items(*, product:products(*))')
          .order('created_at', { ascending: false });

        if (salespersonId) {
          fallbackQuery = fallbackQuery.eq('salesperson_id', salespersonId);
        }
        if (status && status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status);
        }

        const fallback = await fallbackQuery;
        if (fallback.error) {
          logger.warn('Orders fallback fetch error, trying minimal:', fallback.error);
          let minQuery = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
          if (salespersonId) {
            minQuery = minQuery.eq('salesperson_id', salespersonId);
          }
          if (status && status !== 'all') {
            minQuery = minQuery.eq('status', status);
          }
          const minRes = await minQuery;
          if (minRes.error) {
            logger.warn('Orders minimal fetch error:', minRes.error);
            return [];
          }
          return ((minRes.data || []) as unknown) as Order[];
        }
        return ((fallback.data || []) as unknown) as Order[];
      }
      return ((data || []) as unknown) as Order[];
    } catch (err) {
      logger.warn('Orders fetch exception:', err);
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      let data: any = null;
      const primary = await supabase
        .from('orders')
        .select(
          `${ORDER_COLUMNS}, store:stores(${STORE_COLUMNS}), items:order_items(${ORDER_ITEM_COLUMNS}, product:products(${PRODUCT_COLUMNS}))`
        )
        .eq('id', orderId)
        .maybeSingle();

      if (primary.error) {
        logger.warn('getOrderById primary error, trying fallback:', primary.error);
        const fallback = await supabase
          .from('orders')
          .select('*, store:stores(*), items:order_items(*, product:products(*))')
          .eq('id', orderId)
          .maybeSingle();
        if (fallback.error) {
          logger.warn('getOrderById fallback error:', fallback.error);
          return null;
        }
        data = fallback.data;
      } else {
        data = primary.data;
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
    discountAmount?: number;
    taxAmount?: number;
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
        const msg = error.message || '';
        if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          await offlineStorage.addToOfflineQueue({
            action: 'CREATE_ORDER',
            payload: {
              storeId: params.storeId,
              salespersonId: params.salespersonId,
              items: payloadItems,
              discountAmount: params.discountAmount,
              taxAmount: params.taxAmount,
              notes: params.notes,
            },
          });
          return {
            success: false,
            error: 'Offline: Order saved locally to sync queue and will submit for Admin confirmation when online.',
          };
        }
        return { success: false, error: error.message };
      }

      const createdOrder = data as unknown as Order;
      const discount = params.discountAmount || 0;
      const tax = params.taxAmount || 0;

      if (createdOrder?.id && (discount > 0 || tax > 0)) {
        const baseTotal = createdOrder.total_amount || 0;
        const discountedTotal = Math.max(0, baseTotal - discount + tax);
        try {
          await supabase
            .from('orders')
            .update({
              discount_amount: discount,
              tax_amount: tax,
              total_amount: discountedTotal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', createdOrder.id);
          createdOrder.discount_amount = discount;
          createdOrder.tax_amount = tax;
          createdOrder.total_amount = discountedTotal;
        } catch {
          // If RLS blocks direct update, still preserve on client order object
          createdOrder.discount_amount = discount;
          createdOrder.tax_amount = tax;
          createdOrder.total_amount = discountedTotal;
        }
      }

      return { success: true, data: createdOrder };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit order for Admin confirmation.';
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        await offlineStorage.addToOfflineQueue({
          action: 'CREATE_ORDER',
          payload: {
            storeId: params.storeId,
            salespersonId: params.salespersonId,
            items: params.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            notes: params.notes,
          },
        });
        return {
          success: false,
          error: 'Offline: Order queued locally and will synchronize for Admin confirmation when connectivity returns.',
        };
      }
      return { success: false, error: message };
    }
  },
};
