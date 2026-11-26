import { supabase } from '@/lib/supabase';
import { SalesPersonProfile, DeliveryPersonProfile } from '@/types';
import { logger } from '@/lib/logger';

export const BASE_SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, created_at, updated_at' as const;

export const BASE_DELIVERY_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, vehicle_type, vehicle_number, status, created_at, updated_at' as const;

export const SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export const DELIVERY_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, vehicle_type, vehicle_number, status, location_consent_version, location_consent_at, created_at, updated_at' as const;

export type AuthProfileResult =
  | { role: 'sales_person'; profile: SalesPersonProfile }
  | { role: 'delivery_person'; profile: DeliveryPersonProfile }
  | null;

/**
 * Resilient profile fetcher: queries extended columns first, but gracefully falls
 * back to base columns if optional/newer columns (e.g. location_consent_version)
 * are not yet provisioned in the database (PostgreSQL 42703).
 */
async function fetchProfileRecord(
  table: 'sales_person_profiles' | 'delivery_person_profiles',
  filterField: 'user_id' | 'email',
  filterValue: string
): Promise<any | null> {
  const isSales = table === 'sales_person_profiles';
  const extended = isSales ? SALES_PROFILE_COLUMNS : DELIVERY_PROFILE_COLUMNS;
  const base = isSales ? BASE_SALES_PROFILE_COLUMNS : BASE_DELIVERY_PROFILE_COLUMNS;

  try {
    let query = supabase.from(table).select(extended);
    query = filterField === 'user_id' ? query.eq('user_id', filterValue) : query.ilike('email', filterValue);
    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return data;
    }

    // Handle column-not-found error (42703) by retrying with base columns
    if (error && (error.code === '42703' || String(error.message).includes('location_consent'))) {
      let baseQuery = supabase.from(table).select(base);
      baseQuery = filterField === 'user_id' ? baseQuery.eq('user_id', filterValue) : baseQuery.ilike('email', filterValue);
      const { data: baseData, error: baseErr } = await baseQuery.maybeSingle();

      if (!baseErr && baseData) {
        return baseData;
      }
    }

    return null;
  } catch (err) {
    logger.warn(`Exception querying ${table} by ${filterField}:`, err);
    return null;
  }
}

export const authService = {
  /**
   * Fetches user profile by auth user_id or email, automatically linking
   * user_id when an admin-created profile exists with matching email.
   */
  async fetchProfile(userId: string, email?: string): Promise<AuthProfileResult> {
    try {
      // 1. Try finding sales person by user_id
      const salesProfile = await fetchProfileRecord('sales_person_profiles', 'user_id', userId);
      if (salesProfile) {
        return {
          role: 'sales_person',
          profile: salesProfile as unknown as SalesPersonProfile,
        };
      }

      // 2. Try finding delivery person by user_id
      const deliveryProfile = await fetchProfileRecord('delivery_person_profiles', 'user_id', userId);
      if (deliveryProfile) {
        return {
          role: 'delivery_person',
          profile: deliveryProfile as unknown as DeliveryPersonProfile,
        };
      }

      // 3. Fallback: If not found by user_id and email is available, find by email and link user_id
      if (email) {
        const cleanEmail = email.trim().toLowerCase();

        const salesByEmail = await fetchProfileRecord('sales_person_profiles', 'email', cleanEmail);
        if (salesByEmail) {
          if (!salesByEmail.user_id || salesByEmail.user_id !== userId) {
            await supabase
              .from('sales_person_profiles')
              .update({ user_id: userId })
              .eq('id', salesByEmail.id);
          }
          return {
            role: 'sales_person',
            profile: { ...salesByEmail, user_id: userId } as unknown as SalesPersonProfile,
          };
        }

        const deliveryByEmail = await fetchProfileRecord('delivery_person_profiles', 'email', cleanEmail);
        if (deliveryByEmail) {
          if (!deliveryByEmail.user_id || deliveryByEmail.user_id !== userId) {
            await supabase
              .from('delivery_person_profiles')
              .update({ user_id: userId })
              .eq('id', deliveryByEmail.id);
          }
          return {
            role: 'delivery_person',
            profile: { ...deliveryByEmail, user_id: userId } as unknown as DeliveryPersonProfile,
          };
        }
      }

      return null;
    } catch (err) {
      logger.warn('fetchProfile exception:', err);
      return null;
    }
  },

  /**
   * Compatibility wrapper for fetchProfileByUserId.
   */
  async fetchProfileByUserId(userId: string): Promise<AuthProfileResult> {
    return this.fetchProfile(userId);
  },

  /**
   * Resolves email from employee_id or email via secure RPC with fallback.
   */
  async resolveLoginIdentifier(identifier: string): Promise<string> {
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return clean.toLowerCase();
    }

    // Try secure RPC first
    try {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('resolve_login_identifier', {
        p_identifier: clean,
      });

      if (!rpcError && resolvedEmail) {
        return String(resolvedEmail).toLowerCase().trim();
      }
    } catch (rpcErr) {
      logger.warn('resolve_login_identifier RPC call note:', rpcErr);
    }

    // Fallback: direct lookup by employee_id in profile tables
    try {
      const { data: salesUser } = await supabase
        .from('sales_person_profiles')
        .select('email')
        .ilike('employee_id', clean)
        .maybeSingle();

      if (salesUser?.email) {
        return salesUser.email.toLowerCase().trim();
      }

      const { data: delUser } = await supabase
        .from('delivery_person_profiles')
        .select('email')
        .ilike('employee_id', clean)
        .maybeSingle();

      if (delUser?.email) {
        return delUser.email.toLowerCase().trim();
      }
    } catch (fallbackErr) {
      logger.warn('Employee ID fallback lookup exception:', fallbackErr);
    }

    throw new Error('Invalid login credentials. Please check your credentials.');
  },

  /**
   * Syncs legacy/admin-provisioned database credentials to Supabase Auth if needed.
   */
  async syncLegacyCredentials(identifier: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('sync_legacy_user_credentials', {
        p_identifier: identifier.trim(),
        p_password: password,
      });

      if (error || !data) {
        return false;
      }
      return Boolean(data.success);
    } catch (err) {
      logger.warn('syncLegacyCredentials exception:', err);
      return false;
    }
  },
};
