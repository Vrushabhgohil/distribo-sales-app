import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, RefreshCw, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { salesperson, refreshProfile, signOut } = useAuth();

  const handleRefresh = async () => {
    await refreshProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>Motiba Sales</Text>
        </View>

        {/* Central Approval Card */}
        <View style={styles.approvalCard}>
          <View style={styles.iconCircle}>
            <Clock size={36} color={Colors.warning} />
          </View>

          <Text style={styles.title}>Account Pending Verification</Text>
          <Text style={styles.description}>
            Your field sales profile has been submitted to the Aarvi Central Distribution Hub.
            An administrator must assign your beat territory before you can start store visits and order bookings.
          </Text>

          {/* User Details Box */}
          {salesperson && (
            <View style={styles.profileBox}>
              <Text style={styles.profileName}>{salesperson.name}</Text>
              <Text style={styles.profileMeta}>
                {salesperson.employee_id} • {salesperson.email}
              </Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>PENDING ADMIN REVIEW</Text>
              </View>
            </View>
          )}

          <Button
            title="Check Verification Status"
            variant="primary"
            size="lg"
            icon={<RefreshCw size={16} color={Colors.white} />}
            onPress={handleRefresh}
            style={styles.refreshBtn}
          />
        </View>

        {/* Sign Out Option */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await signOut();
              router.replace('/(auth)/login');
            }}
            style={styles.signOutLink}
          >
            <LogOut size={16} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out / Switch Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoCard: {
    width: 74,
    height: 74,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 8,
    ...Shadows.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
  },
  appTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  approvalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 6,
  },
  profileBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginVertical: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  profileName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  profileMeta: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningLight,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    marginTop: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  statusPillText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.warning,
    letterSpacing: 0.6,
  },
  refreshBtn: {
    width: '100%',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  signOutText: {
    ...Typography.buttonSm,
    color: Colors.error,
  },
});
