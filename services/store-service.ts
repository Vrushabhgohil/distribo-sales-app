import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import { storeFormSchema } from '@/lib/validation';
import { Store } from '@/types';
import { logger } from '@/lib/logger';

export const STORE_COLUMNS =
  'id, name, owner_name, mobile, alternate_mobile, email, address, area, city, pincode, gps_lat, gps_lng, gst_number, store_type, assigned_salesperson_id, credit_limit, payment_terms, status, created_at, updated_at' as const;

export const SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export const storeService = {
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
        logger.warn('Stores fetch error, using cache:', error);
        return await offlineStorage.getStores();
      }

      const stores = (data || []) as Store[];
      await offlineStorage.saveStores(stores);
      return stores;
    } catch (err) {
      logger.warn('Network exception loading stores, using offline cache:', err);
      return await offlineStorage.getStores();
    }
  },

  async getStoreById(storeId: string): Promise<Store | null> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`${STORE_COLUMNS}, assigned_salesperson:sales_person_profiles(${SALES_PROFILE_COLUMNS})`)
        .eq('id', storeId)
        .maybeSingle();

      if (error) {
        logger.warn('Get store error:', error);
        const cached = await offlineStorage.getStores();
        return cached.find((s) => s.id === storeId) || null;
      }
      return data as Store | null;
    } catch {
      const cached = await offlineStorage.getStores();
      return cached.find((s) => s.id === storeId) || null;
    }
  },

  async createStore(
    storeData: Omit<Store, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: Store; error?: string }> {
    try {
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

      const currentCache = await offlineStorage.getStores();
      await offlineStorage.saveStores([...currentCache, data as Store]);

      return { success: true, data: data as Store };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create store outlet.';
      return { success: false, error: message };
    }
  },
};
