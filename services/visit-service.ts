import { supabase } from '@/lib/supabase';
import { visitFormSchema } from '@/lib/validation';
import { locationService } from '@/services/location-service';
import { StoreVisit } from '@/types';
import { STORE_COLUMNS } from './store-service';
import { logger } from '@/lib/logger';

export const STORE_VISIT_COLUMNS =
  'id, store_id, salesperson_id, visit_date, check_in_time, check_out_time, notes, outcome, latitude, longitude, created_at' as const;

export const visitService = {
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
        logger.warn('Active visit check error:', error);
        return null;
      }
      return data as StoreVisit | null;
    } catch (err) {
      logger.warn('Active visit fetch exception:', err);
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
        logger.warn('Visit fetch error:', error);
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

      if (coords?.latitude && coords?.longitude) {
        await locationService.recordLocationPing({
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

      if (coords?.latitude && coords?.longitude && data?.salesperson_id) {
        await locationService.recordLocationPing({
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
};
