import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotibaLoader } from '@/components/common/MotibaLoader';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large' | 'medium';
  fullscreen?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading data...',
  size = 'large',
  fullscreen = false,
}) => {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <MotibaLoader
        message={message}
        size={size === 'large' ? 'large' : 'medium'}
        fullscreen={fullscreen}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    padding: 0,
  },
});


