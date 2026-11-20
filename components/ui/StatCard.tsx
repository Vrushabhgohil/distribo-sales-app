import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';

interface StatCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  value: string | number;
  label: string;
  subtitle?: string;
  trend?: { value: string; positive?: boolean };
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'highlight' | 'compact';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBgColor = Colors.primaryLight,
  value,
  label,
  subtitle,
  trend,
  onPress,
  style,
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';
  const isHighlight = variant === 'highlight';

  const content = (
    <View
      style={[
        styles.card,
        isHighlight && styles.highlightCard,
        isCompact && styles.compactCard,
        style,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
        {icon}
      </View>

      <View style={styles.textGroup}>
        <Text style={[styles.value, isHighlight && styles.highlightValue]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.label, isHighlight && styles.highlightLabel]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle && !isCompact && (
          <Text style={[styles.subtitle, isHighlight && styles.highlightSubtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.positive ? Colors.successLight : Colors.errorLight }]}>
            <Text style={[styles.trendText, { color: trend.positive ? Colors.success : Colors.error }]}>
              {trend.value}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width: '48%' }}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ width: '48%' }}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.xs,
  },
  highlightCard: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  compactCard: {
    padding: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textGroup: {
    gap: 2,
  },
  value: {
    ...Typography.statLg,
    color: Colors.textPrimary,
  },
  highlightValue: {
    color: Colors.white,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
  },
  highlightLabel: {
    color: Colors.warmIvory,
    opacity: 0.95,
  },
  subtitle: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  highlightSubtitle: {
    color: Colors.gold,
  },
  trendBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  trendText: {
    ...Typography.captionSm,
    fontWeight: '700',
  },
});
