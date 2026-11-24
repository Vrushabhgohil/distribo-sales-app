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
import { Search, Camera, Package, ArrowRight } from 'lucide-react-native';
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
    unreadNotifCount,
    bestsellers,
    refreshing,
    onRefresh,
  } = useSalesDashboard();

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
        {/* ── 2. Pill Search Bar ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/sales/products' as any)}
          style={styles.searchPill}
        >
          <Search size={18} color={Colors.textTertiary} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search products, retail outlets, orders...</Text>
          <View style={styles.searchCameraBtn}>
            <Camera size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* ── 3. Live Beat / Visit Tracker Card ── */}
        <SalesTrackerCard
          activeVisit={activeVisit}
          todayOrders={todayOrders}
          todaySalesAmount={todaySalesAmount}
        />

        {/* ── 4. 2x2 Category Bento Grid ── */}
        <SalesBentoCategories />

        {/* ── 5. Action Card ("Enroll New Retail Store") ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/sales/stores/add' as any)}
          style={styles.actionCard}
        >
          <View style={styles.actionIconBox}>
            <Package size={26} color={Colors.primary} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Enroll New Retail Store</Text>
            <Text style={styles.actionSubtitle}>Register retail outlet & assign credit limit</Text>
          </View>
          <View style={styles.actionArrowBtn}>
            <ArrowRight size={18} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* ── 6. Beat Bestsellers Carousel ── */}
        <SalesBestsellers products={bestsellers} />

        {/* ── 7. Retail Outlets on Beat ── */}
        <SalesOutletList stores={stores} />

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
              : 'GPS Tracking Standby • Central Dispatch'}
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
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    ...Shadows.xs,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    flex: 1,
  },
  searchCameraBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
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
