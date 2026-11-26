import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
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
  Truck,
  CreditCard,
  ShieldCheck,
  FileText,
  Download,
  Share2,
} from 'lucide-react-native';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/CustomAlert';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useOrder } from '@/features/hooks/useMotibaQueries';
import { OrderDetailHeader } from '@/components/orders/OrderDetailHeader';
import { OrderDetailItemsList } from '@/components/orders/OrderDetailItemsList';
import { InvoicePreviewModal } from '@/components/orders/InvoicePreviewModal';
import { invoiceService } from '@/services/invoice-service';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingInvoice, setSharingInvoice] = useState(false);

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

        {/* Invoice Card */}
        <View style={styles.card}>
          <View style={styles.invoiceHeaderRow}>
            <View>
              <Text style={[styles.sectionHeading, { marginBottom: 2 }]}>Order Invoice</Text>
              <Text style={styles.storeOwner}>
                Invoice #: {invoiceService.getInvoiceNumber(order)}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setInvoiceVisible(true)}
              style={styles.viewInvoiceBtn}
            >
              <FileText size={14} color={Colors.primary} />
              <Text style={styles.viewInvoiceText}>View Invoice</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.invoiceActionsRow}>
            <Button
              title="Download PDF"
              variant="outline"
              size="sm"
              loading={downloadingPdf}
              icon={<Download size={14} color={Colors.primary} />}
              onPress={async () => {
                setDownloadingPdf(true);
                const res = await invoiceService.printOrDownloadPdf(order);
                setDownloadingPdf(false);
                if (!res.success) {
                  Alert.alert('PDF Error', res.error || 'Unable to generate PDF invoice.');
                }
              }}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Share Invoice"
              variant="secondary"
              size="sm"
              loading={sharingInvoice}
              icon={<Share2 size={14} color={Colors.primary} />}
              onPress={async () => {
                setSharingInvoice(true);
                const res = await invoiceService.shareInvoice(order);
                setSharingInvoice(false);
                if (!res.success) {
                  Alert.alert('Share Error', res.error || 'Unable to share invoice.');
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
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

      <InvoicePreviewModal
        visible={invoiceVisible}
        order={order}
        onClose={() => setInvoiceVisible(false)}
      />
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
    color: Colors.textTertiary,
    marginTop: 2,
  },
  callStoreBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  viewInvoiceText: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 12,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
