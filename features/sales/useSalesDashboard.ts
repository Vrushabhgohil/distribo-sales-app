import { useAuth } from '@/features/auth/AuthContext';
import { useLocationTracker } from '@/features/location/LocationTrackerContext';
import {
  useStores,
  useOrders,
  useProducts,
  useTodayVisits,
  useActiveVisit,
  useNotifications,
  useFollowUps,
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
  const { data: followUps = [], refetch: refetchFollowUps } = useFollowUps(salesperson?.id);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStores(),
      refetchOrders(),
      refetchProducts(),
      refetchVisits(),
      refetchActiveVisit(),
      refetchNotifs(),
      refetchFollowUps(),
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

  const visitStatusByStoreId = useMemo(() => {
    const map = new Map<string, 'on_visit' | 'completed' | 'pending'>();
    todayVisits.forEach((v) => {
      if (!v.check_out_time) {
        map.set(v.store_id, 'on_visit');
      } else if (map.get(v.store_id) !== 'on_visit') {
        map.set(v.store_id, 'completed');
      }
    });
    if (activeVisit) {
      map.set(activeVisit.store_id, 'on_visit');
    }
    return map;
  }, [todayVisits, activeVisit]);

  const completedVisitsToday = useMemo(() => {
    const completedStoreIds = new Set(
      todayVisits.filter((v) => !!v.check_out_time).map((v) => v.store_id)
    );
    return completedStoreIds.size;
  }, [todayVisits]);

  const pendingVisitsToday = useMemo(() => {
    return Math.max(0, stores.length - completedVisitsToday);
  }, [stores.length, completedVisitsToday]);

  const pendingFollowUpsCount = useMemo(() => {
    return followUps.filter((f) => f.status !== 'completed' && f.status !== 'cancelled').length;
  }, [followUps]);

  const upcomingFollowUps = useMemo(() => {
    return followUps
      .filter((f) => f.status !== 'completed' && f.status !== 'cancelled' && f.follow_up_date >= todayDateStr)
      .slice(0, 5);
  }, [followUps, todayDateStr]);

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
    visitStatusByStoreId,
    completedVisitsToday,
    pendingVisitsToday,
    pendingFollowUpsCount,
    upcomingFollowUps,
    notifications,
    unreadNotifCount,
    bestsellers,
    refreshing,
    onRefresh,
  };
}
