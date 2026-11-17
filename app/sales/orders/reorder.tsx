import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Repeat,
  Store as StoreIcon,
  Plus,
  Minus,
  Trash2,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/common/Header';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { CartItem } from '@/types';

export default function ReorderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { salesperson } = useAuth();

  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const { data: previousOrder, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => dataService.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const { data: currentProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => dataService.getProducts(),
  });

  // Populate cart from previous order with current products
  useEffect(() => {
    if (previousOrder?.items && currentProducts.length > 0) {
      const map = new Map<string, number>();
      previousOrder.items.forEach((item) => {
        const match = currentProducts.find((p) => p.id === item.product_id);
        if (match && match.status === 'active') {
          map.set(item.product_id, item.quantity);
        }
      });
      setCart(map);
    }
  }, [previousOrder, currentProducts]);

  const updateQuantity = (productId: string, qty: number) => {
    setCart((prev) => {
      const updated = new Map(prev);
      if (qty <= 0) {
        updated.delete(productId);
      } else {
        updated.set(productId, qty);
      }
      return updated;
    });
  };

  const cartItems: CartItem[] = useMemo(() => {
    const list: CartItem[] = [];
    cart.forEach((quantity, productId) => {
      const product = currentProducts.find((p) => p.id === productId);
      if (product) {
        list.push({
          product,
          quantity,
          unitPrice: product.selling_price,
          lineTotal: product.selling_price * quantity,
        });
      }
    });
    return list;
  }, [cart, currentProducts]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  const handleSubmitReorder = async () => {
    if (!previousOrder?.store_id || !salesperson?.id) return;
    if (cartItems.length === 0) {
      Alert.alert('Empty Order', 'Please retain at least one product in this reorder.');
      return;
    }

    setSubmitting(true);
    const result = await dataService.createOrder({
      storeId: previousOrder.store_id,
      salespersonId: salesperson.id,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: `Reorder of ${previousOrder.order_number}`,
    });

    setSubmitting(false);

    if (result.success && result.data) {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert(
        'Reorder Booked',
        `New order ${result.data.order_number} has been created and is pending Admin confirmation.`,
        [
          {
            text: 'View New Order',
            onPress: () => router.replace(`/sales/orders/${result.data!.id}` as any),
          },
        ]
      );
    } else {
      Alert.alert('Reorder Failed', result.error || 'Failed to place reorder.');
    }
  };

  if (loadingOrder || !previousOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Reorder"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Preparing reorder draft...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Reorder Booking"
        subtitle={`Based on ${previousOrder.order_number}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Store Target Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Target Store Outlet</Text>
          <View style={styles.storeRow}>
            <View style={styles.storeIconBox}>
              <StoreIcon size={20} color={Colors.primaryDark} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.storeName}>{previousOrder.store?.name}</Text>
              <Text style={styles.storeAddr}>
                {previousOrder.store?.address}, {previousOrder.store?.area}
              </Text>
            </View>
          </View>
        </View>

        {/* Reorder Items List */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Review & Adjust Quantities</Text>

          {cartItems.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemMeta}>
                  ₹{item.unitPrice} / {item.product.unit} • Sub: ₹{item.lineTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  style={styles.stepBtn}
                >
                  {item.quantity === 1 ? (
                    <Trash2 size={13} color={Colors.error} />
                  ) : (
                    <Minus size={13} color={Colors.primaryDark} />
                  )}
                </TouchableOpacity>

                <Text style={styles.stepVal}>{item.quantity}</Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  style={[styles.stepBtn, styles.stepBtnAdd]}
                >
                  <Plus size={13} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>New Order Total</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.adminNotice}>
            <Clock size={14} color="#B45309" />
            <Text style={styles.adminNoticeText}>
              Every reorder must be verified and approved by Central Admin before fulfillment.
            </Text>
          </View>
        </View>

        <Button
          title={`Confirm Reorder (₹${totalAmount.toLocaleString('en-IN')})`}
          variant="primary"
          size="xl"
          icon={<Repeat size={18} color={Colors.white} />}
          disabled={cartItems.length === 0}
          loading={submitting}
          onPress={handleSubmitReorder}
          style={styles.reorderSubmitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  storeAddr: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemName: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  itemMeta: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnAdd: {
    backgroundColor: Colors.primaryDark,
  },
  stepVal: {
    ...Typography.statSm,
    color: Colors.textPrimary,
    minWidth: 22,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.statMd,
    color: Colors.primaryDark,
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  adminNoticeText: {
    flex: 1,
    ...Typography.captionSm,
    color: '#B45309',
    lineHeight: 16,
  },
  reorderSubmitBtn: {
    marginTop: 6,
    marginBottom: 20,
  },
});
