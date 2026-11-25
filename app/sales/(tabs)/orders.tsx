import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  ShoppingBag,
  AlertCircle,
  Repeat,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { Order } from '@/types';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'confirmed', label: 'Approved' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'rejected', label: 'Rejected' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['orders', salesperson?.id, selectedStatus],
    queryFn: () => dataService.getOrders(salesperson?.id, selectedStatus),
    enabled: !!salesperson?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        (order.store?.name && order.store.name.toLowerCase().includes(q));

      const matchesStatus =
        selectedStatus === 'all' || order.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, selectedStatus]);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/sales/orders/${item.id}` as any)}
      style={styles.orderCard}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.orderNumber}>{item.order_number}</Text>
          <Text style={styles.storeName} numberOfLines={1}>{item.store?.name || 'Retail Outlet'}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {item.rejection_reason && item.status === 'rejected' && (
        <View style={styles.rejectionNotice}>
          <AlertCircle size={14} color={Colors.error} />
          <Text style={styles.rejectionText}>
            Rejection: {item.rejection_reason}
          </Text>
        </View>
      )}

      <View style={styles.itemsSummary}>
        <Text style={styles.itemsSummaryText}>
          {item.items?.length || 0} product lines
        </Text>
        <Text style={styles.orderDate}>
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.amountLabel}>Total Value</Text>
          <Text style={styles.totalAmount}>
            ₹{item.total_amount?.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/sales/orders/reorder' as any,
                params: { orderId: item.id },
              })
            }
            style={styles.reorderBtn}
          >
            <Repeat size={13} color={Colors.primary} />
            <Text style={styles.reorderBtnText}>Reorder</Text>
          </TouchableOpacity>

          <View style={styles.detailArrow}>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Sales Orders"
        subtitle={`${filteredOrders.length} bookings recorded`}
        showTrackingIndicator
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/sales/orders/create' as any)}
            style={styles.addOrderBtn}
          >
            <Plus size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Search Input & Horizontal Status Filter Chips */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search order number or store..."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((filter) => {
            const isSelected = selectedStatus === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                activeOpacity={0.7}
                onPress={() => setSelectedStatus(filter.id)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <MotibaLoader size="medium" message="Loading sales orders..." />
          ) : (
            <EmptyState
              icon={<ShoppingBag size={42} color={Colors.textTertiary} />}
              title={
                selectedStatus !== 'all'
                  ? `No ${selectedStatus} orders found`
                  : 'No orders recorded'
              }
              description={
                selectedStatus !== 'all'
                  ? 'Try selecting a different status filter or clearing your search.'
                  : 'Book a new FMCG order for any retail outlet in your beat.'
              }
              actionTitle="Book New FMCG Order"
              onAction={() => router.push('/sales/orders/create' as any)}
            />
          )
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
  addOrderBtn: {
    backgroundColor: Colors.primary,
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterScroll: {
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    ...Typography.captionSm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  listContent: {
    padding: 18,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNumber: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  storeName: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  rejectionText: {
    ...Typography.captionSm,
    color: Colors.error,
    fontWeight: '700',
  },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  itemsSummaryText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  orderDate: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountLabel: {
    ...Typography.captionSm,
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  totalAmount: {
    ...Typography.statSm,
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginRight: 6,
  },
  reorderBtnText: {
    ...Typography.buttonSm,
    color: Colors.primary,
  },
  detailArrow: {
    padding: 2,
  },
});
