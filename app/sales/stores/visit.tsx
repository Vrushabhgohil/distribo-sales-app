import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Alert } from '@/components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import {
  CheckCircle2,
  Store as StoreIcon,
  Navigation,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/common/Header';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { StoreVisit } from '@/types';

const VISIT_OUTCOMES = [
  'Order booked',
  'Follow-up required',
  'No order',
  'Store closed',
  'Other',
];

export default function StoreVisitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { storeId, visitId } = useLocalSearchParams<{ storeId: string; visitId?: string }>();
  const { salesperson } = useAuth();

  const [activeVisit, setActiveVisit] = useState<StoreVisit | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState('Order booked');
  const [visitNotes, setVisitNotes] = useState('');
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const { data: store } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => dataService.getStoreById(storeId!),
    enabled: !!storeId,
  });

  // Check if there is an active visit
  useEffect(() => {
    if (!salesperson?.id) return;
    let isMounted = true;

    const loadVisit = async () => {
      // 1. Try finding an active visit for the salesperson
      const active = await dataService.getActiveVisit(salesperson.id);
      if (!isMounted) return;

      if (active) {
        if (!storeId || active.store_id === storeId) {
          setActiveVisit(active);
          const startTime = new Date(active.check_in_time).getTime();
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
          return;
        }
      }

      // 2. If visitId was explicitly provided in navigation params
      if (visitId) {
        const vById = await dataService.getVisitById(visitId);

        if (isMounted && vById) {
          setActiveVisit(vById);
          const startTime = new Date(vById.check_in_time).getTime();
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        }
      }
    };

    loadVisit();

    return () => {
      isMounted = false;
    };
  }, [salesperson?.id, storeId, visitId]);

  // Visit timer
  useEffect(() => {
    if (!activeVisit) return;
    const interval = setInterval(() => {
      const startTime = new Date(activeVisit.check_in_time).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeVisit]);

  const handleStartVisit = async () => {
    if (!storeId || !salesperson?.id) return;

    setStarting(true);
    let coords: { latitude: number; longitude: number } | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      }
    } catch (e) {
      console.warn('GPS location capture note:', e);
    }

    const res = await dataService.startVisit(storeId, salesperson.id, coords);
    setStarting(false);

    if (res.success && res.data) {
      setActiveVisit(res.data);
      queryClient.invalidateQueries({ queryKey: ['today-visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      queryClient.invalidateQueries({ queryKey: ['store-visits', storeId] });
      queryClient.invalidateQueries({ queryKey: ['store', storeId] });
    } else {
      Alert.alert('Visit Error', res.error || 'Failed to start visit.');
    }
  };

  const handleFinishVisit = async () => {
    if (finishing) return;

    if (!activeVisit) {
      Alert.alert('No Active Visit', 'Could not locate an active visit session to complete checkout.');
      return;
    }

    if (!selectedOutcome || !selectedOutcome.trim()) {
      Alert.alert('Outcome Required', 'Please select a visit outcome before completing checkout.');
      return;
    }

    setFinishing(true);
    let coords: { latitude: number; longitude: number } | undefined;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      }
    } catch {}

    const res = await dataService.finishVisit(
      activeVisit.id,
      selectedOutcome,
      visitNotes,
      coords
    );

    setFinishing(false);

    if (res.success) {
      const completedStoreId = activeVisit.store_id;

      // Invalidate relevant queries immediately
      queryClient.invalidateQueries({ queryKey: ['today-visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      if (completedStoreId) {
        queryClient.invalidateQueries({ queryKey: ['store-visits', completedStoreId] });
        queryClient.invalidateQueries({ queryKey: ['store', completedStoreId] });
      }
      queryClient.invalidateQueries({ queryKey: ['stores'] });

      Alert.alert(
        'Store Visit Completed',
        `Store visit completed successfully. Result: ${selectedOutcome}`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (completedStoreId) {
                router.replace(`/sales/stores/${completedStoreId}` as any);
              } else {
                router.replace('/sales/(tabs)/stores');
              }
            },
          },
        ]
      );

      // Web fallback navigation
      if (Platform.OS === 'web') {
        if (completedStoreId) {
          router.replace(`/sales/stores/${completedStoreId}` as any);
        } else {
          router.replace('/sales/(tabs)/stores');
        }
      }
    } else {
      Alert.alert('Checkout Failed', res.error || 'Failed to complete store visit. Please try again.');
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={activeVisit ? 'Beat Visit Active' : 'Store Check-In'}
        subtitle={store?.name || 'Retail Outlet'}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Store Target Card */}
        <View style={styles.card}>
          <View style={styles.storeRow}>
            <View style={styles.storeIconBox}>
              <StoreIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.storeName}>{store?.name || 'Retail Outlet'}</Text>
              <Text style={styles.storeOwner}>Owner: {store?.owner_name}</Text>
              <Text style={styles.storeAddr}>{store?.address}, {store?.area}</Text>
            </View>
          </View>
        </View>

        {/* State A: Ready to Start Visit */}
        {!activeVisit && (
          <View style={styles.card}>
            <View style={styles.readyIconBox}>
              <Navigation size={32} color={Colors.primary} />
            </View>
            <Text style={styles.readyTitle}>Check In to Store</Text>
            <Text style={styles.readyDesc}>
              Pressing Check-In captures your current GPS coordinates, updates the live Admin Dispatch Map, and records your visit duration.
            </Text>

            <Button
              title="GPS Check-In to Beat Store"
              variant="primary"
              size="xl"
              icon={<Navigation size={18} color={Colors.white} />}
              loading={starting}
              onPress={handleStartVisit}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {/* State B: Visit In Progress */}
        {activeVisit && (
          <>
            <View style={styles.timerCard}>
              <Text style={styles.timerOverline}>TIME AT STORE OUTLET</Text>
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
              <Text style={styles.timerStartedAt}>
                Checked in at {new Date(activeVisit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Quick Action: Book Order Right Here */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/sales/orders/create' as any,
                  params: { storeId: activeVisit.store_id },
                })
              }
              style={styles.orderPromptCard}
            >
              <View style={styles.orderPromptIcon}>
                <ShoppingBag size={20} color={Colors.white} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.orderPromptTitle}>Book Sales Order for this Store</Text>
                <Text style={styles.orderPromptSub}>Select wholesale items from catalogue</Text>
              </View>
            </TouchableOpacity>

            {/* Check-Out Audit Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Visit Outcome & Audit</Text>

              <Text style={styles.inputLabel}>Select Meeting Result</Text>
              <View style={styles.outcomeGrid}>
                {VISIT_OUTCOMES.map((outcome) => {
                  const isSel = selectedOutcome === outcome;
                  return (
                    <TouchableOpacity
                      key={outcome}
                      onPress={() => setSelectedOutcome(outcome)}
                      style={[styles.outcomeChip, isSel && styles.outcomeChipActive]}
                    >
                      <Text style={[styles.outcomeText, isSel && styles.outcomeTextActive]}>
                        {outcome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label="Store Notes & Shelf Observation (Optional)"
                placeholder="e.g. Stock sufficient, competitor promotions observed..."
                value={visitNotes}
                onChangeText={setVisitNotes}
                multiline
                numberOfLines={3}
              />

              <Button
                title="Complete Checkout"
                variant="primary"
                size="xl"
                icon={<CheckCircle2 size={18} color={Colors.white} />}
                loading={finishing}
                onPress={handleFinishVisit}
                style={{ marginTop: 8 }}
              />
            </View>
          </>
        )}
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
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconBox: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  storeOwner: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storeAddr: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  readyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  readyTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  readyDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  timerCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius['2xl'],
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    ...Shadows.md,
  },
  timerOverline: {
    ...Typography.captionSm,
    color: Colors.gold,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerText: {
    ...Typography.displayLg,
    fontSize: 40,
    color: Colors.white,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  timerStartedAt: {
    ...Typography.captionSm,
    color: Colors.warmIvory,
    opacity: 0.95,
    fontWeight: '500',
  },
  orderPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  orderPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderPromptTitle: {
    ...Typography.labelMd,
    color: Colors.primary,
  },
  orderPromptSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  inputLabel: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  outcomeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  outcomeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  outcomeText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  outcomeTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
});
