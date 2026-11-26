import { Header } from '@/components/common/Header';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { SalesMap } from '@/components/map/SalesMap';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StoreDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { salesperson } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: store,
    isLoading: loadingStore,
    refetch: refetchStore,
  } = useQuery({
    queryKey: ['store', id],
    queryFn: () => dataService.getStoreById(id!),
    enabled: !!id,
  });

  const {
    data: activeVisit,
    refetch: refetchActiveVisit,
  } = useQuery({
    queryKey: ['active-visit', salesperson?.id],
    queryFn: () => dataService.getActiveVisit(salesperson?.id || ''),
    enabled: !!salesperson?.id,
  });

  const {
    data: visits = [],
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ['store-visits', id],
    queryFn: () => dataService.getStoreVisits(id!),
    enabled: !!id,
  });

  const {
    data: ledger = [],
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ['store-ledger', id],
    queryFn: () => dataService.getStoreLedger(id!),
    enabled: !!id,
  });

  const {
    data: allOrders = [],
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', salesperson?.id],
    queryFn: () => dataService.getOrders(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const storeOrders = allOrders.filter((o) => o.store_id === id);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStore(), refetchVisits(), refetchLedger(), refetchActiveVisit(), refetchOrders()]);
    setRefreshing(false);
  };

  const callStore = () => {
    if (store?.mobile) {
      const sanitized = encodeURIComponent(store.mobile.trim().replace(/[^\d+]/g, ''));
      Linking.openURL(`tel:${sanitized}`);
    }
  };

  const openStoreLocation = async () => {
    if (!store) return;

    const hasCoords =
      typeof store.gps_lat === 'number' &&
      typeof store.gps_lng === 'number' &&
      !Number.isNaN(store.gps_lat) &&
      !Number.isNaN(store.gps_lng) &&
      (store.gps_lat !== 0 || store.gps_lng !== 0);

    const addressQuery = [store.address, store.area, store.city, store.pincode]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');

    if (!hasCoords && !addressQuery) {
      Alert.alert(
        'Location Unavailable',
        'No GPS coordinates or address information is available for this store.'
      );
      return;
    }

    const query = hasCoords
      ? `${store.gps_lat},${store.gps_lng}`
      : encodeURIComponent(addressQuery);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      } else {
        const supported = await Linking.canOpenURL(mapsUrl);
        if (supported) {
          await Linking.openURL(mapsUrl);
        } else {
          Alert.alert('Unable to Open Maps', 'Google Maps could not be opened on this device.');
        }
      }
    } catch {
      Alert.alert('Unable to Open Maps', 'An error occurred while opening Google Maps.');
    }
  };

  const currentOutstanding =
    ledger.length > 0 ? ledger[0].running_balance : 0;
  const availableCredit = Math.max(0, (store?.credit_limit || 0) - currentOutstanding);

  if (loadingStore || !store) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Store Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContainer}>
          <MotibaLoader size="large" message="Loading store profile..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={store.name}
        subtitle={`${store.store_type || 'Retail'} • ${store.area}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openStoreLocation}
              style={styles.headerLocationBtn}
              accessibilityLabel="Open store location in Google Maps"
            >
              <MapPin size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={callStore}
              style={styles.headerPhoneBtn}
              accessibilityLabel="Call store"
            >
              <Phone size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Active Store Visit in Progress Banner */}
        {activeVisit && activeVisit.store_id === store.id && (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerLeft}>
              <View style={styles.activeDot} />
              <View>
                <Text style={styles.activeBannerTitle}>Store Visit In Progress</Text>
                <Text style={styles.activeBannerSub}>
                  Checked in at {new Date(activeVisit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/sales/stores/visit' as any,
                  params: { storeId: store.id, visitId: activeVisit.id },
                })
              }
              style={styles.activeBannerBtn}
            >
              <CheckCircle2 size={14} color={Colors.white} />
              <Text style={styles.activeBannerBtnText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Action Bar */}
        <View style={styles.quickBar}>
          <Button
            title={activeVisit && activeVisit.store_id === store.id ? 'Complete Checkout' : 'Start Beat Visit'}
            variant="primary"
            size="md"
            icon={
              activeVisit && activeVisit.store_id === store.id ? (
                <CheckCircle2 size={16} color={Colors.white} />
              ) : (
                <Navigation size={16} color={Colors.white} />
              )
            }
            onPress={() =>
              router.push({
                pathname: '/sales/stores/visit' as any,
                params: {
                  storeId: store.id,
                  ...(activeVisit?.store_id === store.id ? { visitId: activeVisit.id } : {}),
                },
              })
            }
            style={{ flex: 1, marginRight: 8 }}
          />

          <Button
            title="Book Order"
            variant="secondary"
            size="md"
            icon={<ShoppingBag size={16} color={Colors.primary} />}
            onPress={() =>
              router.push({
                pathname: '/sales/orders/create' as any,
                params: { storeId: store.id },
              })
            }
            style={{ flex: 1 }}
          />
        </View>

        {/* Store Profile Card */}
        <View style={styles.card}>
          <View style={styles.storeHeaderRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.ownerText}>Owner / Contact: {store.owner_name}</Text>
            </View>
            <StatusBadge status={store.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoCol}>
            <TouchableOpacity activeOpacity={0.7} onPress={callStore} style={styles.infoRow}>
              <Phone size={15} color={Colors.primary} />
              <Text style={[styles.infoText, { color: Colors.primary, fontWeight: '700' }]}>
                {store.mobile}
              </Text>
            </TouchableOpacity>

            {store.email && (
              <View style={styles.infoRow}>
                <Mail size={15} color={Colors.textTertiary} />
                <Text style={styles.infoText}>{store.email}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MapPin size={15} color={Colors.textTertiary} />
              <Text style={styles.infoText}>
                {store.address}, {store.area}, {store.city} - {store.pincode}
              </Text>
            </View>

            {store.gst_number && (
              <View style={styles.infoRow}>
                <ShieldCheck size={15} color={Colors.textTertiary} />
                <Text style={styles.infoText}>GSTIN: {store.gst_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Credit & Outstanding Balance Card */}
        <View style={styles.card}>
          <View style={styles.balanceHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>CURRENT OUTSTANDING</Text>
              <Text style={styles.balanceAmount}>
                ₹{currentOutstanding.toLocaleString('en-IN')}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/sales/ledger/${store.id}` as any)}
              style={styles.ledgerBtn}
            >
              <BookOpen size={14} color={Colors.primary} />
              <Text style={styles.ledgerBtnText}>View Ledger</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.creditMetaRow}>
            <View>
              <Text style={styles.metaLabel}>Credit Limit</Text>
              <Text style={styles.metaValue}>₹{(store.credit_limit || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Available Credit</Text>
              <Text style={[styles.metaValue, { color: Colors.secondary }]}>
                ₹{availableCredit.toLocaleString('en-IN')}
              </Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Payment Terms</Text>
              <Text style={styles.metaValue}>{store.payment_terms || 'Net 30 Days'}</Text>
            </View>
          </View>
        </View>

        {/* Previous Orders & Reorder Section */}
        <View style={styles.card}>
          <View style={styles.visitTitleRow}>
            <Text style={styles.sectionHeading}>Previous Orders & Purchase History</Text>
            <Text style={styles.visitCount}>{storeOrders.length} orders</Text>
          </View>

          {storeOrders.length === 0 ? (
            <Text style={styles.emptyText}>No previous orders recorded for this store.</Text>
          ) : (
            storeOrders.slice(0, 5).map((ord) => (
              <TouchableOpacity
                key={ord.id}
                activeOpacity={0.75}
                onPress={() => router.push(`/sales/orders/${ord.id}` as any)}
                style={styles.visitItem}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.visitDate}>{ord.order_number}</Text>
                    <StatusBadge status={ord.status} />
                  </View>
                  <Text style={styles.visitTimes}>
                    {new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    • {ord.items?.length || 0} items • ₹{(ord.total_amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: '/sales/orders/reorder' as any,
                      params: { orderId: ord.id },
                    })
                  }
                  style={styles.ledgerBtn}
                >
                  <Text style={styles.ledgerBtnText}>Reorder</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Store GPS Geofence Map */}
        {store.gps_lat && store.gps_lng && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Store GPS Coordinates</Text>
            <View style={styles.mapContainer}>
              <SalesMap
                latitude={store.gps_lat}
                longitude={store.gps_lng}
                markers={[
                  {
                    latitude: store.gps_lat,
                    longitude: store.gps_lng,
                    title: store.name,
                    description: store.address,
                  },
                ]}
                height={160}
              />
            </View>
          </View>
        )}

        {/* Recent Beat Visits Timeline */}
        <View style={styles.card}>
          <View style={styles.visitTitleRow}>
            <Text style={styles.sectionHeading}>Recent Beat Visits</Text>
            <Text style={styles.visitCount}>{visits.length} recorded</Text>
          </View>

          {visits.length === 0 ? (
            <Text style={styles.emptyText}>No visits recorded yet for this outlet.</Text>
          ) : (
            visits.slice(0, 5).map((visit) => (
              <View key={visit.id} style={styles.visitItem}>
                <View style={styles.visitBullet}>
                  <CheckCircle2 size={14} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.visitDate}>
                    {new Date(visit.visit_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.visitTimes}>
                    In:{' '}
                    {new Date(visit.check_in_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {visit.check_out_time &&
                      ` • Out: ${new Date(visit.check_out_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </Text>
                  {visit.outcome && (
                    <Text style={styles.visitOutcome}>Outcome: {visit.outcome}</Text>
                  )}
                  {visit.notes && <Text style={styles.visitNotes}>{`"${visit.notes}"`}</Text>}
                </View>
              </View>
            ))
          )}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLocationBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  headerPhoneBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.secondaryTint,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 12,
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
  },
  activeBannerTitle: {
    ...Typography.labelSm,
    color: Colors.secondary,
    fontWeight: '800',
  },
  activeBannerSub: {
    ...Typography.captionSm,
    color: Colors.secondaryDark,
    marginTop: 1,
  },
  activeBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  activeBannerBtnText: {
    ...Typography.captionSm,
    color: Colors.white,
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    marginBottom: 14,
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
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  storeName: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  ownerText: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  infoCol: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubTitle: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  ledgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  ledgerBtnText: {
    ...Typography.buttonSm,
    color: Colors.primary,
  },
  creditMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  metaValue: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  mapContainer: {
    marginTop: 10,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  visitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  visitCount: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  emptyText: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  visitBullet: {
    marginTop: 2,
  },
  visitDate: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  visitTimes: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  visitOutcome: {
    ...Typography.captionSm,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  visitNotes: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
