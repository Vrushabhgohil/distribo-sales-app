import { supabase } from '@/lib/supabase';
import { SalesPersonProfile, DeliveryPersonProfile } from '@/types';
import { logger } from '@/lib/logger';

export const SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export const DELIVERY_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, vehicle_type, vehicle_number, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export type AuthProfileResult =
  | { role: 'sales_person'; profile: SalesPersonProfile }
  | { role: 'delivery_person'; profile: DeliveryPersonProfile }
  | null;

export const authService = {
  /**
   * Fetches user profile strictly by auth user_id with explicit columns.
   */
  async fetchProfileByUserId(userId: string): Promise<AuthProfileResult> {
    try {
      const { data: salesProfile, error: salesError } = await supabase
        .from('sales_person_profiles')
        .select(SALES_PROFILE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

      if (salesError) {
        logger.warn('Error loading sales profile by user_id:', salesError);
      }

      if (salesProfile) {
        return {
          role: 'sales_person',
          profile: salesProfile as unknown as SalesPersonProfile,
        };
      }

      const { data: deliveryProfile, error: deliveryError } = await supabase
        .from('delivery_person_profiles')
        .select(DELIVERY_PROFILE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

      if (deliveryError) {
        logger.warn('Error loading delivery profile by user_id:', deliveryError);
      }

      if (deliveryProfile) {
        return {
          role: 'delivery_person',
          profile: deliveryProfile as unknown as DeliveryPersonProfile,
        };
      }

      return null;
    } catch (err) {
      logger.warn('fetchProfileByUserId exception:', err);
      return null;
    }
  },

  /**
   * Resolves email from employee_id or email via secure RPC (no enumeration).
   */
  async resolveLoginIdentifier(identifier: string): Promise<string> {
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return clean.toLowerCase();
    }
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc('resolve_login_identifier', {
      p_identifier: clean,
    });
    if (rpcError || !resolvedEmail) {
      throw new Error('Invalid login credentials. Please check your credentials.');
    }
    return String(resolvedEmail).toLowerCase().trim();
  },
};
