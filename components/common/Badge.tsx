import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { DeliveryAssignmentStatus, OrderStatus } from '@/types';

interface BadgeProps {
  status: DeliveryAssignmentStatus | OrderStatus | string;
  label?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, style }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'assigned':
      case 'ready_for_delivery':
      case 'processing':
        return {
          bg: Colors.goldLight,
          text: Colors.goldDark,
          border: Colors.goldTint,
          display: label || 'Pending Pickup',
        };
      case 'in_transit':
      case 'out_for_delivery':
        return {
          bg: Colors.goldLight,
          text: Colors.goldDark,
          border: Colors.goldTint,
          display: label || 'Out For Delivery',
        };
      case 'delivered':
        return {
          bg: Colors.secondaryLight,
          text: Colors.secondary,
          border: Colors.secondaryTint,
          display: label || 'Delivered',
        };
      case 'partially_delivered':
        return {
          bg: Colors.primaryLight,
          text: Colors.primary,
          border: Colors.primaryTint,
          display: label || 'Partially Delivered',
        };
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return {
          bg: Colors.primaryLight,
          text: Colors.primary,
          border: Colors.primaryTint,
          display: label || 'Failed / Rejected',
        };
      case 'confirmed':
        return {
          bg: Colors.secondaryLight,
          text: Colors.secondary,
          border: Colors.secondaryTint,
          display: label || 'Approved / Confirmed',
        };
      default:
        return {
          bg: Colors.surfaceSecondary,
          text: Colors.textSecondary,
          border: Colors.border,
          display: label || status,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: config.text }]}>{config.display}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

