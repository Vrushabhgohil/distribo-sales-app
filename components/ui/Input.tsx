import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
}

export const Input = forwardRef<any, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      size = 'lg',
      style,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const isLarge = size === 'lg';

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputWrapper,
            isLarge && styles.inputWrapperLg,
            isFocused && styles.inputWrapperFocused,
            !!error && styles.inputWrapperError,
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            placeholderTextColor={Colors.textTertiary}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              isLarge && styles.inputLg,
              leftIcon ? { paddingLeft: 4 } : {},
              rightIcon ? { paddingRight: 4 } : {},
              style,
            ]}
            {...rest}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceTertiary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputWrapperLg: {
    minHeight: 52,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  inputLg: {
    ...Typography.bodyLg,
    paddingVertical: 12,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  errorText: {
    ...Typography.captionMd,
    color: Colors.error,
    marginTop: 6,
    fontWeight: '600',
  },
  helperText: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    marginTop: 6,
  },
});
