import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Package } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  message?: string;
  actionTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  message,
  actionTitle,
  actionLabel,
  onAction,
  style,
}) => {
  const resolvedDescription = description || message;
  const resolvedActionTitle = actionTitle || actionLabel;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon || <Package size={32} color={Colors.textTertiary} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      {resolvedDescription ? <Text style={styles.description}>{resolvedDescription}</Text> : null}
      {resolvedActionTitle && onAction ? (
        <Button
          title={resolvedActionTitle}
          variant="primary"
          size="md"
          fullWidth={false}
          onPress={onAction}
          style={{ marginTop: 16, paddingHorizontal: 28, alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
