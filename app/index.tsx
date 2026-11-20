import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { MotibaLoader } from '@/components/common/MotibaLoader';

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

  return <MotibaLoader fullscreen message="Initializing Motiba FMCG Suite..." />;
}
