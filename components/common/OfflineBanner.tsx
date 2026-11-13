import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { offlineStorage } from '@/lib/offline-storage';

export const OfflineBanner: React.FC = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    offlineStorage.getLastSyncTime().then((time) => {
      if (time) {
        const d = new Date(time);
        setLastSync(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    });
  }, []);

  return null; // Can conditionally show if offline detected
};

export const SyncStatusBar: React.FC<{ isOffline?: boolean }> = ({ isOffline = false }) => {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    offlineStorage.getLastSyncTime().then((time) => {
      if (time) {
        const d = new Date(time);
        setLastSync(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    });
  }, []);

  if (!isOffline && !lastSync) return null;

  return (
    <View style={[styles.bar, isOffline ? styles.barOffline : styles.barOnline]}>
      {isOffline ? (
        <>
          <WifiOff size={13} color="#991B1B" />
          <Text style={[styles.text, { color: '#991B1B' }]}>
            Offline Mode: Orders & visits queued locally.
          </Text>
        </>
      ) : (
        <>
          <RefreshCw size={11} color={Colors.textSecondary} />
          <Text style={styles.text}>
            Synced with Supabase {lastSync ? `at ${lastSync}` : 'just now'}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  barOffline: {
    backgroundColor: '#FEE2E2',
  },
  barOnline: {
    backgroundColor: Colors.surfaceSecondary,
  },
  text: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
});

