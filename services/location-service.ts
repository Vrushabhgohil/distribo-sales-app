import * as Location from 'expo-location';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import { LocationEntry } from '@/types';

export const LOCATION_COLUMNS =
  'id, salesperson_id, delivery_person_id, latitude, longitude, status, store_id, recorded_at' as const;

export const CURRENT_CONSENT_VERSION = '2026.1-DPDP';

export interface LocationPingParams {
  salespersonId?: string | null;
  deliveryPersonId?: string | null;
  latitude: number;
  longitude: number;
  status?: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
  storeId?: string | null;
  recordedAt?: string;
}

export const locationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      return fgStatus === 'granted';
    } catch (err) {
      console.warn('Location permission request error:', err);
      return false;
    }
  },

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    } catch (err) {
      console.warn('Error fetching device GPS location:', err);
      return null;
    }
  },

  /**
   * Unified telemetry ping function for both sales_person and delivery_person.
   * Enforces 24-hour cutoff (drops pings older than 24h), includes delivery_person_id,
   * handles offline queuing, and flushes pending offline pings safely.
   */
  async recordLocationPing(params: LocationPingParams): Promise<LocationEntry | null> {
    const recordedAt = params.recordedAt || new Date().toISOString();
    const recordedTime = new Date(recordedAt).getTime();
    const now = Date.now();

    // Data minimization: Drop telemetry older than 24 hours
    if (now - recordedTime > 24 * 60 * 60 * 1000) {
      console.info('Dropped stale location ping older than 24 hours:', recordedAt);
      return null;
    }

    const payload = {
      salesperson_id: params.salespersonId || null,
      delivery_person_id: params.deliveryPersonId || null,
      latitude: params.latitude,
      longitude: params.longitude,
      status: params.status || 'online',
      store_id: params.storeId || null,
      recorded_at: recordedAt,
    };

    if (!isSupabaseConfigured) {
      await offlineStorage.queuePendingLocation(payload);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('location_history')
        .insert([payload])
        .select(LOCATION_COLUMNS)
        .single();

      if (error) {
        console.warn('Direct location ping failed, queuing offline:', error);
        await offlineStorage.queuePendingLocation(payload);
        return null;
      }

      // Flush queued offline locations, dropping any older than 24h
      const queued = await offlineStorage.getPendingLocations();
      if (queued.length > 0) {
        try {
          const freshQueued = queued.filter((q: { recorded_at: string }) => {
            const time = new Date(q.recorded_at).getTime();
            return now - time <= 24 * 60 * 60 * 1000;
          });

          if (freshQueued.length > 0) {
            await supabase.from('location_history').insert(freshQueued);
          }
          await offlineStorage.clearPendingLocations();
        } catch (flushErr) {
          console.warn('Flush offline locations notice:', flushErr);
        }
      }

      return data as LocationEntry;
    } catch (networkErr) {
      console.warn('Network error recording location, saving offline:', networkErr);
      await offlineStorage.queuePendingLocation(payload);
      return null;
    }
  },

  /**
   * Backward-compatible alias for delivery telemetry pings.
   */
  async recordDeliveryLocationPing(params: {
    deliveryPersonId: string;
    latitude: number;
    longitude: number;
    status: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
    storeId?: string;
  }): Promise<void> {
    await this.recordLocationPing({
      deliveryPersonId: params.deliveryPersonId,
      latitude: params.latitude,
      longitude: params.longitude,
      status: params.status,
      storeId: params.storeId,
    });
  },

  /**
   * Store user location consent server-side (DPDP Act 2023).
   */
  async recordConsent(consentVersion = CURRENT_CONSENT_VERSION): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('record_location_consent', {
        p_consent_version: consentVersion,
      });

      if (error) {
        console.warn('Failed to record location consent server-side:', error);
        return false;
      }
      return Boolean(data);
    } catch (err) {
      console.warn('Consent recording exception:', err);
      return false;
    }
  },

  /**
   * Retention purge trigger: permanently removes telemetry older than 90 days.
   */
  async purgeExpiredLocations(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('purge_expired_location_history');
      if (error) {
        console.warn('Failed to purge expired location history:', error);
        return 0;
      }
      return Number(data || 0);
    } catch {
      return 0;
    }
  },
};
