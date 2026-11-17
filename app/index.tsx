import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function RootIndexScreen() {
  const { userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!userRole) {
      router.replace('/(auth)/login');
    } else if (userRole === 'sales_person') {
      router.replace('/sales' as any);
    } else if (userRole === 'delivery_person') {
      router.replace('/delivery' as any);
    }
  }, [userRole, loading, router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/distribo-full-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={Colors.primaryDark} style={styles.spinner} />
      <Text style={styles.loadingText}>Initializing Distribo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginVertical: Spacing.md,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
