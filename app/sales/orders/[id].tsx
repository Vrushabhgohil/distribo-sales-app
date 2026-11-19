import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Store as StoreIcon,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Repeat,
  Package,
  ShieldCheck,
  ArrowLeft,
  Truck,
  Phone,
  CreditCard,
  FileText,
  RefreshCw,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { dataService } from '@/services/data-service';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => dataService.getOrderById(id!),
    enabled: !!id,
  });

  const handleCallStore = (phone?: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  // 1. Loading State
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
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.loadingText}>Fetching order information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Error or Empty State
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
              icon={<RefreshCw size={16} color={Colors.primaryDark} />}
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

  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';
  const isRejected = order.status === 'rejected';
  const isDelivered = order.status === 'delivered';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isReady = order.status === 'ready_for_delivery';

  // Delivery status calculation
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

  const totalItemsCount = order.items?.reduce((acc, it) => acc + (it.quantity || 0), 0) || 0;

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
            colors={[Colors.primaryDark]}
          />
        }
      >
        {/* Status Header Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.orderTimestamp}>
                Booked on {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <StatusBadge status={order.status} size="md" />
          </View>

          {/* Workflow Status Notice */}
          {isPending && (
            <View style={styles.pendingNotice}>
              <Clock size={16} color={Colors.goldDark} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.pendingTitle}>Pending Admin Approval</Text>
                <Text style={styles.pendingDesc}>
                  Order is submitted and awaiting central admin verification of inventory and credit limits.
                </Text>
              </View>
            </View>
          )}

          {isConfirmed && (
            <View style={styles.confirmedNotice}>
              <CheckCircle2 size={16} color={Colors.secondary} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.confirmedTitle}>Approved by Central Admin</Text>
                <Text style={styles.confirmedDesc}>
                  Order is verified and scheduled for packing and dispatch from central warehouse.
                </Text>
              </View>
            </View>
          )}

          {isRejected && (
            <View style={styles.rejectedNotice}>
              <AlertCircle size={16} color={Colors.error} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.rejectedTitle}>Order Rejected</Text>
                <Text style={styles.rejectedDesc}>
                  Reason: {order.rejection_reason || 'Credit limit exceeded or inventory shortage.'}
                </Text>
              </View>
            </View>
          )}

          {isDelivered && (
            <View style={styles.deliveredNotice}>
              <CheckCircle2 size={16} color={Colors.secondary} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.deliveredTitle}>Order Delivered</Text>
                <Text style={styles.deliveredDesc}>
                  Products delivered to retail outlet and recorded in store ledger.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Store Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Store Information</Text>
          <View style={styles.storeRow}>
            <View style={styles.storeIconBox}>
              <StoreIcon size={20} color={Colors.primaryDark} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.storeName}>{order.store?.name || 'Retail Outlet'}</Text>
              {order.store?.owner_name && (
                <Text style={styles.storeOwner}>Owner: {order.store.owner_name}</Text>
              )}
              <Text style={styles.storeAddress}>
                {[order.store?.address, order.store?.area, order.store?.city].filter(Boolean).join(', ') || 'Address not available'}
              </Text>
            </View>

            {order.store?.mobile && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleCallStore(order.store?.mobile)}
                style={styles.callStoreBtn}
              >
                <Phone size={16} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Product Items Breakdown */}
        <View style={styles.card}>
          <View style={styles.itemsHeadingRow}>
            <Text style={styles.sectionHeading}>
              Ordered Products ({order.items?.length || 0} lines, {totalItemsCount} units)
            </Text>
          </View>

          {order.items && order.items.length > 0 ? (
            order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                {item.product?.image_url ? (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productPlaceholder}>
                    <Package size={20} color={Colors.primaryDark} />
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Product Item'}</Text>
                  <Text style={styles.itemMeta}>
                    SKU: {item.product?.sku || 'N/A'} • Unit: {item.product?.unit || item.product?.pack_size || 'Pack'}
                  </Text>
                  <Text style={styles.itemQtyPrice}>
                    Qty: {item.quantity} × ₹{item.unit_price}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemTotal}>₹{item.total_price?.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItemsText}>No products recorded in this order.</Text>
          )}

          <View style={styles.divider} />

          {/* Pricing Summary */}
          <Text style={[styles.sectionHeading, { marginBottom: 8 }]}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={styles.summaryVal}>{totalItemsCount} units</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>₹{order.total_amount?.toLocaleString('en-IN')}</Text>
          </View>

          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount Applied</Text>
              <Text style={[styles.summaryVal, { color: Colors.success }]}>
                -₹{order.discount_amount?.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {order.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Applicable GST Tax</Text>
              <Text style={styles.summaryVal}>₹{order.tax_amount?.toLocaleString('en-IN')}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.finalTotalRow]}>
            <Text style={styles.totalLabel}>Final Order Amount</Text>
            <Text style={styles.totalValue}>₹{order.total_amount?.toLocaleString('en-IN')}</Text>
          </View>
        </View>

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
            })
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
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    marginTop: 12,
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  orderTimestamp: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldLight,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.goldTint,
  },
  pendingTitle: {
    ...Typography.labelSm,
    color: Colors.goldDark,
    fontWeight: '700',
  },
  pendingDesc: {
    ...Typography.captionSm,
    color: Colors.goldDark,
    marginTop: 2,
  },
  confirmedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.secondaryTint,
  },
  confirmedTitle: {
    ...Typography.labelSm,
    color: Colors.secondary,
    fontWeight: '700',
  },
  confirmedDesc: {
    ...Typography.captionSm,
    color: Colors.secondary,
    marginTop: 2,
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  rejectedTitle: {
    ...Typography.labelSm,
    color: Colors.error,
    fontWeight: '700',
  },
  rejectedDesc: {
    ...Typography.captionSm,
    color: Colors.error,
    marginTop: 2,
  },
  deliveredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.secondaryTint,
  },
  deliveredTitle: {
    ...Typography.labelSm,
    color: Colors.secondary,
    fontWeight: '700',
  },
  deliveredDesc: {
    ...Typography.captionSm,
    color: Colors.secondary,
    marginTop: 2,
  },
  sectionHeading: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  storeOwner: {
    ...Typography.captionMd,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  storeAddress: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  callStoreBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...Shadows.xs,
  },
  itemsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  productImage: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  productPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  itemMeta: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemQtyPrice: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptyItemsText: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  summaryVal: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  finalTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  totalValue: {
    ...Typography.h2,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  infoGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  infoGridLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: 120,
  },
  infoGridValue: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  notesBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
  },
  notesLabel: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  notesText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  reorderBtn: {
    marginTop: 4,
  },
});
