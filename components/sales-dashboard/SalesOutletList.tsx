import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, ShoppingBag } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Store } from '@/types';

interface SalesOutletListProps {
  stores: Store[];
}

export const SalesOutletList: React.FC<SalesOutletListProps> = ({ stores }) => {
  const router = useRouter();

  if (stores.length === 0) return null;

  return (
    <>
      <View style={[styles.sectionHeaderRow, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Retail Outlets on Beat</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/sales/(tabs)/stores')}>
          <Text style={styles.viewAllText}>See all &gt;</Text>
        </TouchableOpacity>
      </View>

      {stores.slice(0, 3).map((store: Store) => (
        <TouchableOpacity
          key={store.id}
          activeOpacity={0.8}
          onPress={() => router.push(`/sales/stores/${store.id}` as any)}
          style={styles.storeCard}
        >
          <View style={styles.storeCardTop}>
            <View style={styles.storeAvatarBox}>
              <Text style={styles.storeAvatarText}>{store.name.slice(0, 2).toUpperCase()}</Text>
            </View>

            <View style={styles.storeInfoCol}>
              <Text style={styles.storeName} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.storeOwner} numberOfLines={1}>
                {store.owner_name} • {store.store_type || 'Supermarket'}
              </Text>
              <View style={styles.storeLocRow}>
                <MapPin size={12} color={Colors.textTertiary} />
                <Text style={styles.storeAreaText} numberOfLines={1}>
                  {store.area}, {store.city}
                </Text>
              </View>
            </View>

            <View style={styles.creditPill}>
              <Text style={styles.creditPillLabel}>Credit</Text>
              <Text style={styles.creditPillVal}>
                ₹{(store.credit_limit || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.storeActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/sales/stores/visit' as any,
                  params: { storeId: store.id },
                })
              }
              style={styles.storeCheckInBtn}
            >
              <Navigation size={13} color={Colors.primary} />
              <Text style={styles.storeCheckInText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/sales/orders/create' as any,
                  params: { storeId: store.id },
                })
              }
              style={styles.storeOrderBtn}
            >
              <ShoppingBag size={13} color={Colors.white} />
              <Text style={styles.storeOrderText}>Book Order</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 13,
  },
  storeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  storeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeAvatarText: {
    ...Typography.labelLg,
    color: Colors.primary,
    fontWeight: '800',
  },
  storeInfoCol: {
    flex: 1,
  },
  storeName: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  storeOwner: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  storeLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  storeAreaText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  creditPill: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    alignItems: 'flex-end',
  },
  creditPillLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  creditPillVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  storeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  storeCheckInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  storeCheckInText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  storeOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  storeOrderText: {
    ...Typography.captionBold,
    color: Colors.white,
  },
});
