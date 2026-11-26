import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Store as StoreIcon,
  PlusCircle,
  ShoppingBag,
  Navigation,
  ClipboardList,
  CalendarClock,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useSalesDashboard } from '@/features/sales/useSalesDashboard';
import { SalesDashboardHeader } from '@/components/sales-dashboard/SalesDashboardHeader';
import { SalesTrackerCard } from '@/components/sales-dashboard/SalesTrackerCard';
import { SalesBentoCategories } from '@/components/sales-dashboard/SalesBentoCategories';
import { SalesBestsellers } from '@/components/sales-dashboard/SalesBestsellers';
import { SalesOutletList } from '@/components/sales-dashboard/SalesOutletList';

export default function HomeScreen() {
  const router = useRouter();
  const {
    salesperson,
    isTracking,
    currentCoords,
    stores,
    todayOrders,
    todaySalesAmount,
    activeVisit,
    visitStatusByStoreId,
    completedVisitsToday,
    pendingVisitsToday,
    pendingFollowUpsCount,
    upcomingFollowUps,
    unreadNotifCount,
    bestsellers,
    refreshing,
    onRefresh,
  } = useSalesDashboard();

  const kpiCards = [
    { label: 'Assigned Stores', value: String(stores.length), sub: `${stores.length} today's beat` },
    { label: 'Completed Visits', value: String(completedVisitsToday), sub: `${pendingVisitsToday} pending` },
    { label: "Today's Orders", value: String(todayOrders.length), sub: `₹${todaySalesAmount.toLocaleString('en-IN')}` },
    { label: 'Follow-ups', value: String(pendingFollowUpsCount), sub: `${upcomingFollowUps.length} upcoming` },
  ];

  const quickActions = [
    {
      label: 'Start Visit',
      icon: Navigation,
      color: Colors.secondary,
      bg: Colors.secondaryLight,
      onPress: () => {
        if (activeVisit) {
          router.push({ pathname: '/sales/stores/visit' as any, params: { storeId: activeVisit.store_id, visitId: activeVisit.id } });
        } else if (stores.length > 0) {
          router.push({ pathname: '/sales/stores/visit' as any, params: { storeId: stores[0].id } });
        } else {
          router.push('/sales/(tabs)/stores');
        }
      },
    },
    {
      label: 'View Stores',
      icon: StoreIcon,
      color: Colors.primary,
      bg: Colors.primaryLight,
      onPress: () => router.push('/sales/(tabs)/stores'),
    },
    {
      label: 'New Store',
      icon: PlusCircle,
      color: Colors.goldDark,
      bg: Colors.goldLight,
      onPress: () => router.push('/sales/stores/add' as any),
    },
    {
      label: 'Book Order',
      icon: ShoppingBag,
      color: Colors.primary,
      bg: Colors.primaryLight,
      onPress: () => router.push('/sales/orders/create' as any),
    },
    {
      label: 'View Orders',
      icon: ClipboardList,
      color: Colors.secondary,
      bg: Colors.secondaryLight,
      onPress: () => router.push('/sales/(tabs)/orders'),
    },
    {
      label: 'Follow-ups',
      icon: CalendarClock,
      color: Colors.goldDark,
      bg: Colors.goldLight,
      onPress: () => router.push('/sales/(tabs)/follow-ups'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── 1. Top Header & Telemetry Dropdown ── */}
      <SalesDashboardHeader
        salesperson={salesperson}
        unreadNotifCount={unreadNotifCount}
        isTracking={isTracking}
        currentCoords={currentCoords}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── 2. Live Beat / Visit Tracker Card ── */}
        <SalesTrackerCard
          activeVisit={activeVisit}
          todayOrders={todayOrders}
          todaySalesAmount={todaySalesAmount}
        />

        {/* ── 3. Daily Work Overview KPIs ── */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── 4. Quick Actions ── */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <TouchableOpacity
                key={act.label}
                activeOpacity={0.8}
                onPress={act.onPress}
                style={styles.quickBtn}
              >
                <View style={[styles.quickIconBox, { backgroundColor: act.bg }]}>
                  <Icon size={20} color={act.color} />
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{act.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 5. Today's Assigned Stores ── */}
        <SalesOutletList stores={stores} visitStatusByStoreId={visitStatusByStoreId} />

        {/* ── 6. Upcoming Follow-ups ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Upcoming Follow-ups</Text>
          <TouchableOpacity onPress={() => router.push('/sales/(tabs)/follow-ups')}>
            <Text style={styles.viewAllText}>See all &gt;</Text>
          </TouchableOpacity>
        </View>

        {upcomingFollowUps.length === 0 ? (
          <View style={styles.emptyFollowUpCard}>
            <Text style={styles.emptyFollowUpText}>No upcoming follow-ups scheduled.</Text>
          </View>
        ) : (
          upcomingFollowUps.map((f) => (
            <TouchableOpacity
              key={f.id}
              activeOpacity={0.8}
              onPress={() =>
                f.store_id
                  ? router.push(`/sales/stores/${f.store_id}` as any)
                  : router.push('/sales/(tabs)/follow-ups')
              }
              style={styles.followUpCard}
            >
              <View style={styles.followUpIcon}>
                <CalendarClock size={18} color={Colors.goldDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.followUpStore} numberOfLines={1}>
                  {f.store?.name || 'Retail Outlet'}
                </Text>
                <Text style={styles.followUpReason} numberOfLines={1}>{f.reason}</Text>
                <View style={styles.followUpTimeRow}>
                  <Clock size={11} color={Colors.textTertiary} />
                  <Text style={styles.followUpTimeText}>
                    {new Date(f.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {f.follow_up_time ? ` • ${f.follow_up_time}` : ''}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))
        )}

        {/* ── 7. Product Catalog Categories & Bestsellers ── */}
        <SalesBentoCategories />
        <SalesBestsellers products={bestsellers} />

        {/* ── 8. Live GPS Transmission Status Bar ── */}
        <View style={styles.gpsBar}>
          <View style={isTracking ? styles.gpsDotActive : styles.gpsDotInactive} />
          <Text style={styles.gpsText}>
            {isTracking
              ? `GPS Live Transmission: ${
                  currentCoords
                    ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`
                    : 'Active'
                }`
              : 'GPS Tracking Standby • Working Hours'}
          </Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  kpiValue: {
    ...Typography.displaySm,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 22,
  },
  kpiLabel: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiSub: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  sectionHeading: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  quickBtn: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  viewAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 13,
  },
  emptyFollowUpCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  emptyFollowUpText: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
  },
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  followUpIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  followUpStore: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  followUpReason: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  followUpTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  followUpTimeText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontSize: 11,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  actionSubtitle: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  gpsDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  gpsDotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  gpsText: {
    ...Typography.captionSm,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
