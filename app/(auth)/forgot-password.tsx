import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { Alert } from '@/components/ui/CustomAlert';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered work email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.success) {
      setSuccessMessage(
        result.message || 'Password reset link sent! Check your inbox to complete reset.'
      const msg = result.message || 'Password reset link sent! Check your inbox to set a new password.';
      setSuccessMessage(msg);
      Alert.alert(
        'Recovery Link Dispatched',
        'We have dispatched the reset instructions to your inbox. You can open the link in your email or proceed directly to set your new password.',
        [
          {
            text: 'Set New Password',
            onPress: () => router.push('/(auth)/reset-password'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } else {
      setErrorMessage(result.error || 'Failed to send reset email. Please contact support.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.verifiedBadge}>
              <ShieldCheck size={13} color={Colors.primary} />
              <Text style={styles.verifiedText}>MOTIBA SALES</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <KeyRound size={28} color={Colors.primary} />
            </View>
            <Text style={styles.appTitle}>Password Recovery</Text>
            <Text style={styles.appSubtitle}>
              Enter your corporate email address to receive password reset instructions
            </Text>
          </View>

          {/* Success Banner */}
          {successMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={18} color={Colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Reset Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeading}>Verification Email</Text>

            <Input
              label="Registered Email Address"
              placeholder="e.g. vrushabhs203@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Mail size={18} color={Colors.textTertiary} />}
            />

            <Button
              title="Send Recovery Link"
              onPress={handleReset}
              loading={loading}
              variant="primary"
              size="xl"
              icon={<ArrowRight size={18} color={Colors.white} />}
              iconPosition="right"
              style={styles.submitBtn}
            />

            {successMessage && (
              <Button
                title="Set New Password Now"
                onPress={() => router.push('/(auth)/reset-password')}
                variant="outline"
                size="md"
                style={{ marginTop: 10 }}
              />
            )}

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
              style={styles.returnLink}
            >
              <Text style={styles.returnText}>Return to Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Support Info */}
          <Text style={styles.footerNote}>
            Need assistance recovering your beat account? Contact your Area Sales Manager or Aarvi FMCG IT Helpdesk.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
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
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  verifiedText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    ...Shadows.sm,
  },
  appTitle: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  appSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 290,
    lineHeight: 19,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successBg,
    borderColor: Colors.success + '40',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 18,
  },
  successText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.success,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error + '40',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.error,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardHeading: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: 18,
  },
  submitBtn: {
    marginTop: 6,
  },
  returnLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  returnText: {
    ...Typography.buttonSm,
    color: Colors.primary,
  },
  footerNote: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
