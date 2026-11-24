import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Radio, ArrowRight, X } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { SalesPersonProfile } from '@/types';

interface SalesDashboardHeaderProps {
  salesperson: SalesPersonProfile | null;
  unreadNotifCount: number;
  isTracking: boolean;
  currentCoords: { latitude: number; longitude: number } | null;
}

export const SalesDashboardHeader: React.FC<SalesDashboardHeaderProps> = ({
  salesperson,
  unreadNotifCount,
  isTracking,
  currentCoords,
}) => {
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <>
      <View style={styles.topHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDropdownVisible(!dropdownVisible)}
          style={styles.instagramBrandRow}
        >
          <Text style={styles.instagramBrandText}>Motiba</Text>
          <ChevronDown
            size={18}
            color={Colors.primary}
            style={[styles.brandChevron, dropdownVisible && styles.brandChevronRotated]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/sales/notifications' as any)}
          style={styles.bellBtn}
        >
          <Bell size={20} color={Colors.textPrimary} />
          {unreadNotifCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownCard}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownHeaderTitle}>Beat Telemetry & Status</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)} style={styles.dropdownCloseBtn}>
                    <X size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.dropdownFieldBox}>
                  <View style={styles.dropdownIconCircle}>
                    <MapPin size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.dropdownFieldTextCol}>
                    <Text style={styles.dropdownFieldLabel}>CURRENT LOCATION</Text>
                    <Text style={styles.dropdownFieldValue}>
                      Rajkot Hub • {salesperson?.assigned_area || 'Mota Varachha'}
                    </Text>
                    <Text style={styles.dropdownFieldSub}>
                      {currentCoords
                        ? `GPS: ${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`
                        : 'Live beat geofence locked'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.dropdownFieldBox, { marginTop: 12 }]}>
                  <View
                    style={[
                      styles.dropdownIconCircle,
                      { backgroundColor: isTracking ? Colors.secondaryLight : Colors.goldLight },
                    ]}
                  >
                    <Radio size={18} color={isTracking ? Colors.secondary : Colors.goldDark} />
                  </View>
                  <View style={styles.dropdownFieldTextCol}>
                    <Text style={styles.dropdownFieldLabel}>DUTY & TRACKING STATUS</Text>
                    <View style={styles.statusPillRow}>
                      <View style={[styles.statusDot, { backgroundColor: isTracking ? Colors.secondary : Colors.gold }]} />
                      <Text style={[styles.dropdownFieldValue, { color: isTracking ? Colors.secondary : Colors.goldDark }]}>
                        {isTracking ? 'Active on Beat • On Duty' : 'Standby / Paused'}
                      </Text>
                    </View>
                    <Text style={styles.dropdownFieldSub}>
                      {isTracking
                        ? 'Automated live transmission to central hub dispatcher'
                        : 'Tap below to resume live tracking transmission'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setDropdownVisible(false);
                    router.push('/sales/location' as any);
                  }}
                  style={styles.dropdownActionBtn}
                >
                  <Text style={styles.dropdownActionBtnText}>Open Beat Route & GPS Map</Text>
                  <ArrowRight size={15} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  instagramBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  instagramBrandText: {
    fontSize: 29,
    fontWeight: '500',
    color: Colors.primary,
    fontFamily: Platform.select({
      web: 'Instagram Sans Headline',
      ios: 'InstagramSansHeadline',
      android: 'InstagramSansHeadline',
      default: 'Instagram Sans Headline',
    }),
    letterSpacing: -0.5,
  },
  brandChevron: {
    marginLeft: 6,
    marginTop: 2,
  },
  brandChevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.xs,
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29, 19, 14, 0.45)',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 95 : 70,
  },
  dropdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.lg,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownHeaderTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  dropdownCloseBtn: {
    padding: 4,
  },
  dropdownFieldBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dropdownIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownFieldTextCol: {
    flex: 1,
  },
  dropdownFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.goldDark,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dropdownFieldValue: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  dropdownFieldSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dropdownActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginTop: 16,
    ...Shadows.xs,
  },
  dropdownActionBtnText: {
    color: Colors.white,
    ...Typography.labelLg,
    fontWeight: '700',
  },
});
