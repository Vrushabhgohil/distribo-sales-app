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
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { CustomAlertProvider } from '@/components/ui/CustomAlert';

function RouteGuard() {
  const { userRole, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if recovery token is present on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        router.replace('/(auth)/reset-password');
        return;
      }
    }

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPasswordScreen = inAuthGroup && segments[1] === 'reset-password';
    const inSalesGroup = segments[0] === 'sales';
    const inDeliveryGroup = segments[0] === 'delivery';

    // Allow user to remain on reset-password screen to create new password
    if (isResetPasswordScreen) {
      return;
    }

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
    return <MotibaLoader fullscreen message="Initializing Motiba Sales Suite..." />;
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
  useFonts({
    'PlaywriteFRModerne': require('../assets/fonts/PlaywriteFRModerne.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OfflineSyncProvider>
            <LocationTrackerProvider>
              <CustomAlertProvider>
                <StatusBar style="dark" />
                <RouteGuard />
              </CustomAlertProvider>
            </LocationTrackerProvider>
          </OfflineSyncProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
