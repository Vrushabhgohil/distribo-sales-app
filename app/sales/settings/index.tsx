import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import { offlineStorage } from '@/lib/offline-storage';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Database,
  Radio,
  Smartphone,
  Trash2
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const { updateIntervalSec, batteryOptimized } = useLocationTracker();

  const [cachedStoreCount, setCachedStoreCount] = useState(0);
  const [cachedProductCount, setCachedProductCount] = useState(0);
  const [pendingLocationCount, setPendingLocationCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadCacheStats = async () => {
    const stores = await offlineStorage.getStores();
    const products = await offlineStorage.getProducts();
    const locs = await offlineStorage.getPendingLocations();
    const sync = await offlineStorage.getLastSyncTime();

    setCachedStoreCount(stores.length);
    setCachedProductCount(products.length);
    setPendingLocationCount(locs.length);
    setLastSyncTime(sync);
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Local Cache',
      'This will reset locally cached stores and catalogue items. Fresh data will reload on next beat navigation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await offlineStorage.saveStores([]);
            await offlineStorage.saveProducts([]);
            await loadCacheStats();
            Alert.alert('Cache Cleared', 'Local catalogue and store caches have been refreshed.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Settings & Storage"
        subtitle="Offline Cache & System Info"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Offline Cache & Sync Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.iconBox}>
              <Database size={18} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Offline Data & Local Cache</Text>
          </View>

          <Text style={styles.cardDesc}>
            Stores and products are cached locally so you can browse the beat and draft orders even with weak mobile data connectivity.
          </Text>

          <View style={styles.statList}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cached Retail Outlets:</Text>
              <Text style={styles.statValue}>{cachedStoreCount} outlets</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cached Product Catalogue:</Text>
              <Text style={styles.statValue}>{cachedProductCount} SKUs</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Queued Offline Telemetry:</Text>
              <Text style={styles.statValue}>{pendingLocationCount} pings</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last Cloud Sync:</Text>
              <Text style={styles.statValue}>
                {lastSyncTime
                  ? new Date(lastSyncTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short',
                  })
                  : 'Never'}
              </Text>
            </View>
          </View>

          <Button
            title="Reset Local Cache"
            variant="outline"
            size="sm"
            icon={<Trash2 size={14} color={Colors.error} />}
            textStyle={{ color: Colors.error }}
            onPress={handleClearCache}
            style={{ marginTop: 14 }}
          />
        </View>

        {/* GPS Telemetry Summary */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.secondaryLight }]}>
              <Radio size={18} color={Colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Active Telemetry Profile</Text>
          </View>

          <View style={styles.statList}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Transmission Interval:</Text>
              <Text style={styles.statValue}>{updateIntervalSec} seconds</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Battery Optimization:</Text>
              <Text style={styles.statValue}>{batteryOptimized ? 'Balanced' : 'High Accuracy'}</Text>
            </View>
          </View>
        </View>

        {/* Enterprise & Version Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
              <Smartphone size={18} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>System Diagnostics</Text>
          </View>

          <View style={styles.statList}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Enterprise Account:</Text>
              <Text style={styles.statValue}>Motiba</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>App Framework:</Text>
              <Text style={styles.statValue}>Motiba Sales v1.0.0</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cloud Backend:</Text>
              <Text style={styles.statValue}>Supabase Realtime Cloud</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  cardDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  statList: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  statValue: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
