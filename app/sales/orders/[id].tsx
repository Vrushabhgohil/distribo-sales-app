import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Repeat,
  Store as StoreIcon,
  Phone,
  Navigation,
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  FileText,
} from 'lucide-react-native';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useOrder } from '@/features/hooks/useMotibaQueries';
import { OrderDetailHeader } from '@/components/orders/OrderDetailHeader';
import { OrderDetailItemsList } from '@/components/orders/OrderDetailItemsList';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useOrder(id);

  const handleCallStore = (phone?: string | null) => {
    if (phone) {
      const sanitized = encodeURIComponent(phone.trim().replace(/[^\d+]/g, ''));
      Linking.openURL(`tel:${sanitized}`);
    }
  };

  const handleOpenDirections = () => {
    const store = order?.store;
    if (!store) return;

    if (store.gps_lat && store.gps_lng) {
      const lat = encodeURIComponent(String(store.gps_lat));
      const lng = encodeURIComponent(String(store.gps_lng));
      const label = encodeURIComponent(store.name || 'Store Location');
      const scheme = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${label})`,
      });
      if (scheme) {
        Linking.canOpenURL(scheme)
          .then((supported) => {
            if (supported) {
              Linking.openURL(scheme);
            } else {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
            }
          })
          .catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
          });
        return;
      }
    }

    const addressParts = [store.name, store.address, store.area, store.city, store.pincode].filter(Boolean);
    if (addressParts.length > 0) {
      const query = encodeURIComponent(addressParts.join(', '));
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Order Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContainer}>
          <MotibaLoader size="large" message="Fetching order information..." />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Order Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContainer}>
          <View style={styles.errorIconBox}>
            <AlertCircle size={40} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Order Details Unavailable</Text>
          <Text style={styles.errorSubtitle}>
            We could not retrieve details for this order. It may have been updated or the ID is invalid.
          </Text>
          <View style={styles.errorActions}>
            <Button
              title="Try Again"
              variant="outline"
              size="md"
              icon={<RefreshCw size={16} color={Colors.primary} />}
              onPress={() => refetch()}
              style={{ marginRight: 10 }}
            />
            <Button
              title="Back to Orders"
              variant="primary"
              size="md"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isReady = order.status === 'ready_for_delivery';
  const isConfirmed = order.status === 'confirmed';
  const isRejected = order.status === 'rejected';

  const deliveryStatusText = isDelivered
    ? 'Delivered to Outlet'
    : isOutForDelivery
    ? 'Out for Delivery'
    : isReady
    ? 'Ready for Dispatch'
    : isConfirmed
    ? 'Warehouse Allocation in Progress'
    : isRejected
    ? 'Cancelled / Rejected'
    : 'Awaiting Admin Approval';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={order.order_number}
        subtitle={`Placed on ${new Date(order.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={async () => {
              await refetch();
            }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Status Header Card */}
        <OrderDetailHeader order={order} />

        {/* Store Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Store Information</Text>
          <View style={styles.storeRow}>
            <View style={styles.storeIconBox}>
              <StoreIcon size={20} color={Colors.primary} />
            </View>
            <View style={{ marginLeft: 12, flex: 1, paddingRight: 8 }}>
              <Text style={styles.storeName}>{order.store?.name || 'Retail Outlet'}</Text>
              {order.store?.owner_name && (
                <Text style={styles.storeOwner}>Owner: {order.store.owner_name}</Text>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenDirections}
                style={styles.addressRow}
              >
                <MapPin size={13} color={Colors.primary} style={{ marginRight: 4, marginTop: 1 }} />
                <Text style={styles.storeAddress} numberOfLines={2}>
                  {[order.store?.address, order.store?.area, order.store?.city].filter(Boolean).join(', ') || 'Address not available'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.storeActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenDirections}
                style={styles.directionsBtn}
                accessibilityLabel="Navigate to store location"
              >
                <Navigation size={16} color={Colors.white} />
              </TouchableOpacity>

              {order.store?.mobile && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleCallStore(order.store?.mobile)}
                  style={styles.callStoreBtn}
                  accessibilityLabel="Call store"
                >
                  <Phone size={16} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Product Items Breakdown */}
        <OrderDetailItemsList
          items={order.items || []}
          totalAmount={order.total_amount || 0}
          discountAmount={order.discount_amount}
          taxAmount={order.tax_amount}
        />

        {/* Additional Status & Delivery Info */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Additional Information</Text>

          <View style={styles.infoGridRow}>
            <Truck size={16} color={Colors.textTertiary} />
            <Text style={styles.infoGridLabel}>Delivery Status:</Text>
            <Text style={styles.infoGridValue}>{deliveryStatusText}</Text>
          </View>

          {order.store?.payment_terms && (
            <View style={styles.infoGridRow}>
              <CreditCard size={16} color={Colors.textTertiary} />
              <Text style={styles.infoGridLabel}>Payment Terms:</Text>
              <Text style={styles.infoGridValue}>{order.store.payment_terms}</Text>
            </View>
          )}

          {order.store?.credit_limit !== undefined && (
            <View style={styles.infoGridRow}>
              <ShieldCheck size={16} color={Colors.textTertiary} />
              <Text style={styles.infoGridLabel}>Store Credit Limit:</Text>
              <Text style={styles.infoGridValue}>₹{order.store.credit_limit?.toLocaleString('en-IN')}</Text>
            </View>
          )}

          {order.notes && (
            <View style={styles.notesBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FileText size={14} color={Colors.textSecondary} />
                <Text style={styles.notesLabel}>Order & Dispatch Notes</Text>
              </View>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Repeat / Reorder Action */}
        <Button
          title="Repeat This Order"
          variant="primary"
          size="xl"
          icon={<Repeat size={18} color={Colors.white} />}
          onPress={() =>
            router.push({
              pathname: '/sales/orders/reorder' as any,
              params: { orderId: order.id },
            } as any)
          }
          style={styles.reorderBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  errorSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  storeOwner: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storeAddress: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  storeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionsBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  callStoreBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  infoGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  infoGridLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    minWidth: 120,
  },
  infoGridValue: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  notesBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
  },
  notesLabel: {
    ...Typography.captionSm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  notesText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
  },
  reorderBtn: {
    marginTop: 8,
  },
});
