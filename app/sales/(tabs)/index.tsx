import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Navigation,
  ShoppingBag,
  Store as StoreIcon,
  Clock,
  CheckCircle2,
  CalendarClock,
  PlusCircle,
  TrendingUp,
  MapPin,
  ChevronRight,
  Radio,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  UserCheck,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import { dataService } from '@/services/data-service';

export default function HomeScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const { isTracking, permissionDenied, openAppSettings, trackingStatus, currentCoords } = useLocationTracker();
  const [refreshing, setRefreshing] = useState(false);

  // Queries for live Supabase data
  const {
    data: stores = [],
    refetch: refetchStores,
  } = useQuery({
    queryKey: ['stores', salesperson?.id],
    queryFn: () => dataService.getStores(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', salesperson?.id],
    queryFn: () => dataService.getOrders(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const {
    data: todayVisits = [],
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ['today-visits', salesperson?.id],
    queryFn: () => dataService.getTodayVisits(salesperson?.id || ''),
    enabled: !!salesperson?.id,
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
    data: notifications = [],
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dataService.getNotifications(),
  });

  const {
    data: followUps = [],
    refetch: refetchFollowUps,
  } = useQuery({
    queryKey: ['follow-ups', salesperson?.id],
    queryFn: () => dataService.getFollowUps(salesperson?.id || ''),
    enabled: !!salesperson?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStores(),
      refetchOrders(),
      refetchVisits(),
      refetchActiveVisit(),
      refetchNotifs(),
      refetchFollowUps(),
    ]);
    setRefreshing(false);
  };

  // Metrics calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayOrders = useMemo(() => orders.filter((o) => o.order_date === todayDateStr), [orders, todayDateStr]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const confirmedOrders = useMemo(() => orders.filter((o) => o.status === 'confirmed'), [orders]);

  const todaySalesAmount = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [todayOrders]);

  const totalOutstandingEstimate = useMemo(() => {
    return stores.reduce((sum, s) => sum + (s.credit_limit || 0), 0);
  }, [stores]);

  const pendingFollowUps = useMemo(() => {
    return followUps.filter((f) => f.status !== 'completed');
  }, [followUps]);

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Premium Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.userSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/sales/(tabs)/profile')}
            style={styles.avatarBorder}
          >
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.userTextCol}>
            <View style={styles.badgeRow}>
              <View style={styles.verifiedDot} />
              <Text style={styles.roleTag}>FIELD SALES OFFICER</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {salesperson?.name || 'Sales Representative'}
            </Text>
            <Text style={styles.userArea} numberOfLines={1}>
              {salesperson?.assigned_area || 'Central Beat'} • {salesperson?.employee_id}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/notifications' as any)}
            style={styles.bellButton}
          >
            <Bell size={20} color={Colors.textPrimary} />
            {unreadNotifCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primaryDark]}
          />
        }
      >
        {/* GPS Live Telemetry Pill Bar */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (permissionDenied) {
              openAppSettings();
            } else {
              router.push('/sales/location' as any);
            }
          }}
          style={styles.gpsContainer}
        >
          <View style={styles.gpsInfoCol}>
            <View style={styles.gpsStatusRow}>
              <View
                style={[
                  styles.pulseDot,
                  {
                    backgroundColor: isTracking
                      ? '#22C55E'
                      : permissionDenied
                      ? Colors.warning
                      : Colors.gray400,
                  },
                ]}
              />
              <Text style={styles.gpsStatusText}>
                {isTracking
                  ? 'Automatic GPS Tracking Active'
                  : permissionDenied
                  ? 'Location Permission Required'
                  : 'Starting Automatic GPS Tracking...'}
              </Text>
            </View>
            <Text style={styles.gpsCoordText}>
              {isTracking
                ? currentCoords
                  ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)} • Live Beat Sync`
                  : 'Acquiring GPS lock...'
                : permissionDenied
                ? 'Tap to grant location permission in Settings for beat tracking'
                : 'Connecting to device GPS...'}
            </Text>
          </View>

          {permissionDenied ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openAppSettings}
              style={[styles.gpsButton, styles.gpsButtonStart]}
            >
              <Text style={[styles.gpsBtnText, { color: '#166534' }]}>Settings</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.gpsBadgeActive}>
              <Text style={styles.gpsBadgeText}>
                {isTracking ? 'Active' : 'Syncing'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Active Store Visit in Progress Banner */}
        {activeVisit && (
          <View style={styles.activeVisitCard}>
            <View style={styles.activeVisitHeader}>
              <View style={styles.visitPill}>
                <View style={styles.visitPillDot} />
                <Text style={styles.visitPillText}>VISIT IN PROGRESS</Text>
              </View>
              <Text style={styles.visitTimeText}>
                Started {new Date(activeVisit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <Text style={styles.activeStoreName}>
              {activeVisit.store?.name || 'Retail Outlet'}
            </Text>
            <Text style={styles.activeStoreAddress}>
              {activeVisit.store?.address || 'Store location'}
            </Text>

            <View style={styles.activeVisitBtns}>
              <Button
                title="Book Order"
                variant="primary"
                size="sm"
                icon={<PlusCircle size={14} color={Colors.white} />}
                onPress={() =>
                  router.push({
                    pathname: '/sales/orders/create' as any,
                    params: { storeId: activeVisit.store_id },
                  })
                }
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Finish Check-out"
                variant="outline"
                size="sm"
                icon={<CheckCircle2 size={14} color={Colors.textPrimary} />}
                onPress={() =>
                  router.push({
                    pathname: '/sales/stores/visit' as any,
                    params: { storeId: activeVisit.store_id, visitId: activeVisit.id },
                  })
                }
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* Today's Sales Hero Card (Asymmetric Highlights) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroOverline}>{"TODAY'S TOTAL BOOKINGS"}</Text>
              <Text style={styles.heroAmount}>
                ₹{todaySalesAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <TrendingUp size={24} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{todayOrders.length}</Text>
              <Text style={styles.heroStatLabel}>{"Today's Orders"}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{todayVisits.length}</Text>
              <Text style={styles.heroStatLabel}>Store Visits</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{pendingOrders.length}</Text>
              <Text style={styles.heroStatLabel}>Pending Approval</Text>
            </View>
          </View>
        </View>

        {/* 2x2 Balanced Performance Grid */}
        <View style={styles.metricGrid}>
          {/* Card 1: Beat Stores */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/sales/(tabs)/stores')}
            style={styles.gridCard}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <StoreIcon size={20} color="#0369A1" />
            </View>
            <Text style={styles.gridVal}>{stores.length}</Text>
            <Text style={styles.gridLabel}>Territory Outlets</Text>
            <Text style={styles.gridSub}>{todayVisits.length} visited today</Text>
          </TouchableOpacity>

          {/* Card 2: Confirmed Orders */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/sales/(tabs)/orders')}
            style={styles.gridCard}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={20} color="#15803D" />
            </View>
            <Text style={styles.gridVal}>{confirmedOrders.length}</Text>
            <Text style={styles.gridLabel}>Approved Orders</Text>
            <Text style={styles.gridSub}>Fulfillment ready</Text>
          </TouchableOpacity>

          {/* Card 3: Pending Follow-ups */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/sales/(tabs)/follow-ups')}
            style={styles.gridCard}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <CalendarClock size={20} color="#B45309" />
            </View>
            <Text style={styles.gridVal}>{pendingFollowUps.length}</Text>
            <Text style={styles.gridLabel}>Pending Tasks</Text>
            <Text style={styles.gridSub}>Collections & audits</Text>
          </TouchableOpacity>

          {/* Card 4: Total Credit Exposure */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/sales/(tabs)/stores')}
            style={styles.gridCard}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <CreditCard size={20} color="#7E22CE" />
            </View>
            <Text style={styles.gridVal}>
              ₹{totalOutstandingEstimate > 100000 ? `${(totalOutstandingEstimate / 100000).toFixed(1)}L` : totalOutstandingEstimate.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.gridLabel}>Credit Outlets</Text>
            <Text style={styles.gridSub}>Assigned balance</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Launchpad Action Grid (Clean Outlined Buttons) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Beat Operations</Text>
          <Text style={styles.sectionDate}>{formattedDate}</Text>
        </View>

        <View style={styles.launchpadGrid}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/(tabs)/stores')}
            style={styles.launchpadBtn}
          >
            <View style={[styles.launchpadIcon, { backgroundColor: Colors.primaryLight }]}>
              <MapPin size={22} color={Colors.primaryDark} />
            </View>
            <Text style={styles.launchpadLabel}>Store Check-In</Text>
            <Text style={styles.launchpadSub}>GPS Geofence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/orders/create' as any)}
            style={styles.launchpadBtn}
          >
            <View style={[styles.launchpadIcon, { backgroundColor: '#FFF4ED' }]}>
              <PlusCircle size={22} color="#EA580C" />
            </View>
            <Text style={styles.launchpadLabel}>Book Order</Text>
            <Text style={styles.launchpadSub}>Direct Dispatch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/products' as any)}
            style={styles.launchpadBtn}
          >
            <View style={[styles.launchpadIcon, { backgroundColor: '#EFF6FF' }]}>
              <ShoppingBag size={22} color="#2563EB" />
            </View>
            <Text style={styles.launchpadLabel}>Catalogue</Text>
            <Text style={styles.launchpadSub}>Stock & Pricing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/(tabs)/follow-ups')}
            style={styles.launchpadBtn}
          >
            <View style={[styles.launchpadIcon, { backgroundColor: '#F3EEFF' }]}>
              <CalendarClock size={22} color="#7C3AED" />
            </View>
            <Text style={styles.launchpadLabel}>Follow-ups</Text>
            <Text style={styles.launchpadSub}>Tasks & Collections</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders List with Beautiful Visual Status Progression */}
        <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/(tabs)/orders')}
          >
            <Text style={styles.viewAllText}>View All ({orders.length})</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShoppingBag size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No orders placed yet</Text>
            <Text style={styles.emptySubtitle}>
              Select an outlet from your beat list to book your first FMCG order.
            </Text>
            <Button
              title="Book New Order"
              variant="primary"
              size="sm"
              onPress={() => router.push('/sales/orders/create' as any)}
              style={{ marginTop: 12, paddingHorizontal: 20 }}
            />
          </View>
        ) : (
          orders.slice(0, 4).map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/sales/orders/${order.id}` as any)}
              style={styles.orderCard}
            >
              <View style={styles.orderTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <Text style={styles.orderStore} numberOfLines={1}>
                    {order.store?.name || 'Retail Outlet'}
                  </Text>
                </View>
                <StatusBadge status={order.status} />
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.orderBottom}>
                <Text style={styles.orderMeta}>
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  • {order.items?.length || 0} line items
                </Text>
                <Text style={styles.orderPrice}>
                  ₹{order.total_amount?.toLocaleString('en-IN')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Upcoming Tasks & Follow-ups */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Pending Follow-ups</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/(tabs)/follow-ups')}
          >
            <Text style={styles.viewAllText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {pendingFollowUps.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarClock size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>All follow-ups completed</Text>
            <Text style={styles.emptySubtitle}>
              Great job! You have no pending payment collections or store meetings.
            </Text>
          </View>
        ) : (
          pendingFollowUps.slice(0, 3).map((f) => (
            <TouchableOpacity
              key={f.id}
              activeOpacity={0.7}
              onPress={() => router.push('/sales/(tabs)/follow-ups')}
              style={styles.taskCard}
            >
              <View style={styles.taskIconBox}>
                <Clock size={16} color={Colors.primaryDark} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.taskStore} numberOfLines={1}>{f.store?.name || 'Retail Outlet'}</Text>
                <Text style={styles.taskReason} numberOfLines={1}>{f.reason}</Text>
                <Text style={styles.taskDate}>
                  Due: {new Date(f.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {f.follow_up_time ? ` at ${f.follow_up_time}` : ''}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    padding: 3,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    ...Shadows.xs,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  userTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  roleTag: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.6,
  },
  userName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  userArea: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: Colors.white,
    ...Typography.captionSm,
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  gpsInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsStatusText: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  gpsCoordText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },
  gpsButtonStart: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  gpsButtonStop: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  gpsBtnText: {
    ...Typography.buttonSm,
  },
  gpsBadgeActive: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  gpsBadgeText: {
    ...Typography.captionSm,
    color: '#15803D',
    fontWeight: '700',
  },
  activeVisitCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 14,
    ...Shadows.xs,
  },
  activeVisitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  visitPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  visitPillText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.6,
  },
  visitTimeText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
  },
  activeStoreName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  activeStoreAddress: {
    ...Typography.captionMd,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  activeVisitBtns: {
    flexDirection: 'row',
  },
  heroCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius['2xl'],
    padding: 20,
    marginBottom: 14,
    ...Shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroOverline: {
    ...Typography.captionSm,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroAmount: {
    ...Typography.displayLg,
    color: Colors.white,
    marginTop: 4,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    ...Typography.statMd,
    color: Colors.white,
  },
  heroStatLabel: {
    ...Typography.captionSm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridVal: {
    ...Typography.statLg,
    color: Colors.textPrimary,
  },
  gridLabel: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gridSub: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  sectionDate: {
    ...Typography.captionLg,
    color: Colors.textTertiary,
  },
  viewAllText: {
    ...Typography.labelSm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  launchpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  launchpadBtn: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    ...Shadows.xs,
  },
  launchpadIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  launchpadLabel: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  launchpadSub: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 270,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    ...Shadows.xs,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNumber: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  orderStore: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  orderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMeta: {
    ...Typography.captionLg,
    color: Colors.textTertiary,
  },
  orderPrice: {
    ...Typography.statSm,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 8,
    ...Shadows.xs,
  },
  taskIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskStore: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  taskReason: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  taskDate: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
