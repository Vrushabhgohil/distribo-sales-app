import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, Platform } from 'react-native';
import { Colors, Radius, Shadows, Typography, Spacing } from '@/constants/theme';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showTrackingIndicator?: boolean;
  showLogo?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showTrackingIndicator = false,
  showLogo = true,
  leftAction,
  rightAction,
  style,
}) => {
  const locationTracker = useLocationTracker();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftCol}>
        {leftAction && <View style={styles.leftAction}>{leftAction}</View>}

        {showLogo && (
          <View style={styles.logoBox}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {showTrackingIndicator && locationTracker && (
              <View
                style={[
                  styles.trackingDot,
                  {
                    backgroundColor: locationTracker.isTracking
                      ? '#22C55E'
                      : Colors.gray300,
                  },
                ]}
              />
            )}
          </View>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    minHeight: 56,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  leftAction: {
    marginRight: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...Shadows.xs,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.sm,
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  trackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
