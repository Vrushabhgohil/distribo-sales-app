import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [assignedArea, setAssignedArea] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid corporate email address.');
      return;
    }
    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the sales guidelines to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await signUp({
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      password,
      assignedArea: assignedArea.trim() || 'Central Territory Beat',
    });

    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create salesperson account.');
    } else {
      router.replace('/(auth)/pending-approval');
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
            <View style={styles.logoCard}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>Create Representative Account</Text>
            <Text style={styles.appSubtitle}>
              Join the field sales team and receive your beat territory assignment
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeading}>Representative Details</Text>

            <Input
              label="Full Name *"
              placeholder="e.g. Ramesh Patel"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<User size={18} color={Colors.textTertiary} />}
            />

            <Input
              label="Mobile Number *"
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(t) => {
                setMobile(t);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Phone size={18} color={Colors.textTertiary} />}
            />

            <Input
              label="Corporate Email *"
              placeholder="e.g. ramesh@aarvifmcg.com"
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

            <Input
              label="Assigned Beat / Territory Area"
              placeholder="e.g. Navrangpura Commercial Zone"
              value={assignedArea}
              onChangeText={(t) => setAssignedArea(t)}
              leftIcon={<MapPin size={18} color={Colors.textTertiary} />}
              helperText="Territory will be verified and mapped by Central Admin"
            />

            <Input
              label="Password *"
              placeholder="Minimum 10 characters"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Lock size={18} color={Colors.textTertiary} />}
              rightIcon={
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              }
            />

            <Input
              label="Confirm Password *"
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Lock size={18} color={Colors.textTertiary} />}
              rightIcon={
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Terms Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreeTerms(!agreeTerms)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                {agreeTerms && <Check size={12} color={Colors.white} strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>
                I accept company field sales policies, live GPS location tracking, and order booking regulations.
              </Text>
            </TouchableOpacity>

            <Button
              title="Create Representative Profile"
              onPress={handleSignUp}
              loading={loading}
              variant="primary"
              size="xl"
              style={styles.submitBtn}
            />
          </View>

          {/* Already registered */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered with Motiba?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    marginBottom: 20,
  },
  logoCard: {
    width: 70,
    height: 70,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    ...Shadows.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
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
    marginTop: 4,
    maxWidth: 300,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Radius.xs,
    borderWidth: 1.8,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  submitBtn: {
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  linkText: {
    ...Typography.bodySm,
    fontWeight: '800',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
