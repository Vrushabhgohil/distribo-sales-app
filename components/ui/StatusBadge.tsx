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
  pending: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  confirmed: { bg: Colors.successLight, text: Colors.success, dot: '#22C55E' },
  processing: { bg: Colors.infoLight, text: Colors.info, dot: '#3B82F6' },
  ready_for_delivery: { bg: '#F0FDFA', text: '#0D9488', dot: '#14B8A6' },
  out_for_delivery: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' },
  partially_delivered: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  delivered: { bg: Colors.successLight, text: Colors.success, dot: '#22C55E' },
  rejected: { bg: Colors.errorLight, text: Colors.error, dot: '#EF4444' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  active: { bg: Colors.successLight, text: Colors.success, dot: '#22C55E' },
  inactive: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  overdue: { bg: Colors.errorLight, text: Colors.error, dot: '#EF4444' },
  completed: { bg: Colors.successLight, text: Colors.success, dot: '#22C55E' },
  payment_pending: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  paid: { bg: Colors.successLight, text: Colors.success, dot: '#22C55E' },
  low: { bg: '#F0F9FF', text: '#0369A1', dot: '#38BDF8' },
  medium: { bg: '#FFFBEB', text: '#B45309', dot: '#FBBF24' },
  high: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  urgent: { bg: Colors.errorLight, text: Colors.error, dot: '#EF4444' },
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

