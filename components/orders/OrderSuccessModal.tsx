import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock, FileText, Share2 } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/CustomAlert';
import { Order } from '@/types';
import { invoiceService } from '@/services/invoice-service';
import { InvoicePreviewModal } from './InvoicePreviewModal';

interface OrderSuccessModalProps {
  order: Order | null;
  onDismiss: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onDismiss }) => {
  const router = useRouter();
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  useEffect(() => {
    if (order) {
      invoiceService.ensureInvoiceForOrder(order).then((inv) => {
        setInvoiceNumber(inv.invoiceNumber);
      });
    } else {
      setInvoiceVisible(false);
      setInvoiceNumber('');
    }
  }, [order]);

  if (!order) return null;

  const displayInvoiceNumber = invoiceNumber || invoiceService.getInvoiceNumber(order);

  const handleQuickShare = async () => {
    setSharing(true);
    const res = await invoiceService.shareInvoice(order);
    setSharing(false);
    if (!res.success) {
      Alert.alert('Share Failed', res.error || 'Unable to share invoice.');
    }
  };

  return (
    <>
      <Modal visible={Boolean(order)} transparent animationType="fade" onRequestClose={onDismiss}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={44} color={Colors.secondary} />
            </View>
            <Text style={styles.title}>Order Booked!</Text>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Text style={styles.invoiceRef}>Invoice Generated: {displayInvoiceNumber}</Text>
            <Text style={styles.message}>
              Order submitted for Central Admin approval. Your invoice has been automatically generated and linked.
            </Text>

            <View style={styles.statusPill}>
              <Clock size={14} color={Colors.goldDark} />
              <Text style={styles.statusText}>PENDING ADMIN CONFIRMATION</Text>
            </View>

            <View style={styles.actions}>
              <View style={styles.invoiceRow}>
                <Button
                  title="View / PDF"
                  variant="secondary"
                  size="md"
                  icon={<FileText size={15} color={Colors.primary} />}
                  onPress={() => setInvoiceVisible(true)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Share"
                  variant="outline"
                  size="md"
                  loading={sharing}
                  icon={<Share2 size={15} color={Colors.primary} />}
                  onPress={handleQuickShare}
                  style={{ flex: 1 }}
                />
              </View>
              <Button
                title="View Order Details"
                variant="primary"
                size="md"
                onPress={() => {
                  onDismiss();
                  router.replace(`/sales/orders/${order.id}` as any);
                }}
                style={{ marginBottom: 10 }}
              />
              <Button
                title="Back to Orders"
                variant="outline"
                size="md"
                onPress={() => {
                  onDismiss();
                  router.replace('/sales/(tabs)/orders' as any);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <InvoicePreviewModal
        visible={invoiceVisible}
        order={order}
        onClose={() => setInvoiceVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  orderNumber: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 16,
    marginTop: 4,
  },
  message: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.goldDark,
  },
  actions: {
    width: '100%',
  },
  invoiceRef: {
    ...Typography.captionBold,
    color: Colors.secondary,
    marginTop: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
});
