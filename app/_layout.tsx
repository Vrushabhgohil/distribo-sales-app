import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { LocationTrackerProvider } from '@/features/location/LocationTrackerContext';
import { OfflineSyncProvider } from '@/features/offline/OfflineSyncContext';
import { Colors } from '@/constants/theme';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';

function RouteGuard() {
  const { userRole, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSalesGroup = segments[0] === 'sales';
    const inDeliveryGroup = segments[0] === 'delivery';

    if (!userRole) {
      // Strictly redirect unauthenticated users to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (userRole === 'sales_person') {
      // Sales officers belong strictly in /sales
      if (inAuthGroup || inDeliveryGroup) {
        router.replace('/sales' as any);
      }
    } else if (userRole === 'delivery_person') {
      // Delivery pilots belong strictly in /delivery
      if (inAuthGroup || inSalesGroup) {
        router.replace('/delivery' as any);
      }
    }
  }, [userRole, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splashLoading}>
        <ActivityIndicator size="large" color={Colors.primaryDark} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Platform.OS === 'web' ? 'transparent' : Colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="sales" options={{ headerShown: false }} />
      <Stack.Screen name="delivery" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Page Not Found' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OfflineSyncProvider>
            <LocationTrackerProvider>
              <StatusBar style="dark" />
              <RouteGuard />
            </LocationTrackerProvider>
          </OfflineSyncProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
