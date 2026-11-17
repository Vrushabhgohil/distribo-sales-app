import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { Colors } from '@/constants/theme';

export default function DeliveryLayout() {
  const { userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!userRole) {
      router.replace('/(auth)/login');
    } else if (userRole !== 'delivery_person') {
      // Prevent sales personnel from accessing delivery portal
      if (userRole === 'sales_person') {
        router.replace('/sales' as any);
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [userRole, loading, router]);

  if (loading || userRole !== 'delivery_person') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryDark} />
      </View>
    );
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
      <Stack.Screen
        name="deliveries/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Delivery Details',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.primaryDark,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="pickup/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Warehouse Pickup',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.primaryDark,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="delivery/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Complete Delivery',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.primaryDark,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="delivery/success"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="help/index"
        options={{
          headerShown: true,
          headerTitle: 'Help & FAQs',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.primaryDark,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
