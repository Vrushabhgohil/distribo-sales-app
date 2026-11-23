import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import { locationService } from '@/services/location-service';
import {
  storeFormSchema,
  visitFormSchema,
  followUpFormSchema,
} from '@/lib/validation';
import {
  Store,
  Product,
  Category,
  Brand,
  Order,
  StoreVisit,
  LedgerTransaction,
  FollowUp,
  NotificationItem,
  LocationEntry,
} from '@/types';

// Explicit column projection constants - no select('*') on application tables
export const STORE_COLUMNS =
  'id, name, owner_name, mobile, alternate_mobile, email, address, area, city, pincode, gps_lat, gps_lng, gst_number, store_type, assigned_salesperson_id, credit_limit, payment_terms, status, created_at, updated_at' as const;

export const PRODUCT_COLUMNS =
  'id, name, sku, barcode, image_url, brand_id, category_id, sub_category, description, pack_size, unit, mrp, selling_price, distributor_price, gst_percentage, min_order_qty, max_order_qty, stock_quantity, status, created_at, updated_at' as const;

export const CATEGORY_COLUMNS = 'id, name, description, status, created_at, updated_at' as const;

export const BRAND_COLUMNS = 'id, name, description, logo_url, status, created_at, updated_at' as const;

export const STORE_VISIT_COLUMNS =
  'id, store_id, salesperson_id, visit_date, check_in_time, check_out_time, notes, outcome, latitude, longitude, created_at' as const;

export const ORDER_COLUMNS =
  'id, order_number, store_id, salesperson_id, order_date, discount_amount, tax_amount, total_amount, notes, status, rejection_reason, confirmed_by, confirmed_at, created_at, updated_at' as const;

export const ORDER_ITEM_COLUMNS =
  'id, order_id, product_id, quantity, delivered_quantity, unit_price, total_price, created_at' as const;

export const LEDGER_COLUMNS =
  'id, store_id, transaction_date, transaction_type, debit, credit, running_balance, description, reference_type, created_at' as const;

export const FOLLOW_UP_COLUMNS =
  'id, store_id, salesperson_id, follow_up_date, reason, status, notes, created_at, updated_at' as const;

export const NOTIFICATION_COLUMNS =
  'id, user_id, title, message, type, reference_type, reference_id, is_read, created_at' as const;

export const LOCATION_COLUMNS =
  'id, salesperson_id, delivery_person_id, latitude, longitude, status, store_id, recorded_at' as const;

export const SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export const dataService = {
  // ========================================================
  // STORES
  // ========================================================
  async getStores(salespersonId?: string): Promise<Store[]> {
    try {
      let query = supabase
        .from('stores')
        .select(STORE_COLUMNS)
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
      .select(`${STORE_COLUMNS}, assigned_salesperson:sales_person_profiles(${SALES_PROFILE_COLUMNS})`)
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
      // Validate store details using shared zod schema
      const validation = storeFormSchema.safeParse(storeData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid store data provided.',
        };
      }

      const cleanMobile = validation.data.mobile;
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
            ...validation.data,
            status: 'active',
          },
        ])
        .select(STORE_COLUMNS)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update offline store cache
      const currentCache = await offlineStorage.getStores();
      await offlineStorage.saveStores([...currentCache, data as Store]);

      return { success: true, data: data as Store };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create store outlet.';
      return { success: false, error: message };
    }
  },

  // ========================================================
  // PRODUCTS & CATALOG
  // ========================================================
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`${PRODUCT_COLUMNS}, brand:brands(${BRAND_COLUMNS}), category:categories(${CATEGORY_COLUMNS})`)
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.warn('Products fetch error, using cache:', error);
        return await offlineStorage.getProducts();
      }

      const products = ((data || []) as unknown) as Product[];
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
      .select(`${PRODUCT_COLUMNS}, brand:brands(${BRAND_COLUMNS}), category:categories(${CATEGORY_COLUMNS})`)
      .eq('id', productId)
      .maybeSingle();

    if (error) return null;
    return data as Product | null;
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('status', 'active')
      .order('name');

    if (error) return [];
    return (data || []) as Category[];
  },

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select(BRAND_COLUMNS)
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
        .select(`${STORE_VISIT_COLUMNS}, store:stores(${STORE_COLUMNS})`)
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

  async getVisitById(visitId: string): Promise<StoreVisit | null> {
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .select(`${STORE_VISIT_COLUMNS}, store:stores(${STORE_COLUMNS})`)
        .eq('id', visitId)
        .maybeSingle();

      if (error) {
        console.warn('Visit fetch error:', error);
        return null;
      }
      return data as StoreVisit | null;
    } catch {
      return null;
    }
  },

  async getTodayVisits(salespersonId: string): Promise<StoreVisit[]> {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .select(`${STORE_VISIT_COLUMNS}, store:stores(${STORE_COLUMNS})`)
        .eq('salesperson_id', salespersonId)
        .eq('visit_date', today)
        .order('check_in_time', { ascending: false });

      if (error) return [];
      return ((data || []) as unknown) as StoreVisit[];
    } catch {
      return [];
    }
  },

  async getStoreVisits(storeId: string): Promise<StoreVisit[]> {
    const { data, error } = await supabase
      .from('store_visits')
      .select(STORE_VISIT_COLUMNS)
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
      const validation = visitFormSchema.safeParse({
        storeId,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid visit coordinates',
        };
      }

      // Check if active visit already exists
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
        .select(`${STORE_VISIT_COLUMNS}, store:stores(${STORE_COLUMNS})`)
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

      return { success: true, data: (data as unknown) as StoreVisit };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start store visit.';
      return { success: false, error: message };
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
        .select(`${STORE_VISIT_COLUMNS}, store:stores(${STORE_COLUMNS})`)
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

      return { success: true, data: (data as unknown) as StoreVisit };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to finish visit.';
      return { success: false, error: message };
    }
  },

  // ========================================================
  // ORDERS (Strict Admin Approval Workflow)
  // ========================================================
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
        console.warn('Orders fetch error:', error);
        return [];
      }
      return ((data || []) as unknown) as Order[];
    } catch (err) {
      console.warn('Orders fetch exception:', err);
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
        console.warn('getOrderById error:', error);
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
            (data as any).salesperson = sp;
          }
        } catch {
          // Non-critical if salesperson profile is not queryable
        }
      }

      return (data as unknown) as Order | null;
    } catch (err) {
      console.warn('getOrderById exception:', err);
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

  // ========================================================
  // CUSTOMER LEDGER TRANSACTIONS
  // ========================================================
  async getStoreLedger(storeId: string): Promise<LedgerTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select(LEDGER_COLUMNS)
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
    idempotencyKey?: string;
  }): Promise<{ success: boolean; data?: LedgerTransaction; error?: string }> {
    try {
      if (!params.amount || params.amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than zero.' };
      }

      const { data, error } = await supabase.rpc('record_payment', {
        p_store_id: params.storeId,
        p_amount: params.amount,
        p_payment_mode: params.paymentMode,
        p_reference_number: params.referenceNumber || null,
        p_notes: params.notes || null,
        p_idempotency_key: params.idempotencyKey || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as unknown as LedgerTransaction };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record payment.';
      return { success: false, error: message };
    }
  },

  // ========================================================
  // FOLLOW-UPS
  // ========================================================
  async getFollowUps(salespersonId: string): Promise<FollowUp[]> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`${FOLLOW_UP_COLUMNS}, store:stores(${STORE_COLUMNS})`)
        .eq('salesperson_id', salespersonId)
        .order('follow_up_date', { ascending: true });

      if (error) {
        console.warn('Follow-ups fetch error:', error);
        return [];
      }
      return ((data || []) as unknown) as FollowUp[];
    } catch {
      return [];
    }
  },

  async createFollowUp(
    followUp: Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: FollowUp; error?: string }> {
    try {
      const validation = followUpFormSchema.safeParse({
        storeId: followUp.store_id,
        followUpDate: followUp.follow_up_date,
        reason: followUp.reason,
        status: followUp.status,
        notes: followUp.notes || undefined,
      });

      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid follow-up details.',
        };
      }

      const { data, error } = await supabase
        .from('follow_ups')
        .insert([followUp])
        .select(`${FOLLOW_UP_COLUMNS}, store:stores(${STORE_COLUMNS})`)
        .single();

      if (error) throw error;
      return { success: true, data: (data as unknown) as FollowUp };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create follow-up reminder.';
      return { success: false, error: message };
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update follow-up.';
      return { success: false, error: message };
    }
  },

  // ========================================================
  // IN-APP NOTIFICATIONS
  // ========================================================
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
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
      await supabase.rpc('mark_all_notifications_read');
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
    return await locationService.recordLocationPing({
      salespersonId: entry.salespersonId,
      latitude: entry.latitude,
      longitude: entry.longitude,
      status: entry.status,
      storeId: entry.storeId,
    });
  },

  async getLatestSalespersonLocation(salespersonId: string): Promise<LocationEntry | null> {
    try {
      const { data, error } = await supabase
        .from('location_history')
        .select(LOCATION_COLUMNS)
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
        .select(LOCATION_COLUMNS)
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
