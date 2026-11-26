import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Info,
  Lock,
  User,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/CustomAlert';

const REGISTRATION_RESTRICTED_MESSAGE =
  'Account registration is restricted. New user accounts can only be created by an authorized administrator through the Admin Panel. Please contact your administrator if you require access.';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanId = identifier.trim();

    if (!cleanId) {
      setErrorMessage('Please enter your work email or Employee ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await signIn(cleanId, password, rememberMe);
    setLoading(false);

    if (!result.success) {
      let friendlyError = result.error || 'Authentication failed. Please check your credentials.';
      const lower = friendlyError.toLowerCase();
      if (
        lower.includes('invalid login credentials') ||
        lower.includes('invalid credentials') ||
        lower.includes('invalid email') ||
        lower.includes('invalid password')
      ) {
        friendlyError = 'Incorrect email/ID or password. Please verify and try again.';
      } else if (lower.includes('network') || lower.includes('fetch')) {
        friendlyError = 'Network connection failed. Please check your internet connectivity.';
      }
      setErrorMessage(friendlyError);
      Alert.alert('Sign In Failed', friendlyError);
    } else {
      // Role and account status are automatically detected
      if (result.accountStatus === 'pending') {
        router.replace('/(auth)/pending-approval');
      } else if (result.role === 'sales_person') {
        router.replace('/sales' as any);
      } else if (result.role === 'delivery_person') {
        router.replace('/delivery' as any);
      }
    }
  };

  const handleSignUpClick = () => {
    setRegistrationNotice(REGISTRATION_RESTRICTED_MESSAGE);
    Alert.alert('Registration Restricted', REGISTRATION_RESTRICTED_MESSAGE);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Brand Section */}
          <View style={styles.brandContainer}>
            <View style={styles.logoCard}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color={Colors.primary} />
              <Text style={styles.verifiedText}>MOTIBA FMCG SUITE</Text>
            </View>

            <Text style={styles.appTitle}>Unified Portal Sign In</Text>
            <Text style={styles.appSubtitle}>
              Sign in with your work email or Employee ID. Your role portal opens automatically.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Registration Restricted Informational Banner */}
            {registrationNotice && (
              <View style={styles.noticeBanner}>
                <View style={styles.noticeIconWrap}>
                  <Info size={18} color={Colors.primary} />
                </View>
                <View style={styles.noticeBody}>
                  <Text style={styles.noticeTitle}>Registration Restricted</Text>
                  <Text style={styles.noticeText}>{registrationNotice}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRegistrationNotice(null)}
                  style={styles.noticeCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={Colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Input
              label="Work Email or Employee ID"
              placeholder="e.g. name@aarvifmcg.com or EMP-001"
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<User size={18} color={Colors.textTertiary} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
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

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberRow}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Check size={12} color={Colors.white} strokeWidth={3} />}
                </View>
                <Text style={styles.rememberText}>Keep me signed in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Action Button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              variant="primary"
              style={styles.loginBtn}
              icon={<ArrowRight size={18} color={Colors.white} />}
              iconPosition="right"
            />
          </View>

          {/* Secure Access & Role Auto-Detection Note */}
          <View style={styles.securityNote}>
            <View style={styles.securityBadge}>
              <Text style={styles.roleTag}>Sales Portal</Text>
              <Text style={styles.roleDivider}>•</Text>
              <Text style={styles.roleTag}>Delivery Fleet Portal</Text>
            </View>
            <Text style={styles.securityText}>
              Your role is automatically verified upon sign in. No manual role selection required.
            </Text>
          </View>

          {/* Sign Up / Registration Notice Prompt */}
          <View style={styles.signupPrompt}>
            <Text style={styles.promptText}>New Sales Representative?</Text>
            <TouchableOpacity
              onPress={handleSignUpClick}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}> Sign Up / Register</Text>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCard: {
    width: 64,
    height: 64,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  appTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  appSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primaryLight,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginBottom: 16,
  },
  noticeIconWrap: {
    marginTop: 2,
  },
  noticeBody: {
    flex: 1,
  },
  noticeTitle: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  noticeText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noticeCloseBtn: {
    padding: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorLight,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    marginBottom: 16,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    flex: 1,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  forgotText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginBtn: {
    marginTop: 4,
  },
  securityNote: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  roleDivider: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  securityText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  promptText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  signupLink: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '700',
  },
});
