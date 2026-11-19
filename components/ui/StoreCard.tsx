import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Phone, ChevronRight, ShoppingBag, Navigation } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography, Spacing } from '@/constants/theme';
import { Store } from '@/types';

interface StoreCardProps {
  store: Store;
  onPress?: () => void;
  onVisitPress?: () => void;
  onOrderPress?: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onPress,
  onVisitPress,
  onOrderPress,
}) => {
  const initials = store.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
      {/* Top Section */}
      <View style={styles.topRow}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={styles.ownerName} numberOfLines={1}>{store.owner_name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={12} color={Colors.textTertiary} />
            <Text style={styles.areaText} numberOfLines={1}>{store.area}, {store.city}</Text>
          </View>
        </View>

        <ChevronRight size={18} color={Colors.textTertiary} />
      </View>

      {/* Details Strip */}
      <View style={styles.detailStrip}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{store.store_type || 'Retail'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Credit</Text>
          <Text style={styles.detailValue}>₹{store.credit_limit?.toLocaleString('en-IN') || '0'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={[styles.statusDot, { backgroundColor: store.status === 'active' ? Colors.secondary : Colors.gray400 }]} />
        </View>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        {onVisitPress && (
          <TouchableOpacity activeOpacity={0.7} onPress={onVisitPress} style={styles.actionBtn}>
            <Navigation size={13} color={Colors.primaryDark} />
            <Text style={styles.actionBtnText}>Check In</Text>
          </TouchableOpacity>
        )}
        {onOrderPress && (
          <TouchableOpacity activeOpacity={0.7} onPress={onOrderPress} style={[styles.actionBtn, styles.actionBtnPrimary]}>
            <ShoppingBag size={13} color={Colors.white} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...Typography.labelLg,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  ownerName: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  areaText: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
  },
  detailStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  detailValue: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primaryDark,
  },
  actionBtnText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
  },
  actionBtnTextPrimary: {
    color: Colors.white,
  },
});
