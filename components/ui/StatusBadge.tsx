import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

type StatusType =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'partially_delivered'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'overdue'
  | 'completed'
  | 'payment_pending'
  | 'paid'
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const STATUS_THEME: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: Colors.goldLight, text: Colors.goldDark, dot: Colors.gold },
  confirmed: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  processing: { bg: Colors.goldLight, text: Colors.goldDark, dot: Colors.gold },
  ready_for_delivery: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  out_for_delivery: { bg: Colors.goldLight, text: Colors.goldDark, dot: Colors.gold },
  partially_delivered: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  delivered: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  rejected: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  cancelled: { bg: Colors.surfaceSecondary, text: Colors.textSecondary, dot: Colors.textTertiary },
  active: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  inactive: { bg: Colors.surfaceSecondary, text: Colors.textSecondary, dot: Colors.textTertiary },
  overdue: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  completed: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  payment_pending: { bg: Colors.goldLight, text: Colors.goldDark, dot: Colors.gold },
  paid: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  low: { bg: Colors.secondaryLight, text: Colors.secondary, dot: Colors.secondary },
  medium: { bg: Colors.goldLight, text: Colors.goldDark, dot: Colors.gold },
  high: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  urgent: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
};

const FRIENDLY_LABELS: Record<string, string> = {
  pending: 'Pending Approval',
  confirmed: 'Approved',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  partially_delivered: 'Partially Delivered',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  active: 'Active',
  inactive: 'Inactive',
  overdue: 'Overdue',
  completed: 'Completed',
};

const formatLabel = (status: string): string => {
  if (FRIENDLY_LABELS[status]) {
    return FRIENDLY_LABELS[status];
  }
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm', style }) => {
  const theme = STATUS_THEME[status] || { bg: Colors.gray100, text: Colors.gray600, dot: Colors.gray400 };
  const displayLabel = label || formatLabel(status);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }, isSmall ? styles.sm : styles.md, style]}>
      <View style={[styles.dot, { backgroundColor: theme.dot }, isSmall && styles.dotSm]} />
      <Text style={[isSmall ? styles.textSm : styles.textMd, { color: theme.text }]}>{displayLabel}</Text>
    </View>
  );
};

// Backwards-compatible alias
export const StatusPill = StatusBadge;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 5,
  },
  md: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  textSm: {
    ...Typography.captionSm,
    fontWeight: '700',
  },
  textMd: {
    ...Typography.captionMd,
    fontWeight: '700',
  },
});

