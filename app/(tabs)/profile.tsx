import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  ChevronRight,
  HelpCircle,
  LogOut,
  Mail,
  Map,
  MapPin,
  Phone,
  Radio,
  Settings,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react-native';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { salesperson, signOut } = useAuth();
  const { isTracking, currentCoords, trackingStatus } = useLocationTracker();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out of Sales Beat',
      'Are you sure you want to conclude your current field sales session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="My Account"
        subtitle="Field Sales Officer Profile"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/help' as any)}
            style={styles.helpHeaderBtn}
            activeOpacity={0.7}
          >
            <HelpCircle size={20} color={Colors.primaryDark} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBox}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={styles.roleBadge}>
                <ShieldCheck size={12} color={Colors.primaryDark} />
                <Text style={styles.roleBadgeText}>SALES REPRESENTATIVE</Text>
              </View>

              <Text style={styles.nameText}>{salesperson?.name || 'Sales Officer'}</Text>
              <Text style={styles.empIdText}>Employee ID: {salesperson?.employee_id}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Contact & Territory details */}
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Mail size={16} color={Colors.textTertiary} />
              <Text style={styles.infoText}>{salesperson?.email || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Phone size={16} color={Colors.textTertiary} />
              <Text style={styles.infoText}>{salesperson?.mobile || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <MapPin size={16} color={Colors.textTertiary} />
              <Text style={styles.infoText}>
                Beat: {salesperson?.assigned_area || 'Central FMCG Territory'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={16} color={Colors.textTertiary} />
              <Text style={styles.infoText}>
                Joined: {salesperson?.joining_date || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Live GPS Telemetry Status */}
        <Text style={styles.sectionHeading}>GPS Tracking & Live Dispatch</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/location' as any)}
          style={styles.telemetryCard}
        >
          <View
            style={[
              styles.telemetryIconBox,
              { backgroundColor: isTracking ? '#DCFCE7' : Colors.surfaceSecondary },
            ]}
          >
            <Radio
              size={20}
              color={isTracking ? '#15803D' : Colors.textTertiary}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.telemetryTitle}>
              {isTracking ? 'GPS Tracking Active' : 'GPS Tracking Paused'}
            </Text>
            <Text style={styles.telemetrySub}>
              {isTracking
                ? `Status: ${trackingStatus} • ${currentCoords
                  ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`
                  : 'Locking coordinates...'
                }`
                : 'Tap to view live transmission & route map'}
            </Text>
          </View>

          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {/* Navigation Menus */}
        <Text style={styles.sectionHeading}>Application Menus</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/products' as any)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
                <ShoppingBag size={18} color="#2563EB" />
              </View>
              <Text style={styles.menuLabel}>Product Master Catalogue</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/notifications' as any)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3EEFF' }]}>
                <Bell size={18} color="#7C3AED" />
              </View>
              <Text style={styles.menuLabel}>Notifications & Admin Alerts</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/location' as any)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
                <Map size={18} color="#15803D" />
              </View>
              <Text style={styles.menuLabel}>Live GPS & Beat Map</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/settings' as any)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Settings size={18} color="#B45309" />
              </View>
              <Text style={styles.menuLabel}>Beat Settings & Cache Management</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/help' as any)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                <HelpCircle size={18} color={Colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>Help & Support (FAQs & Guides)</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out from Sales Beat"
          variant="danger"
          size="lg"
          icon={<LogOut size={18} color={Colors.white} />}
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />

        <Text style={styles.versionText}>
          Distribo Sales Mobile v1.0.0 • Connected to Central Hub
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
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleBadgeText: {
    ...Typography.captionSm,
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  nameText: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  empIdText: {
    ...Typography.captionMd,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  infoCol: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
  },
  sectionHeading: {
    ...Typography.labelMd,
    color: Colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
  },
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  telemetryIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryTitle: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  telemetrySub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  signOutBtn: {
    marginTop: 24,
  },
  versionText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
  helpHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
