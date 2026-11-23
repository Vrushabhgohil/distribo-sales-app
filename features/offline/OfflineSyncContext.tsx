import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineStorage } from '@/lib/offline-storage';
import { OfflineQueueItem } from '@/types';
import { deliveryService } from '@/services/delivery-service';
import { config } from '@/lib/config';

interface OfflineSyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  queue: OfflineQueueItem[];
  triggerSync: () => Promise<void>;
  enqueueAction: (action: OfflineQueueItem['action'], payload: Record<string, any>) => Promise<void>;
}

const MAX_ATTEMPTS = 5;
const STUCK_TIMEOUT_MS = 60000; // 60 seconds

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const isSyncingRef = useRef<boolean>(false);

  const loadQueue = useCallback(async () => {
    const q = await offlineStorage.getOfflineQueue();
    setQueue(q);
  }, []);

  // Mutex-protected, resilient sync trigger
  const triggerSync = useCallback(async (): Promise<void> => {
    if (isSyncingRef.current) {
      return;
    }

    const currentQueue = await offlineStorage.getOfflineQueue();
    if (currentQueue.length === 0) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const now = Date.now();

      // 1. Recover stuck 'syncing' items (e.g. app killed during prior sync)
      for (const item of currentQueue) {
        if (item.status === 'syncing' && (!item.lastAttemptAt || now - item.lastAttemptAt > STUCK_TIMEOUT_MS)) {
          await offlineStorage.updateQueueItem(item.id, {
            status: 'pending',
            lastAttemptAt: undefined,
          });
          item.status = 'pending';
        }
      }

      // 2. Process pending items with exponential backoff
      for (const item of currentQueue) {
        // Skip items currently backing off
        if (item.nextRetryAt && now < item.nextRetryAt) {
          continue;
        }

        // Skip permanently failed items
        if (item.attempts >= MAX_ATTEMPTS) {
          if (item.status !== 'failed') {
            await offlineStorage.updateQueueItem(item.id, { status: 'failed' });
          }
          continue;
        }

        const currentAttempts = (item.attempts || 0) + 1;
        await offlineStorage.updateQueueItem(item.id, {
          status: 'syncing',
          attempts: currentAttempts,
          lastAttemptAt: Date.now(),
        });

        let success = false;
        let errorMessage: string | undefined;

        try {
          // Attach idempotency key to payload
          const payloadWithIdempotency = {
            ...item.payload,
            idempotencyKey: item.idempotencyKey,
          };

          if (item.action === 'CONFIRM_PICKUP') {
            const res = await deliveryService.confirmPickup(payloadWithIdempotency as any);
            success = res.success;
            if (!res.success) errorMessage = res.message;
          } else if (item.action === 'START_DELIVERY') {
            const res = await deliveryService.startDelivery(payloadWithIdempotency as any);
            success = res.success;
            if (!res.success) errorMessage = res.message;
          } else if (item.action === 'COMPLETE_DELIVERY' || item.action === 'RECORD_PARTIAL_DELIVERY') {
            const res = await deliveryService.completeDelivery(payloadWithIdempotency as any);
            success = res.success;
            if (!res.success) errorMessage = res.message;
          }

          // Check every result
          if (success) {
            await offlineStorage.removeFromOfflineQueue(item.id);
          } else {
            const backoffMs = Math.min(60000, 1000 * Math.pow(2, currentAttempts));
            await offlineStorage.updateQueueItem(item.id, {
              status: currentAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
              nextRetryAt: Date.now() + backoffMs,
              error: errorMessage || 'Sync failed',
            });
          }
        } catch (err: unknown) {
          const errText = err instanceof Error ? err.message : 'Unknown sync exception';
          const backoffMs = Math.min(60000, 1000 * Math.pow(2, currentAttempts));
          await offlineStorage.updateQueueItem(item.id, {
            status: currentAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            nextRetryAt: Date.now() + backoffMs,
            error: errText,
          });
        }
      }
    } finally {
      await loadQueue();
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [loadQueue]);

  useEffect(() => {
    loadQueue();

    // Event-driven network listener via NetInfo (no polling setInterval)
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      if (online) {
        // Optional quick health check using centralized config
        try {
          const res = await fetch(`${config.supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              apikey: config.supabaseAnonKey,
            },
          });
          if (res.status < 500) {
            triggerSync();
          }
        } catch {
          // If Supabase endpoint unreachable, wait for next network event
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadQueue, triggerSync]);

  const enqueueAction = async (
    action: OfflineQueueItem['action'],
    payload: Record<string, any>
  ): Promise<void> => {
    await offlineStorage.addToOfflineQueue({ action, payload });
    await loadQueue();
    if (isOnline) {
      triggerSync();
    }
  };

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount: queue.length,
        queue,
        triggerSync,
        enqueueAction,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = (): OfflineSyncContextType => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
