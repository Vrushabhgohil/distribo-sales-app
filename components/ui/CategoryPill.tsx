import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface CategoryPillProps {
  label: string;
  count?: number;
  isSelected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  label,
  count,
  isSelected = false,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.pill,
        isSelected ? styles.pillActive : styles.pillInactive,
        style,
      ]}
    >
      <Text style={[styles.text, isSelected ? styles.textActive : styles.textInactive]}>
        {label}
      </Text>
      {count !== undefined && (
        <Text style={[styles.count, isSelected ? styles.countActive : styles.countInactive]}>
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    marginRight: 8,
    gap: 6,
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    ...Typography.labelSm,
  },
  textActive: {
    color: Colors.white,
  },
  textInactive: {
    color: Colors.textSecondary,
  },
  count: {
    ...Typography.captionSm,
    fontWeight: '700',
  },
  countActive: {
    color: Colors.gold,
  },
  countInactive: {
    color: Colors.textTertiary,
  },
});
