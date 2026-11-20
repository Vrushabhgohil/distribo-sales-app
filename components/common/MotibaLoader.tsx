import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Colors, Typography, Radius, Shadows } from '@/constants/theme';

interface MotibaLoaderProps {
  fullscreen?: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const MotibaLoader: React.FC<MotibaLoaderProps> = ({
  fullscreen = false,
  message,
  size = 'large',
}) => {
  const [animValue] = useState(() => new Animated.Value(0));
  const [pulseValue] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Continuous progress bar / spinner loop
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1400,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    // Subtle logo breath animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.03,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    progressLoop.start();
    pulseLoop.start();

    return () => {
      progressLoop.stop();
      pulseLoop.stop();
    };
  }, [animValue, pulseValue]);

  // Interpolate progress bar translation
  const progressWidth = useMemo(
    () =>
      animValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 160, 220],
      }),
    [animValue]
  );

  const progressTranslate = useMemo(
    () =>
      animValue.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [-60, 40, 220],
      }),
    [animValue]
  );

  const spinRotation = useMemo(
    () =>
      animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [animValue]
  );

  if (fullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        {/* Glowing Ambient Circle */}
        <View style={styles.ambientGlow} />

        {/* Motiba Brand Logo with smooth subtle pulse */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseValue }] },
          ]}
        >
          <Image
            source={require('@/assets/images/motiba-full-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Admin-Panel Style Gradient Progress Track */}
        <View style={styles.trackContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                transform: [{ translateX: progressTranslate }],
              },
            ]}
          />
        </View>

        {/* Optional Status Caption */}
        {message ? (
          <Text style={styles.fullscreenMessage}>{message}</Text>
        ) : (
          <Text style={styles.fullscreenMessage}>Motiba FMCG Suite</Text>
        )}
      </View>
    );
  }

  // Inline / Card / Container Loader (Matching Admin Panel)
  const isSmall = size === 'small';
  const boxDimension = isSmall ? 28 : size === 'medium' ? 44 : 56;
  const innerRing = isSmall ? 22 : size === 'medium' ? 36 : 46;

  return (
    <View style={styles.inlineContainer}>
      <View
        style={[
          styles.spinnerWrapper,
          { width: boxDimension, height: boxDimension },
        ]}
      >
        <Animated.View
          style={[
            styles.spinningRing,
            {
              width: innerRing,
              height: innerRing,
              borderRadius: innerRing / 2,
              transform: [{ rotate: spinRotation }],
            },
          ]}
        />
        <View
          style={[
            styles.spinnerCenterDot,
            {
              width: isSmall ? 6 : 10,
              height: isSmall ? 6 : 10,
              borderRadius: isSmall ? 3 : 5,
            },
          ]}
        />
      </View>
      {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    position: 'relative',
    padding: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(151, 15, 24, 0.07)',
  },
  logoContainer: {
    width: 240,
    height: 90,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  trackContainer: {
    width: 220,
    maxWidth: '75%',
    height: 4,
    backgroundColor: '#F1EDE7',
    borderRadius: Radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  fullscreenMessage: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 14,
    letterSpacing: 0.4,
  },

  // Inline styling
  inlineContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spinningRing: {
    borderWidth: 3,
    borderColor: '#F1EDE7',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.goldDark,
  },
  spinnerCenterDot: {
    position: 'absolute',
    backgroundColor: Colors.primary,
  },
  inlineMessage: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});
