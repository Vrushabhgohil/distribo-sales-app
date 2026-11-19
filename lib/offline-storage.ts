import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Store, CartItem, DeliveryAssignment, Order, OfflineQueueItem } from '@/types';

const KEYS = {
  STORES_CACHE: '@motiba_stores_cache',
  PRODUCTS_CACHE: '@motiba_products_cache',
  ORDER_DRAFTS: '@motiba_order_drafts',
  LAST_SYNC_TIME: '@motiba_last_sync_time',
  PENDING_LOCATIONS: '@motiba_pending_locations',
  DELIVERIES: '@motiba_cached_deliveries',
  ORDERS: '@motiba_cached_orders',
  OFFLINE_QUEUE: '@motiba_delivery_offline_queue',
  PROFILE: '@motiba_delivery_profile',
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
  // --- SALES CACHE ---
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
    salesperson_id?: string;
    delivery_person_id?: string;
    latitude: number;
    longitude: number;
    status: string;
    store_id?: string | null;
    recorded_at: string;
  }): Promise<void> {
    try {
      const current = await this.getPendingLocations();
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

  // --- DELIVERY CACHE ---
  async saveDeliveries(deliveries: DeliveryAssignment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
    } catch (err) {
      console.warn('Error saving deliveries to offline cache:', err);
    }
  },

  async getDeliveries(): Promise<DeliveryAssignment[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.DELIVERIES);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Error reading deliveries from offline cache:', err);
      return [];
    }
  },

  async saveOrder(order: Order): Promise<void> {
    try {
      const allOrders = await this.getAllCachedOrders();
      const filtered = allOrders.filter((o) => o.id !== order.id);
      filtered.push(order);
      await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error caching order:', err);
    }
  },

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const all = await this.getAllCachedOrders();
      return all.find((o) => o.id === orderId) || null;
    } catch {
      return null;
    }
  },

  async getAllCachedOrders(): Promise<Order[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // --- DELIVERY OFFLINE QUEUE MANAGEMENT ---
  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'status'>): Promise<OfflineQueueItem> {
    const queue = await this.getOfflineQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      status: 'pending',
    };
    queue.push(newItem);
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    return newItem;
  },

  async removeFromOfflineQueue(id: string): Promise<void> {
    const queue = await this.getOfflineQueue();
    const updated = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
  },

  async updateQueueItemStatus(id: string, status: 'pending' | 'syncing' | 'failed', error?: string): Promise<void> {
    const queue = await this.getOfflineQueue();
    const index = queue.findIndex((item) => item.id === id);
    if (index >= 0) {
      queue[index].status = status;
      if (error) queue[index].error = error;
      await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    }
  },

  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.OFFLINE_QUEUE);
  },
};
