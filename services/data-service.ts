import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import {
  Store,
  Product,
  Category,
  Brand,
  Order,
  OrderItem,
  StoreVisit,
  LedgerTransaction,
  FollowUp,
  NotificationItem,
  LocationEntry,
} from '@/types';

export const dataService = {
  // ========================================================
  // STORES
  // ========================================================
  async getStores(salespersonId?: string): Promise<Store[]> {
    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (salespersonId) {
        query = query.eq('assigned_salesperson_id', salespersonId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Stores fetch error, using cache:', error);
        return await offlineStorage.getStores();
      }

      const stores = (data || []) as Store[];
      await offlineStorage.saveStores(stores);
      return stores;
    } catch (err) {
      console.warn('Network exception loading stores, using offline cache:', err);
      return await offlineStorage.getStores();
    }
  },

  async getStoreById(storeId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*, assigned_salesperson:sales_person_profiles(*)')
      .eq('id', storeId)
      .maybeSingle();

    if (error) {
      console.warn('Get store error:', error);
      const cached = await offlineStorage.getStores();
      return cached.find((s) => s.id === storeId) || null;
    }
    return data as Store | null;
  },

  async createStore(
    storeData: Omit<Store, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: Store; error?: string }> {
    try {
      const cleanMobile = storeData.mobile.trim();
      const { data: existing } = await supabase
        .from('stores')
        .select('id, name')
        .eq('mobile', cleanMobile)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: `Store with mobile number ${cleanMobile} already exists (${existing.name}).`,
        };
      }

      const { data, error } = await supabase
        .from('stores')
        .insert([
          {
            ...storeData,
            mobile: cleanMobile,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update offline store cache
      const currentCache = await offlineStorage.getStores();
      await offlineStorage.saveStores([...currentCache, data as Store]);

      return { success: true, data: data as Store };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create store outlet.' };
    }
  },

  // ========================================================
  // PRODUCTS & CATALOG
  // ========================================================
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, brand:brands(*), category:categories(*)')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.warn('Products fetch error, using cache:', error);
        return await offlineStorage.getProducts();
      }

      const products = (data || []) as Product[];
      await offlineStorage.saveProducts(products);
      return products;
    } catch (err) {
      console.warn('Network exception loading products, using cache:', err);
      return await offlineStorage.getProducts();
    }
  },

  async getProductById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, brand:brands(*), category:categories(*)')
      .eq('id', productId)
      .maybeSingle();

    if (error) return null;
    return data as Product | null;
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) return [];
    return (data || []) as Category[];
  },

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) return [];
    return (data || []) as Brand[];
  },

  // ========================================================
  // STORE VISITS (BEAT VISITS)
  // ========================================================
  async getActiveVisit(salespersonId: string): Promise<StoreVisit | null> {
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .select('*, store:stores(*)')
        .eq('salesperson_id', salespersonId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Active visit check error:', error);
        return null;
      }
      return data as StoreVisit | null;
    } catch (err) {
      console.warn('Active visit fetch exception:', err);
      return null;
    }
  },

  async getTodayVisits(salespersonId: string): Promise<StoreVisit[]> {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .select('*, store:stores(*)')
        .eq('salesperson_id', salespersonId)
        .eq('visit_date', today)
        .order('check_in_time', { ascending: false });

      if (error) return [];
      return (data || []) as StoreVisit[];
    } catch {
      return [];
    }
  },

  async getStoreVisits(storeId: string): Promise<StoreVisit[]> {
    const { data, error } = await supabase
      .from('store_visits')
      .select('*')
      .eq('store_id', storeId)
      .order('check_in_time', { ascending: false })
      .limit(20);

    if (error) return [];
    return (data || []) as StoreVisit[];
  },

  async startVisit(
    storeId: string,
    salespersonId: string,
    coords?: { latitude: number; longitude: number }
  ): Promise<{ success: boolean; data?: StoreVisit; error?: string }> {
    try {
      // 1. Check if an active visit already exists
      const existing = await this.getActiveVisit(salespersonId);
      if (existing) {
        return {
          success: false,
          error: `You already have an active visit at ${existing.store?.name || 'another store'}. Please check out before starting a new visit.`,
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('store_visits')
        .insert([
          {
            store_id: storeId,
            salesperson_id: salespersonId,
            visit_date: today,
            check_in_time: now,
            latitude: coords?.latitude || null,
            longitude: coords?.longitude || null,
          },
        ])
        .select('*, store:stores(*)')
        .single();

      if (error) throw error;

      // Also record location history entry tagged with on_visit and store_id
      if (coords?.latitude && coords?.longitude) {
        await this.recordLocationPing({
          salespersonId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: 'on_visit',
          storeId,
        });
      }

      return { success: true, data: data as StoreVisit };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to start store visit.' };
    }
  },

  async finishVisit(
    visitId: string,
    outcome: string,
    notes?: string,
    coords?: { latitude: number; longitude: number }
  ): Promise<{ success: boolean; data?: StoreVisit; error?: string }> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('store_visits')
        .update({
          check_out_time: now,
          outcome: outcome.trim(),
          notes: notes?.trim() || null,
        })
        .eq('id', visitId)
        .select('*, store:stores(*)')
        .single();

      if (error) throw error;

      // Update location status back to online/travelling
      if (coords?.latitude && coords?.longitude && data?.salesperson_id) {
        await this.recordLocationPing({
          salespersonId: data.salesperson_id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: 'online',
        });
      }

      return { success: true, data: data as StoreVisit };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to finish visit.' };
    }
  },

  // ========================================================
  // ORDERS (Strict Admin Approval Workflow)
  // ========================================================
  async getOrders(salespersonId?: string, status?: string): Promise<Order[]> {
    try {
      let query = supabase
        .from('orders')
        .select('*, store:stores(*), items:order_items(*, product:products(*))')
        .order('created_at', { ascending: false });

      if (salespersonId) {
        query = query.eq('salesperson_id', salespersonId);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Orders fetch error:', error);
        return [];
      }
      return (data || []) as Order[];
    } catch (err) {
      console.warn('Orders fetch exception:', err);
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, store:stores(*), items:order_items(*, product:products(*))')
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        console.warn('getOrderById error:', error);
        return null;
      }
      if (!data) return null;

      if (data.salesperson_id) {
        try {
          const { data: sp } = await supabase
            .from('sales_person_profiles')
            .select('*')
            .eq('id', data.salesperson_id)
            .maybeSingle();
          if (sp) {
            (data as any).salesperson = sp;
          }
        } catch {
          // Non-critical if salesperson profile is not queryable
        }
      }

      return data as Order | null;
    } catch (err) {
      console.warn('getOrderById exception:', err);
      return null;
    }
  },

  async createOrder(params: {
    storeId: string;
    salespersonId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
  }): Promise<{ success: boolean; data?: Order; error?: string }> {
    try {
      if (!params.items || params.items.length === 0) {
        return { success: false, error: 'Order must contain at least one product.' };
      }

      // Generate order number: ORD-YYYYMMDD-XXXX
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${datePart}-${randomSuffix}`;

      // Calculate total amount
      const totalAmount = params.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      // Step 1: Insert Order header with pending status (MANDATORY ADMIN CONFIRMATION)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            store_id: params.storeId,
            salesperson_id: params.salespersonId,
            order_date: new Date().toISOString().split('T')[0],
            discount_amount: 0,
            tax_amount: 0,
            total_amount: totalAmount,
            notes: params.notes || null,
            status: 'pending', // Strictly Pending Admin Confirmation
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Step 2: Insert order items atomically
      const itemsToInsert = params.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        delivered_quantity: 0,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback order header if items fail
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsError;
      }

      // Step 3: Insert in-app notification for order booking
      try {
        await supabase.from('notifications').insert([
          {
            title: 'New Order Booked',
            message: `Order ${orderNumber} booked and awaiting Admin confirmation.`,
            type: 'order',
            reference_type: 'orders',
            reference_id: order.id,
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.warn('Notification log skipped:', notifErr);
      }

      return { success: true, data: order as Order };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit order for Admin confirmation.' };
    }
  },

  // ========================================================
  // CUSTOMER LEDGER TRANSACTIONS
  // ========================================================
  async getStoreLedger(storeId: string): Promise<LedgerTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Ledger fetch error:', error);
        return [];
      }
      return (data || []) as LedgerTransaction[];
    } catch {
      return [];
    }
  },

  async recordPayment(params: {
    storeId: string;
    amount: number;
    paymentMode: string;
    referenceNumber?: string;
    notes?: string;
    salespersonId?: string;
  }): Promise<{ success: boolean; data?: LedgerTransaction; error?: string }> {
    try {
      // Get previous running balance
      const { data: latestTxn } = await supabase
        .from('ledger_transactions')
        .select('running_balance')
        .eq('store_id', params.storeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevBal = latestTxn?.running_balance || 0;
      const newBal = Math.max(0, prevBal - params.amount);

      const desc = `Payment Collection (${params.paymentMode.toUpperCase()})${
        params.referenceNumber ? ` • Ref: ${params.referenceNumber}` : ''
      }${params.notes ? ` • ${params.notes}` : ''}`;

      const { data, error } = await supabase
        .from('ledger_transactions')
        .insert([
          {
            store_id: params.storeId,
            transaction_date: new Date().toISOString().split('T')[0],
            transaction_type: 'credit',
            debit: 0,
            credit: params.amount,
            running_balance: newBal,
            description: desc,
            reference_type: 'payment',
          },
        ])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data as LedgerTransaction };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record payment' };
    }
  },

  // ========================================================
  // FOLLOW-UPS
  // ========================================================
  async getFollowUps(salespersonId: string): Promise<FollowUp[]> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, store:stores(*)')
        .eq('salesperson_id', salespersonId)
        .order('follow_up_date', { ascending: true });

      if (error) {
        console.warn('Follow-ups fetch error:', error);
        return [];
      }
      return (data || []) as FollowUp[];
    } catch {
      return [];
    }
  },

  async createFollowUp(
    followUp: Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: FollowUp; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert([followUp])
        .select('*, store:stores(*)')
        .single();

      if (error) throw error;
      return { success: true, data: data as FollowUp };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create follow-up reminder.' };
    }
  },

  async updateFollowUpStatus(
    id: string,
    status: FollowUp['status']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update follow-up.' };
    }
  },

  // ========================================================
  // IN-APP NOTIFICATIONS
  // ========================================================
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return (data || []) as NotificationItem[];
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) {
      console.warn('Notification update error:', e);
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    } catch (e) {
      console.warn('Notifications mark all error:', e);
    }
  },

  // ========================================================
  // LOCATION TELEMETRY & GPS PINGS
  // Writes directly to public.location_history consumed by Admin CRM
  // ========================================================
  async recordLocationPing(entry: {
    salespersonId: string;
    latitude: number;
    longitude: number;
    status?: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
    storeId?: string | null;
  }): Promise<LocationEntry | null> {
    const payload = {
      salesperson_id: entry.salespersonId,
      latitude: entry.latitude,
      longitude: entry.longitude,
      status: entry.status || 'online',
      store_id: entry.storeId || null,
      recorded_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('location_history')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Direct location ping failed, queuing offline:', error);
        await offlineStorage.queuePendingLocation(payload);
        return null;
      }

      // Check if there are queued offline locations to flush
      const queued = await offlineStorage.getPendingLocations();
      if (queued.length > 0) {
        try {
          await supabase.from('location_history').insert(queued);
          await offlineStorage.clearPendingLocations();
        } catch (flushErr) {
          console.warn('Flush offline locations error:', flushErr);
        }
      }

      return data as LocationEntry;
    } catch (networkErr) {
      console.warn('Network error recording location, saving offline:', networkErr);
      await offlineStorage.queuePendingLocation(payload);
      return null;
    }
  },

  async getLatestSalespersonLocation(salespersonId: string): Promise<LocationEntry | null> {
    try {
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .eq('salesperson_id', salespersonId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as LocationEntry | null;
    } catch {
      return null;
    }
  },

  async getLocationHistory(salespersonId: string, limit = 50): Promise<LocationEntry[]> {
    try {
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .eq('salesperson_id', salespersonId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) return [];
      return (data || []) as LocationEntry[];
    } catch {
      return [];
    }
  },
};

