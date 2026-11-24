import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Order } from '@/types';

interface OrderDetailHeaderProps {
  order: Order;
}

export const OrderDetailHeader: React.FC<OrderDetailHeaderProps> = ({ order }) => {
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';
  const isRejected = order.status === 'rejected';
  const isDelivered = order.status === 'delivered';

  return (
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
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
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
    color: Colors.secondaryDark,
    fontWeight: '700',
  },
  confirmedDesc: {
    ...Typography.captionSm,
    color: Colors.secondaryDark,
    marginTop: 2,
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
    color: Colors.secondaryDark,
    fontWeight: '700',
  },
  deliveredDesc: {
    ...Typography.captionSm,
    color: Colors.secondaryDark,
    marginTop: 2,
  },
});
