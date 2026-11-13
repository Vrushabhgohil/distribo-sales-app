import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const SIZES = {
  sm: { box: 32, text: 12, radius: 10 },
  md: { box: 42, text: 14, radius: 13 },
  lg: { box: 56, text: 18, radius: 17 },
  xl: { box: 72, text: 24, radius: 22 },
};

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'md', style }) => {
  const s = SIZES[size];
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <View
      style={[
        styles.container,
        {
          width: s.box,
          height: s.box,
          borderRadius: s.radius,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: s.text }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  text: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});

