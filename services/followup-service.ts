import { supabase } from '@/lib/supabase';
import { followUpFormSchema } from '@/lib/validation';
import { FollowUp } from '@/types';
import { STORE_COLUMNS } from './store-service';
import { logger } from '@/lib/logger';

export const FOLLOW_UP_COLUMNS =
  'id, store_id, salesperson_id, follow_up_date, reason, status, notes, created_at, updated_at' as const;

export const followUpService = {
  async getFollowUps(salespersonId: string): Promise<FollowUp[]> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`${FOLLOW_UP_COLUMNS}, store:stores(${STORE_COLUMNS})`)
        .eq('salesperson_id', salespersonId)
        .order('follow_up_date', { ascending: true });

      if (error) {
        logger.warn('Follow-ups fetch error:', error);
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
};
