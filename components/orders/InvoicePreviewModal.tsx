import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Download, FileText } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/CustomAlert';
import { Order } from '@/types';
import { invoiceService } from '@/services/invoice-service';

interface InvoicePreviewModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  visible,
  order,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!order) return null;

  const invoiceNumber = invoiceService.getInvoiceNumber(order);
  const items = order.items || [];
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (item.total_price || item.quantity * item.unit_price),
    0
  );
  const discountAmount = order.discount_amount || 0;
  const taxAmount = order.tax_amount || 0;
  const subtotal =
    itemsSubtotal > 0
      ? itemsSubtotal
      : (order.total_amount || 0) + discountAmount - taxAmount;
  const finalTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleDownload = async () => {
    setDownloading(true);
    const res = await invoiceService.printOrDownloadPdf(order);
    setDownloading(false);
    if (!res.success) {
      Alert.alert('Download Failed', res.error || 'Unable to generate PDF invoice.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileText size={20} color={Colors.primary} />
            <View>
              <Text style={styles.headerTitle}>Order Invoice</Text>
              <Text style={styles.headerSub}>{invoiceNumber}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Button
              title="Download PDF"
              variant="primary"
              size="sm"
              fullWidth={false}
              loading={downloading}
              icon={<Download size={14} color={Colors.white} />}
              onPress={handleDownload}
              style={{ marginRight: 8 }}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Invoice Header Card */}
          <View style={styles.card}>
            <View style={styles.logoBrandRow}>
              <Image
                source={require('@/assets/images/invoice-logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>Motiba FMCG Distribution</Text>
                <Text style={styles.metaText}>Aarvi Enterprise • {invoiceNumber}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Order Number</Text>
              <Text style={styles.value}>{order.order_number}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Order Date</Text>
              <Text style={styles.value}>
                {new Date(order.order_date || order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Payment Terms</Text>
              <Text style={styles.value}>{order.store?.payment_terms || 'Per Admin Approval'}</Text>
            </View>
          </View>

          {/* Store / Customer Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Store / Customer Details</Text>
            <Text style={styles.storeName}>{order.store?.name || 'Retail Outlet'}</Text>
            {order.store?.owner_name && (
              <Text style={styles.metaText}>Owner: {order.store.owner_name}</Text>
            )}
            {order.store?.mobile && (
              <Text style={styles.metaText}>Phone: {order.store.mobile}</Text>
            )}
            <Text style={styles.metaText}>
              {[order.store?.address, order.store?.area, order.store?.city, order.store?.pincode]
                .filter(Boolean)
                .join(', ') || 'Address N/A'}
            </Text>
            {order.store?.gst_number && (
              <Text style={styles.metaText}>GSTIN: {order.store.gst_number}</Text>
            )}
          </View>

          {/* Line Items */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items ({items.length})</Text>
            {items.map((item) => (
              <View key={item.id || item.product_id} style={styles.itemRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                  <Text style={styles.metaText}>
                    SKU: {item.product?.sku || 'N/A'} • {item.quantity} × ₹{item.unit_price}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  ₹{(item.total_price || item.quantity * item.unit_price).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Discount</Text>
                <Text style={[styles.value, { color: Colors.secondary }]}>
                  -₹{discountAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Applicable Taxes (GST)</Text>
              <Text style={styles.value}>₹{Math.round(taxAmount).toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.rowBetween, styles.finalRow]}>
              <Text style={styles.finalLabel}>Final Payable Amount</Text>
              <Text style={styles.finalValue}>₹{Math.round(finalTotal).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  headerSub: {
    ...Typography.captionSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandName: {
    ...Typography.h3,
    color: Colors.primary,
  },
  logoBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  logoImg: {
    width: 48,
    height: 48,
  },
  badge: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.goldDark,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  sectionTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 8,
  },
  storeName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  metaText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  label: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemName: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemTotal: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  finalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginBottom: 0,
  },
  finalLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  finalValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
