import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import { dataService } from '@/services/data-service';
import { Product, Store } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Droplets,
  Flame,
  MapPin,
  Navigation,
  Package,
  Plus,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store as StoreIcon,
  Wheat,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const { isTracking, currentCoords } = useLocationTracker();
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Queries for live Supabase data
  const {
    data: stores = [],
    refetch: refetchStores,
  } = useQuery({
    queryKey: ['stores', salesperson?.id],
    queryFn: () => dataService.getStores(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', salesperson?.id],
    queryFn: () => dataService.getOrders(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const {
    data: products = [],
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => dataService.getProducts(),
  });

  const {
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ['today-visits', salesperson?.id],
    queryFn: () => dataService.getTodayVisits(salesperson?.id || ''),
    enabled: !!salesperson?.id,
  });

  const {
    data: activeVisit,
    refetch: refetchActiveVisit,
  } = useQuery({
    queryKey: ['active-visit', salesperson?.id],
    queryFn: () => dataService.getActiveVisit(salesperson?.id || ''),
    enabled: !!salesperson?.id,
  });

  const {
    data: notifications = [],
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dataService.getNotifications(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStores(),
      refetchOrders(),
      refetchProducts(),
      refetchVisits(),
      refetchActiveVisit(),
      refetchNotifs(),
    ]);
    setRefreshing(false);
  };

  // Metrics calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayOrders = useMemo(
    () => orders.filter((o) => o.order_date === todayDateStr),
    [orders, todayDateStr]
  );

  const todaySalesAmount = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [todayOrders]);

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  // Real products from database only (no dummy fallback)
  const bestsellers = useMemo(() => products.slice(0, 6), [products]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── 1. Top Instagram-Style Header Bar ── */}
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
            style={[
              styles.brandChevron,
              dropdownVisible && styles.brandChevronRotated,
            ]}
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

      {/* ── Dropdown Modal with Location and Status Fields ── */}
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
                  <TouchableOpacity
                    onPress={() => setDropdownVisible(false)}
                    style={styles.dropdownCloseBtn}
                  >
                    <X size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Location Field */}
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

                {/* Status Field */}
                <View style={[styles.dropdownFieldBox, { marginTop: 12 }]}>
                  <View style={[styles.dropdownIconCircle, { backgroundColor: isTracking ? Colors.secondaryLight : Colors.goldLight }]}>
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

                {/* Dropdown Action Link */}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── 2. Pill Search Bar ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/sales/products' as any)}
          style={styles.searchPill}
        >
          <Search size={18} color={Colors.textTertiary} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search products, retail outlets, orders...</Text>
          <View style={styles.searchCameraBtn}>
            <Camera size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* ── 3. Live Beat / Visit Tracker Card ("Being prepared" card in reference) ── */}
        {activeVisit ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/sales/stores/visit' as any,
                params: { storeId: activeVisit.store_id, visitId: activeVisit.id },
              })
            }
            style={styles.trackerCard}
          >
            <View style={[styles.trackerIconBox, { backgroundColor: Colors.secondaryLight }]}>
              <StoreIcon size={20} color={Colors.secondary} />
            </View>

            <View style={styles.trackerInfo}>
              <Text style={styles.trackerTitle}>Store Visit in Progress</Text>
              <Text style={styles.trackerSubtitle} numberOfLines={1}>
                {activeVisit.store?.name || 'Retail Outlet'} • Checked in
              </Text>
            </View>

            <View style={styles.trackerRight}>
              <Text style={[styles.trackerEta, { color: Colors.secondary }]}>Active</Text>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sales/(tabs)/orders')}
            style={styles.trackerCard}
          >
            <View style={[styles.trackerIconBox, { backgroundColor: Colors.primaryLight }]}>
              <ShoppingBag size={20} color={Colors.primary} />
            </View>

            <View style={styles.trackerInfo}>
              <Text style={styles.trackerTitle}>{"Today's Booking Dispatch"}</Text>
              <Text style={styles.trackerSubtitle} numberOfLines={1}>
                {todayOrders.length > 0
                  ? `₹${todaySalesAmount.toLocaleString('en-IN')} booked • ${todayOrders.length} orders recorded`
                  : 'Start booking beat retail orders today'}
              </Text>
            </View>

            <View style={styles.trackerRight}>
              <Text style={styles.trackerEta}>
                {todayOrders.length > 0 ? `${todayOrders.length} orders` : 'Beat Ready'}
              </Text>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── 4. 2x2 Category Bento Grid ── */}
        <View style={styles.bentoGrid}>
          {/* Card 1: Grains & Pulses */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sales/products' as any)}
            style={[styles.bentoCard, styles.bentoGrains]}
          >
            <View style={styles.bentoTextCol}>
              <Text style={styles.bentoTitle}>Grains & Dals</Text>
              <Text style={styles.bentoSub}>Basmati, toor & lentils</Text>
              <View style={[styles.bentoBadge, { backgroundColor: Colors.goldLight }]}>
                <Text style={[styles.bentoBadgeText, { color: Colors.goldDark }]}>Pure Indian</Text>
              </View>
            </View>
            <View style={[styles.bentoIconCircle, { backgroundColor: Colors.goldLight }]}>
              <Wheat size={26} color={Colors.goldDark} />
            </View>
          </TouchableOpacity>

          {/* Card 2: Pure Atta / Flours */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sales/products' as any)}
            style={[styles.bentoCard, styles.bentoAtta]}
          >
            <View style={styles.bentoTextCol}>
              <Text style={styles.bentoTitle}>Pure Atta</Text>
              <Text style={styles.bentoSub}>Chakki stone ground</Text>
              <View style={[styles.bentoBadge, { backgroundColor: Colors.secondaryLight }]}>
                <Text style={[styles.bentoBadgeText, { color: Colors.secondary }]}>100% Whole</Text>
              </View>
            </View>
            <View style={[styles.bentoIconCircle, { backgroundColor: Colors.secondaryLight }]}>
              <Sparkles size={26} color={Colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Card 3: Royal Spices */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sales/products' as any)}
            style={[styles.bentoCard, styles.bentoSpices]}
          >
            <View style={styles.bentoTextCol}>
              <Text style={styles.bentoTitle}>Royal Spices</Text>
              <Text style={styles.bentoSub}>Turmeric, chilli & blends</Text>
              <View style={[styles.bentoBadge, { backgroundColor: Colors.primaryLight }]}>
                <Text style={[styles.bentoBadgeText, { color: Colors.primary }]}>Aromatic</Text>
              </View>
            </View>
            <View style={[styles.bentoIconCircle, { backgroundColor: Colors.primaryLight }]}>
              <Flame size={26} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Card 4: Edible Oils & More */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sales/products' as any)}
            style={[styles.bentoCard, styles.bentoOils]}
          >
            <View style={styles.bentoTextCol}>
              <Text style={styles.bentoTitle}>Edible Oils</Text>
              <Text style={styles.bentoSub}>Mustard, groundnut</Text>
              <View style={[styles.bentoBadge, { backgroundColor: Colors.goldLight }]}>
                <Text style={[styles.bentoBadgeText, { color: Colors.goldDark }]}>Cold Pressed</Text>
              </View>
            </View>
            <View style={[styles.bentoIconCircle, { backgroundColor: Colors.goldLight }]}>
              <Droplets size={26} color={Colors.goldDark} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 5. Action Card ("Enroll New Retail Store") ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/sales/stores/add' as any)}
          style={styles.actionCard}
        >
          <View style={styles.actionIconBox}>
            <Package size={26} color={Colors.primary} />
          </View>

          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Enroll New Retail Store</Text>
            <Text style={styles.actionSubtitle}>Register retail outlet & assign credit limit</Text>
          </View>

          <View style={styles.actionArrowBtn}>
            <ArrowRight size={18} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* ── 6. Beat Bestsellers Carousel (Real Data from Database) ── */}
        {bestsellers.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Beat Bestsellers</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/sales/products' as any)}
              >
                <Text style={styles.viewAllText}>See all &gt;</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bestsellerScroll}
            >
              {bestsellers.map((item: Product) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/sales/products/${item.id}` as any)}
                  style={styles.bestsellerCard}
                >
                  <View style={styles.bestsellerImgWrap}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.bestsellerImg} contentFit="cover" />
                    ) : (
                      <View style={styles.bestsellerImgPlaceholder}>
                        <Package size={32} color={Colors.textTertiary} />
                      </View>
                    )}

                    <View style={styles.ratingBadge}>
                      <Star size={11} color={Colors.gold} fill={Colors.gold} />
                      <Text style={styles.ratingText}>4.9</Text>
                    </View>
                  </View>

                  <View style={styles.bestsellerInfo}>
                    <Text style={styles.bestsellerName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.bestsellerPack}>{item.pack_size || item.unit}</Text>

                    <View style={styles.bestsellerBottom}>
                      <View>
                        <Text style={styles.bestsellerPrice}>₹{item.selling_price}</Text>
                        {item.mrp > item.selling_price && (
                          <Text style={styles.bestsellerMrp}>₹{item.mrp}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: '/sales/orders/create' as any,
                            params: { productId: item.id },
                          })
                        }
                        style={styles.addCircleBtn}
                      >
                        <Plus size={16} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── 7. Retail Outlets on Beat ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Retail Outlets on Beat</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/sales/(tabs)/stores')}
          >
            <Text style={styles.viewAllText}>See all &gt;</Text>
          </TouchableOpacity>
        </View>

        {stores.slice(0, 3).map((store: Store) => (
          <TouchableOpacity
            key={store.id}
            activeOpacity={0.8}
            onPress={() => router.push(`/sales/stores/${store.id}` as any)}
            style={styles.storeCard}
          >
            <View style={styles.storeCardTop}>
              <View style={styles.storeAvatarBox}>
                <Text style={styles.storeAvatarText}>
                  {store.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.storeInfoCol}>
                <Text style={styles.storeName} numberOfLines={1}>
                  {store.name}
                </Text>
                <Text style={styles.storeOwner} numberOfLines={1}>
                  {store.owner_name} • {store.store_type || 'Supermarket'}
                </Text>
                <View style={styles.storeLocRow}>
                  <MapPin size={12} color={Colors.textTertiary} />
                  <Text style={styles.storeAreaText} numberOfLines={1}>
                    {store.area}, {store.city}
                  </Text>
                </View>
              </View>

              <View style={styles.creditPill}>
                <Text style={styles.creditPillLabel}>Credit</Text>
                <Text style={styles.creditPillVal}>
                  ₹{(store.credit_limit || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.storeActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/sales/stores/visit' as any,
                    params: { storeId: store.id },
                  })
                }
                style={styles.storeCheckInBtn}
              >
                <Navigation size={13} color={Colors.primary} />
                <Text style={styles.storeCheckInText}>Check In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/sales/orders/create' as any,
                    params: { storeId: store.id },
                  })
                }
                style={styles.storeOrderBtn}
              >
                <ShoppingBag size={13} color={Colors.white} />
                <Text style={styles.storeOrderText}>Book Order</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── 8. Live GPS Transmission Status ── */}
        <View style={styles.gpsBar}>
          <View style={styles.gpsDotActive} />
          <Text style={styles.gpsText}>
            {isTracking
              ? `GPS Live Transmission: ${currentCoords ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}` : 'Active'}`
              : 'GPS Tracking Active • Central Dispatch'}
          </Text>
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

  // Modal Backdrop & Dropdown Card
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
    ...Typography.buttonSm,
    color: Colors.white,
    fontWeight: '700',
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },

  // Pill Search Bar
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    ...Shadows.xs,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    flex: 1,
  },
  searchCameraBtn: {
    padding: 4,
  },

  // Tracker Card ("Being prepared" in reference)
  trackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  trackerIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackerInfo: {
    flex: 1,
  },
  trackerTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  trackerSubtitle: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trackerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackerEta: {
    ...Typography.captionSm,
    fontWeight: '700',
    color: Colors.goldDark,
  },

  // 2x2 Bento Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  bentoCard: {
    width: '48%',
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    minHeight: 125,
    justifyContent: 'space-between',
    ...Shadows.xs,
  },
  bentoGrains: {
    backgroundColor: '#FAF4E8',
    borderColor: '#F1E3CB',
  },
  bentoAtta: {
    backgroundColor: '#F0F7F2',
    borderColor: '#D8ECE0',
  },
  bentoSpices: {
    backgroundColor: '#FCF2F3',
    borderColor: '#F6D9DC',
  },
  bentoOils: {
    backgroundColor: '#FDF8EB',
    borderColor: '#F6ECCF',
  },
  bentoTextCol: {
    gap: 2,
  },
  bentoTitle: {
    ...Typography.h4,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  bentoSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  bentoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  bentoBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bentoIconCircle: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  // Wide Action Card ("Send a parcel" in reference)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    ...Shadows.xs,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.h4,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  actionSubtitle: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  viewAllText: {
    ...Typography.buttonSm,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Bestsellers Carousel
  bestsellerScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  bestsellerCard: {
    width: 170,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  bestsellerImgWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: Colors.surfaceSecondary,
  },
  bestsellerImg: {
    width: '100%',
    height: '100%',
  },
  bestsellerImgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    ...Shadows.xs,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  bestsellerInfo: {
    padding: 10,
  },
  bestsellerName: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 32,
  },
  bestsellerPack: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  bestsellerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bestsellerPrice: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  bestsellerMrp: {
    fontSize: 10,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  addCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },

  // Store Cards
  storeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    ...Shadows.xs,
  },
  storeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeAvatarText: {
    ...Typography.labelLg,
    color: Colors.primary,
    fontWeight: '800',
  },
  storeInfoCol: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  storeOwner: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
  },
  storeLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  storeAreaText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontSize: 10.5,
  },
  creditPill: {
    alignItems: 'flex-end',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  creditPillLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  creditPillVal: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  storeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  storeCheckInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  storeCheckInText: {
    ...Typography.buttonSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  storeOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: Radius.md,
    ...Shadows.xs,
  },
  storeOrderText: {
    ...Typography.buttonSm,
    color: Colors.white,
    fontWeight: '700',
  },

  // Live GPS Telemetry
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  gpsDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  gpsText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontSize: 10.5,
  },
});
