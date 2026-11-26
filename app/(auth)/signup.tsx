import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function SignUpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.verifiedBadge}>
            <ShieldCheck size={12} color={Colors.primary} />
            <Text style={styles.verifiedText}>MOTIBA FMCG SUITE</Text>
          </View>
        </View>

        {/* Brand Card */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Informational Message Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ShieldAlert size={32} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Account Registration Restricted</Text>

          <Text style={styles.message}>
            Account registration is restricted. New user accounts can only be created by an authorized
            administrator through the Admin Panel. Please contact your administrator if you require access.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>How to obtain access:</Text>
            <Text style={styles.infoBoxText}>
              1. Contact your territory FMCG manager or central operations desk.
            </Text>
            <Text style={styles.infoBoxText}>
              2. Your account and credentials will be provisioned directly in the Admin Panel.
            </Text>
            <Text style={styles.infoBoxText}>
              3. Once provisioned, sign in using your corporate email or Employee ID.
            </Text>
          </View>

          <Button
            title="Return to Sign In"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(auth)/login')}
            icon={<ArrowRight size={18} color={Colors.white} />}
            iconPosition="right"
            style={styles.actionBtn}
          />
        </View>

        <Text style={styles.footerNote}>
          Motiba Mobile v1.0 • Enterprise Sales & Distribution Framework
        </Text>
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
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 36,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCard: {
    width: 72,
    height: 72,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 14,
    width: '100%',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoBoxTitle: {
    ...Typography.captionSm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  infoBoxText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  actionBtn: {
    marginTop: 4,
  },
  footerNote: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
  },
});
