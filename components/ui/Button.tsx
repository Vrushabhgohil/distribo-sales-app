import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  disabled,
  style,
  textStyle,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle; loaderColor: string }> = {
    primary: {
      container: { backgroundColor: Colors.primary, ...Shadows.sm },
      text: { color: '#FFFFFF' },
      loaderColor: '#FFFFFF',
    },
    secondary: {
      container: { backgroundColor: Colors.goldLight, borderWidth: 1, borderColor: Colors.gold + '50' },
      text: { color: Colors.goldDark, fontWeight: '700' },
      loaderColor: Colors.goldDark,
    },
    dark: {
      container: { backgroundColor: Colors.primaryDark, ...Shadows.sm },
      text: { color: '#FFFFFF' },
      loaderColor: '#FFFFFF',
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },
      text: { color: Colors.textPrimary },
      loaderColor: Colors.textPrimary,
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: Colors.textSecondary },
      loaderColor: Colors.textSecondary,
    },
    danger: {
      container: { backgroundColor: Colors.error },
      text: { color: '#FFFFFF' },
      loaderColor: '#FFFFFF',
    },
    success: {
      container: { backgroundColor: Colors.success },
      text: { color: '#FFFFFF' },
      loaderColor: '#FFFFFF',
    },
  };

  const sizeStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: { height: 36, paddingHorizontal: 12 },
      text: { ...Typography.captionBold, fontSize: 13 },
    },
    md: {
      container: { height: 46, paddingHorizontal: 18 },
      text: { ...Typography.bodyBold, fontSize: 14 },
    },
    lg: {
      container: { height: 52, paddingHorizontal: 22 },
      text: { ...Typography.bodyBold, fontSize: 15 },
    },
    xl: {
      container: { height: 58, paddingHorizontal: 26 },
      text: { ...Typography.heading3, fontSize: 16 },
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        currentSize.container,
        currentVariant.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.loaderColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.textBase, currentSize.text, currentVariant.text, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  textBase: {
    textAlign: 'center',
  },
});
