import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Order } from '@/types';

interface OrderSuccessModalProps {
  order: Order | null;
  onDismiss: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onDismiss }) => {
  const router = useRouter();

  if (!order) return null;

  return (
    <Modal visible={Boolean(order)} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <CheckCircle2 size={44} color={Colors.secondary} />
          </View>
          <Text style={styles.title}>Order Booked!</Text>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <Text style={styles.message}>
            Order submitted for Central Admin approval. Stock will be reserved once confirmed.
          </Text>

          <View style={styles.statusPill}>
            <Clock size={14} color={Colors.goldDark} />
            <Text style={styles.statusText}>PENDING APPROVAL</Text>
          </View>

          <View style={styles.actions}>
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
});
