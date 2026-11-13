import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const HIGHLIGHT_FEATURES = [
  {
    icon: MapPin,
    title: 'Smart Beat Navigation',
    subtitle: 'Automated GPS route tracking & store geofenced check-in',
    tag: 'FIELD GPS',
    tagBg: Colors.primaryLight,
    tagColor: Colors.primaryDark,
  },
  {
    icon: ShoppingBag,
    title: 'Instant Order Booking',
    subtitle: 'Live wholesale FMCG catalogue, dynamic pricing & bulk discounts',
    tag: 'CATALOGUE',
    tagBg: Colors.blueLight,
    tagColor: Colors.blue,
  },
  {
    icon: TrendingUp,
    title: 'Credit & Payment Ledger',
    subtitle: 'Transparent store balance, credit limits & collection tracking',
    tag: 'FINANCES',
    tagBg: Colors.purpleLight,
    tagColor: Colors.purple,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Banner Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoCard}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.verifiedTag}>
              <ShieldCheck size={13} color={Colors.primaryDark} />
              <Text style={styles.verifiedTagText}>DISTRO SALES</Text>
            </View>
          </View>

          <Text style={styles.headline}>
            Distribo<Text style={styles.headlineAccent}>Sales</Text>
          </Text>
          <Text style={styles.subheadline}>
            Next-Gen FMCG Sales & Beat Distribution Portal
          </Text>
        </View>

        {/* Feature Cards Carousel / Stack */}
        <View style={styles.featuresStack}>
          {HIGHLIGHT_FEATURES.map((feat, idx) => {
            const IconComp = feat.icon;
            const isSelected = activeSlide === idx;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                onPress={() => setActiveSlide(idx)}
                style={[
                  styles.featureCard,
                  isSelected && styles.featureCardActive,
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      isSelected ? styles.iconCircleActive : styles.iconCircleInactive,
                    ]}
                  >
                    <IconComp
                      size={22}
                      color={isSelected ? Colors.white : Colors.primaryDark}
                    />
                  </View>
                  <View style={[styles.pillBadge, { backgroundColor: feat.tagBg }]}>
                    <Text style={[styles.pillBadgeText, { color: feat.tagColor }]}>
                      {feat.tag}
                    </Text>
                  </View>
                </View>

                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureDesc}>{feat.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Trust Bar */}
        <View style={styles.trustBar}>
          <Sparkles size={16} color={Colors.primary} />
          <Text style={styles.trustText}>
            Direct cloud synchronization with Aarvi Central Distribution Hub
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.actionsContainer}>
          <Button
            title="Sign In to Sales Account"
            variant="primary"
            size="xl"
            icon={<ArrowRight size={19} color={Colors.white} />}
            iconPosition="right"
            onPress={() => router.push('/(auth)/login')}
            style={styles.primaryAction}
          />
        </View>

        {/* Legal / Enterprise watermark */}
        <Text style={styles.footerLegal}>
          Distribo Mobile v1.0 • Enterprise Distribution Framework
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
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoBadgeContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCard: {
    width: 84,
    height: 84,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.surface,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.xl,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  verifiedTagText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  headline: {
    ...Typography.displayMd,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  headlineAccent: {
    color: Colors.primaryMid,
  },
  subheadline: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  featuresStack: {
    gap: 12,
    marginVertical: 12,
  },
  featureCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  featureCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: Colors.primaryDark,
  },
  iconCircleInactive: {
    backgroundColor: Colors.primaryLight,
  },
  pillBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  pillBadgeText: {
    ...Typography.captionSm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  featureDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    marginVertical: 10,
  },
  trustText: {
    flex: 1,
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 8,
  },
  primaryAction: {},
  secondaryAction: {},
  footerLegal: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
});
