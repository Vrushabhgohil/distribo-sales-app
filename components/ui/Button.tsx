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
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
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
      container: { backgroundColor: Colors.primaryDark, ...Shadows.sm },
      text: { color: Colors.white },
      loaderColor: Colors.white,
    },
    secondary: {
      container: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '40' },
      text: { color: Colors.primaryDark },
      loaderColor: Colors.primaryDark,
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
      container: { backgroundColor: Colors.error, ...Shadows.sm },
      text: { color: Colors.white },
      loaderColor: Colors.white,
    },
    success: {
      container: { backgroundColor: Colors.success, ...Shadows.sm },
      text: { color: Colors.white },
      loaderColor: Colors.white,
    },
  };

  const sizeStyles: Record<string, { container: ViewStyle; text: TextStyle; iconGap: number }> = {
    sm: {
      container: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, borderRadius: Radius.sm },
      text: Typography.buttonSm,
      iconGap: 5,
    },
    md: {
      container: { paddingVertical: 12, paddingHorizontal: 18, minHeight: 46, borderRadius: Radius.md },
      text: Typography.buttonMd,
      iconGap: 6,
    },
    lg: {
      container: { paddingVertical: 15, paddingHorizontal: 24, minHeight: 52, borderRadius: Radius.lg },
      text: Typography.buttonLg,
      iconGap: 8,
    },
    xl: {
      container: { paddingVertical: 17, paddingHorizontal: 28, minHeight: 56, borderRadius: Radius.xl },
      text: Typography.buttonLg,
      iconGap: 8,
    },
  };

  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        v.container,
        s.container,
        !fullWidth && { alignSelf: 'flex-start' },
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.loaderColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={{ marginRight: s.iconGap }}>{icon}</View>}
          <Text style={[v.text, s.text, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={{ marginLeft: s.iconGap }}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
