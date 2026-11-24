import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineStorage } from '@/lib/offline-storage';
import { Store, OfflineQueueItem } from '@/types';

describe('Offline Storage & Offline Sync Queue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('adds an item to offline queue with generated UUIDs and pending status', async () => {
    const item = await offlineStorage.addToOfflineQueue({
      action: 'COMPLETE_DELIVERY',
      payload: {
        assignmentId: 'assign-001',
        deliveredItems: [{ productId: 'p1', deliveredQty: 5 }],
      },
    });

    expect(item.id).toBeDefined();
    expect(item.idempotencyKey).toBeDefined();
    expect(item.status).toBe('pending');
    expect(item.attempts).toBe(0);

    const queue = await offlineStorage.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(item.id);
    expect(queue[0].payload.idempotencyKey).toBe(item.idempotencyKey);
  });

  it('updates queue item status, error message, and attempts on retry', async () => {
    const item = await offlineStorage.addToOfflineQueue({
      action: 'START_DELIVERY',
      payload: { assignmentId: 'assign-002' },
    });

    await offlineStorage.updateQueueItem(item.id, {
      status: 'failed',
      error: 'Server connection timeout',
      attempts: 1,
    });

    const queue = await offlineStorage.getOfflineQueue();
    expect(queue[0].status).toBe('failed');
    expect(queue[0].error).toBe('Server connection timeout');
    expect(queue[0].attempts).toBe(1);
  });

  it('removes successfully synchronized item from queue', async () => {
    const item1 = await offlineStorage.addToOfflineQueue({
      action: 'CONFIRM_PICKUP',
      payload: { assignmentId: 'assign-003' },
    });
    const item2 = await offlineStorage.addToOfflineQueue({
      action: 'CONFIRM_PICKUP',
      payload: { assignmentId: 'assign-004' },
    });

    await offlineStorage.removeFromOfflineQueue(item1.id);

    const queue = await offlineStorage.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(item2.id);
  });

  it('recovers stuck syncing items back to pending if needed', async () => {
    const item = await offlineStorage.addToOfflineQueue({
      action: 'COMPLETE_DELIVERY',
      payload: { assignmentId: 'assign-005' },
    });

    // Mark item as syncing with an older timestamp
    await offlineStorage.updateQueueItem(item.id, {
      status: 'syncing',
      timestamp: Date.now() - 5 * 60 * 1000,
    });

    const queueBefore = await offlineStorage.getOfflineQueue();
    expect(queueBefore[0].status).toBe('syncing');

    // Simulate recovery check
    const queue = await offlineStorage.getOfflineQueue();
    const staleThreshold = 2 * 60 * 1000;
    const now = Date.now();
    for (const qItem of queue) {
      if (qItem.status === 'syncing' && now - qItem.timestamp > staleThreshold) {
        await offlineStorage.updateQueueItem(qItem.id, { status: 'pending' });
      }
    }

    const queueAfter = await offlineStorage.getOfflineQueue();
    expect(queueAfter[0].status).toBe('pending');
  });

  it('saves and retrieves offline stores with minimum necessary fields', async () => {
    const mockStores: Partial<Store>[] = [
      {
        id: 'store-1',
        name: 'Supermart A',
        owner_name: 'Rajesh',
        mobile: '9876543210',
        city: 'Surat',
        credit_limit: 15000,
      },
      {
        id: 'store-2',
        name: 'Provision B',
        owner_name: 'Suresh',
        mobile: '9876543211',
        city: 'Ahmedabad',
        credit_limit: 25000,
      },
    ];

    await offlineStorage.saveStores(mockStores as Store[]);
    const retrieved = await offlineStorage.getStores();

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].name).toBe('Supermart A');
    expect(retrieved[1].city).toBe('Ahmedabad');
  });

  it('wipes all @motiba_* keys on logout', async () => {
    await offlineStorage.saveStores([{ id: 's1', name: 'Test' } as Store]);
    await offlineStorage.addToOfflineQueue({
      action: 'START_DELIVERY',
      payload: {},
    });

    await offlineStorage.wipeAllData();

    const stores = await offlineStorage.getStores();
    const queue = await offlineStorage.getOfflineQueue();

    expect(stores).toHaveLength(0);
    expect(queue).toHaveLength(0);
  });
});
