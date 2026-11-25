import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, Radius, Shadows } from '@/constants/theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'flat' | 'outlined' | 'tinted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  onPress,
  ...rest
}) => {
  const variantStyle: Record<string, ViewStyle> = {
    default: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.xs },
    elevated: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm },
    flat: { backgroundColor: Colors.surfaceSecondary },
    outlined: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    tinted: { backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primary + '15' },
  };

  const paddingStyle: Record<string, ViewStyle> = {
    none: {},
    sm: { padding: 12 },
    md: { padding: 16 },
    lg: { padding: 20 },
  };

  const resolvedVariant = variantStyle[variant] || variantStyle.elevated;
  const resolvedPadding = paddingStyle[padding] || paddingStyle.md;

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.base, resolvedVariant, resolvedPadding, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.base, resolvedVariant, resolvedPadding, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    marginBottom: 12,
  },
});
