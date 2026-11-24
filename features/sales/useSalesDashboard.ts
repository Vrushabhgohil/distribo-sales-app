import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import {
  useStores,
  useOrders,
  useProducts,
  useTodayVisits,
  useActiveVisit,
  useNotifications,
} from '@/features/hooks/useMotibaQueries';
import { useMemo, useState } from 'react';

export function useSalesDashboard() {
  const { salesperson } = useAuth();
  const { isTracking, currentCoords } = useLocationTracker();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stores = [], refetch: refetchStores } = useStores(salesperson?.id);
  const { data: orders = [], refetch: refetchOrders } = useOrders(salesperson?.id);
  const { data: products = [], refetch: refetchProducts } = useProducts();
  const { data: todayVisits = [], refetch: refetchVisits } = useTodayVisits(salesperson?.id);
  const { data: activeVisit = null, refetch: refetchActiveVisit } = useActiveVisit(salesperson?.id);
  const { data: notifications = [], refetch: refetchNotifs } = useNotifications();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStores(),
      refetchOrders(),
      refetchProducts(),
      refetchVisits(),
      refetchActiveVisit(),
      refetchNotifs(),
    ]);
    setRefreshing(false);
  };

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayOrders = useMemo(
    () => orders.filter((o) => o.order_date === todayDateStr),
    [orders, todayDateStr]
  );

  const todaySalesAmount = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [todayOrders]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const bestsellers = useMemo(() => products.slice(0, 6), [products]);

  return {
    salesperson,
    isTracking,
    currentCoords,
    stores,
    orders,
    todayOrders,
    todaySalesAmount,
    todayVisits,
    activeVisit,
    notifications,
    unreadNotifCount,
    bestsellers,
    refreshing,
    onRefresh,
  };
}
