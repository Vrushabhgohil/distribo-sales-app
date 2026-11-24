import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ShoppingBag, Store as StoreIcon } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { StoreVisit, Order } from '@/types';

interface SalesTrackerCardProps {
  activeVisit: StoreVisit | null;
  todayOrders: Order[];
  todaySalesAmount: number;
}

export const SalesTrackerCard: React.FC<SalesTrackerCardProps> = ({
  activeVisit,
  todayOrders,
  todaySalesAmount,
}) => {
  const router = useRouter();

  if (activeVisit) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: '/sales/stores/visit' as any,
            params: { storeId: activeVisit.store_id, visitId: activeVisit.id },
          })
        }
        style={styles.trackerCard}
      >
        <View style={[styles.trackerIconBox, { backgroundColor: Colors.secondaryLight }]}>
          <StoreIcon size={20} color={Colors.secondary} />
        </View>

        <View style={styles.trackerInfo}>
          <Text style={styles.trackerTitle}>Store Visit in Progress</Text>
          <Text style={styles.trackerSubtitle} numberOfLines={1}>
            {activeVisit.store?.name || 'Retail Outlet'} • Checked in
          </Text>
        </View>

        <View style={styles.trackerRight}>
          <Text style={[styles.trackerEta, { color: Colors.secondary }]}>Active</Text>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/sales/(tabs)/orders')}
      style={styles.trackerCard}
    >
      <View style={[styles.trackerIconBox, { backgroundColor: Colors.primaryLight }]}>
        <ShoppingBag size={20} color={Colors.primary} />
      </View>

      <View style={styles.trackerInfo}>
        <Text style={styles.trackerTitle}>{"Today's Booking Dispatch"}</Text>
        <Text style={styles.trackerSubtitle} numberOfLines={1}>
          {todayOrders.length > 0
            ? `₹${todaySalesAmount.toLocaleString('en-IN')} booked • ${todayOrders.length} orders recorded`
            : 'Start booking beat retail orders today'}
        </Text>
      </View>

      <View style={styles.trackerRight}>
        <Text style={styles.trackerEta}>
          {todayOrders.length > 0 ? `${todayOrders.length} orders` : 'Beat Ready'}
        </Text>
        <ChevronRight size={16} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  trackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  trackerIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  trackerInfo: {
    flex: 1,
  },
  trackerTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 2,
  },
  trackerSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  trackerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackerEta: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 12,
  },
});
