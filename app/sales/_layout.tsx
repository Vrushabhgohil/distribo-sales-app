import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { Colors } from '@/constants/theme';
import { MotibaLoader } from '@/components/common/MotibaLoader';

export default function SalesLayout() {
  const { userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!userRole) {
      router.replace('/(auth)/login');
    } else if (userRole !== 'sales_person') {
      // Prevent delivery personnel from accessing sales portal
      if (userRole === 'delivery_person') {
        router.replace('/delivery' as any);
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [userRole, loading, router]);

  if (loading || userRole !== 'sales_person') {
    return <MotibaLoader fullscreen message="Loading Sales Operations..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="stores/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="stores/add" options={{ headerShown: false }} />
      <Stack.Screen name="stores/visit" options={{ headerShown: false }} />
      <Stack.Screen name="products/index" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="orders/create" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="orders/reorder" options={{ headerShown: false }} />
      <Stack.Screen name="ledger/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      <Stack.Screen name="location/index" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ headerShown: false }} />
      <Stack.Screen name="help/index" options={{ headerShown: false }} />
    </Stack>
  );
}
