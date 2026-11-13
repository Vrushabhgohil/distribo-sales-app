import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Store, CartItem } from '@/types';

const KEYS = {
  STORES_CACHE: '@distribo_stores_cache',
  PRODUCTS_CACHE: '@distribo_products_cache',
  ORDER_DRAFTS: '@distribo_order_drafts',
  LAST_SYNC_TIME: '@distribo_last_sync_time',
  PENDING_LOCATIONS: '@distribo_pending_locations',
};

export interface LocalOrderDraft {
  id: string;
  storeId: string;
  storeName: string;
  items: CartItem[];
  notes?: string;
  createdAt: string;
  totalAmount: number;
}

export const offlineStorage = {
  async saveStores(stores: Store[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.STORES_CACHE, JSON.stringify(stores));
      await AsyncStorage.setItem(KEYS.LAST_SYNC_TIME, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to cache stores:', e);
    }
  },

  async getStores(): Promise<Store[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.STORES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveProducts(products: Product[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.PRODUCTS_CACHE, JSON.stringify(products));
      await AsyncStorage.setItem(KEYS.LAST_SYNC_TIME, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to cache products:', e);
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PRODUCTS_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_SYNC_TIME);
    } catch {
      return null;
    }
  },

  async saveOrderDraft(draft: LocalOrderDraft): Promise<void> {
    try {
      const existing = await this.getOrderDrafts();
      const updated = [draft, ...existing.filter((d) => d.id !== draft.id)];
      await AsyncStorage.setItem(KEYS.ORDER_DRAFTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save order draft:', e);
    }
  },

  async getOrderDrafts(): Promise<LocalOrderDraft[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ORDER_DRAFTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async removeOrderDraft(draftId: string): Promise<void> {
    try {
      const existing = await this.getOrderDrafts();
      const filtered = existing.filter((d) => d.id !== draftId);
      await AsyncStorage.setItem(KEYS.ORDER_DRAFTS, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to remove draft:', e);
    }
  },

  async queuePendingLocation(location: {
    salesperson_id: string;
    latitude: number;
    longitude: number;
    status: string;
    store_id?: string | null;
    recorded_at: string;
  }): Promise<void> {
    try {
      const current = await this.getPendingLocations();
      // Keep last 100 max
      const updated = [...current.slice(-99), location];
      await AsyncStorage.setItem(KEYS.PENDING_LOCATIONS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to queue pending location:', e);
    }
  },

  async getPendingLocations(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_LOCATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async clearPendingLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.PENDING_LOCATIONS);
    } catch (e) {
      console.warn('Failed to clear pending locations:', e);
    }
  },
};

