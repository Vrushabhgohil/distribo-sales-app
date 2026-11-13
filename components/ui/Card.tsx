import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows } from '@/constants/theme';

interface CardProps extends ViewProps {
  style?: ViewStyle;
  variant?: 'elevated' | 'flat' | 'outlined' | 'tinted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  ...rest
}) => {
  const variantStyle: Record<string, ViewStyle> = {
    elevated: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm },
    flat: { backgroundColor: Colors.surfaceSecondary },
    outlined: { backgroundColor: Colors.surface, borderWidth: 1.2, borderColor: Colors.border },
    tinted: { backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primary + '20' },
  };

  const paddingStyle: Record<string, ViewStyle> = {
    none: {},
    sm: { padding: 12 },
    md: { padding: 16 },
    lg: { padding: 20 },
  };

  return (
    <View style={[styles.base, variantStyle[variant], paddingStyle[padding], style]} {...rest}>
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
