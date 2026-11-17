import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Truck,
  Package,
  CalendarClock,
  Info,
  ArrowLeft,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { dataService } from '@/services/data-service';
import { NotificationItem } from '@/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dataService.getNotifications(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => dataService.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleReadMutation = useMutation({
    mutationFn: (id: string) => dataService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag size={18} color="#15803D" />;
      case 'delivery':
        return <Truck size={18} color="#0369A1" />;
      case 'inventory':
        return <Package size={18} color="#B45309" />;
      case 'follow_up':
        return <CalendarClock size={18} color="#7E22CE" />;
      default:
        return <Info size={18} color={Colors.textSecondary} />;
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isUnread) {
            markSingleReadMutation.mutate(item.id);
          }
          if (item.reference_type === 'orders' && item.reference_id) {
            router.push(`/sales/orders/${item.reference_id}` as any);
          }
        }}
        style={[styles.notifCard, isUnread && styles.notifCardUnread]}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, isUnread && styles.iconBoxUnread]}>
            {getNotifIcon(item.type)}
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.titleBold]}>
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>

            <Text style={styles.messageText}>{item.message}</Text>

            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread updates`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => markAllReadMutation.mutate()}
              style={styles.markAllBtn}
            >
              <CheckCheck size={16} color={Colors.primaryDark} />
              <Text style={styles.markAllText}>Mark Read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primaryDark]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Bell size={42} color={Colors.textTertiary} />}
              title="All Caught Up"
              description="You have no notifications or admin dispatch updates right now."
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  },
  markAllText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
  },
  listContent: {
    padding: 18,
    paddingBottom: 40,
  },
  notifCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    ...Shadows.xs,
  },
  notifCardUnread: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '30',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: {
    backgroundColor: Colors.white,
    ...Shadows.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  titleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryMid,
  },
  messageText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  timeText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 6,
  },
});
