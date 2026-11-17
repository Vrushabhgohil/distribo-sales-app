import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Navigation,
  MapPin,
  Clock,
  Radio,
  Battery,
  ShieldCheck,
  RefreshCw,
  Compass,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/common/Header';
import { SalesMap } from '@/components/map/SalesMap';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';

const INTERVAL_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '60 sec', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

const STATUS_OPTIONS: Array<'online' | 'travelling' | 'on_visit' | 'idle' | 'offline'> = [
  'online',
  'travelling',
  'on_visit',
  'idle',
];

export default function LocationScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const {
    isTracking,
    permissionDenied,
    openAppSettings,
    currentCoords,
    lastPingTime,
    trackingStatus,
    setTrackingStatus,
    updateIntervalSec,
    setUpdateIntervalSec,
    batteryOptimized,
    setBatteryOptimized,
  } = useLocationTracker();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Live Location Tracking"
        subtitle="Automatic Beat GPS Updates"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Main Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.radarCircle,
                { backgroundColor: isTracking ? '#DCFCE7' : Colors.surfaceSecondary },
              ]}
            >
              <Radio
                size={26}
                color={isTracking ? '#15803D' : Colors.textTertiary}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.statusHeading}>
                {isTracking ? 'Automatic GPS Active' : permissionDenied ? 'Permission Required' : 'Acquiring GPS Lock'}
              </Text>
              <Text style={styles.statusSub}>
                {isTracking
                  ? 'Your visit coordinates and route updates are syncing automatically.'
                  : permissionDenied
                  ? 'Location permission is required to verify store visits and beat coverage.'
                  : 'Connecting to device GPS satellites...'}
              </Text>
            </View>
          </View>

          {permissionDenied && (
            <Button
              title="Open Settings to Enable Location"
              variant="primary"
              size="lg"
              onPress={openAppSettings}
              style={{ marginTop: 16 }}
            />
          )}
        </View>

        {/* Coordinate Readout */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current GPS Coordinates</Text>

          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Latitude</Text>
              <Text style={styles.telemetryVal}>
                {currentCoords ? currentCoords.latitude.toFixed(6) : '—'}
              </Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Longitude</Text>
              <Text style={styles.telemetryVal}>
                {currentCoords ? currentCoords.longitude.toFixed(6) : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>GPS Accuracy</Text>
              <Text style={styles.telemetryVal}>
                {currentCoords?.accuracy ? `±${Math.round(currentCoords.accuracy)}m` : 'High'}
              </Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Last Transmission</Text>
              <Text style={styles.telemetryVal}>
                {lastPingTime
                  ? new Date(lastPingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Live Map Preview */}
        {currentCoords && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Beat Route Map</Text>
            <View style={styles.mapContainer}>
              <SalesMap
                latitude={currentCoords.latitude}
                longitude={currentCoords.longitude}
                markers={[
                  {
                    latitude: currentCoords.latitude,
                    longitude: currentCoords.longitude,
                    title: salesperson?.name || 'Sales Officer',
                    description: `Status: ${trackingStatus}`,
                  },
                ]}
                height={200}
              />
            </View>
          </View>
        )}

        {/* Activity Status Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Field Activity Status</Text>
          <View style={styles.statusChipsRow}>
            {STATUS_OPTIONS.map((status) => {
              const isSelected = trackingStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.7}
                  onPress={() => setTrackingStatus(status)}
                  style={[
                    styles.statusChip,
                    isSelected && styles.statusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.statusChipTextActive,
                    ]}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ping Interval Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ping Transmission Interval</Text>
          <View style={styles.statusChipsRow}>
            {INTERVAL_OPTIONS.map((opt) => {
              const isSelected = updateIntervalSec === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => setUpdateIntervalSec(opt.value)}
                  style={[
                    styles.statusChip,
                    isSelected && styles.statusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.statusChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Battery Optimization Toggle */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Battery Optimization</Text>
              <Text style={styles.switchSub}>
                Balances GPS satellite accuracy with battery endurance
              </Text>
            </View>
            <Switch
              value={batteryOptimized}
              onValueChange={setBatteryOptimized}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
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
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  statusSub: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
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
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 12,
  },
  telemetryLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  telemetryVal: {
    ...Typography.statSm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  mapContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  statusChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  switchSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
