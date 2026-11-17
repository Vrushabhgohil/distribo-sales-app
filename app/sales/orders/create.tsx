import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store as StoreIcon,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Package,
  CreditCard,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/common/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { Product, Store, CartItem } from '@/types';

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { storeId: initialStoreId, preselectProductId, prefilledCart } = useLocalSearchParams<{
    storeId?: string;
    preselectProductId?: string;
    prefilledCart?: string;
  }>();
  const { salesperson } = useAuth();

  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId || '');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Queries
  const { data: stores = [] } = useQuery({
    queryKey: ['stores', salesperson?.id],
    queryFn: () => dataService.getStores(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => dataService.getProducts(),
  });

  // Default store selection
  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  // Pre-select product if param given
  useEffect(() => {
    if (preselectProductId && products.length > 0) {
      const prod = products.find((p) => p.id === preselectProductId);
      if (prod) {
        setCart((prev) => {
          const m = new Map(prev);
          m.set(prod.id, Math.max(1, prod.min_order_qty || 1));
          return m;
        });
      }
    }
  }, [preselectProductId, products]);

  // Pre-fill cart if sent from catalogue
  useEffect(() => {
    if (prefilledCart && products.length > 0) {
      try {
        const parsed = JSON.parse(prefilledCart) as Record<string, number>;
        const m = new Map<string, number>();
        Object.entries(parsed).forEach(([pId, qty]) => {
          m.set(pId, qty);
        });
        setCart(m);
      } catch (err) {
        console.warn('Failed parsing prefilled cart:', err);
      }
    }
  }, [prefilledCart, products]);

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId);
  }, [stores, selectedStoreId]);

  const updateQuantity = (productId: string, qty: number, minQty: number = 1) => {
    setCart((prev) => {
      const updated = new Map(prev);
      if (qty <= 0) {
        updated.delete(productId);
      } else {
        updated.set(productId, Math.max(qty, minQty));
      }
      return updated;
    });
  };

  const removeProduct = (productId: string) => {
    setCart((prev) => {
      const updated = new Map(prev);
      updated.delete(productId);
      return updated;
    });
  };

  // Cart calculations
  const cartItems: CartItem[] = useMemo(() => {
    const list: CartItem[] = [];
    cart.forEach((quantity, productId) => {
      const product = products.find((p) => p.id === productId);
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
  }, [cart, products]);

  const totalOrderAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand?.name && p.brand.name.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const handleSubmitOrder = async () => {
    if (!selectedStoreId) {
      Alert.alert('Store Required', 'Please select a retail outlet for this order.');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Empty Order', 'Please select at least one product before submitting.');
      return;
    }

    setSubmitting(true);

    const itemsPayload = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    const result = await dataService.createOrder({
      storeId: selectedStoreId,
      salespersonId: salesperson?.id || '',
      items: itemsPayload,
      notes: orderNotes.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success && result.data) {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['today-orders'] });
      setSuccessOrder(result.data);
    } else {
      Alert.alert('Booking Error', result.error || 'Failed to submit order for Admin confirmation.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Book Sales Order"
        subtitle="Mandatory Central Admin Approval"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Target Retail Store Outlet */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Target Retail Store</Text>
          </View>

          {/* Store Horizontal Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storePickerScroll}
          >
            {stores.map((s) => {
              const isSelected = selectedStoreId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.75}
                  onPress={() => setSelectedStoreId(s.id)}
                  style={[
                    styles.storePill,
                    isSelected && styles.storePillActive,
                  ]}
                >
                  <StoreIcon
                    size={15}
                    color={isSelected ? Colors.white : Colors.primaryDark}
                  />
                  <Text
                    style={[
                      styles.storePillText,
                      isSelected && styles.storePillTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedStore && (
            <View style={styles.storeDetailsBox}>
              <Text style={styles.storeNameText}>{selectedStore.name}</Text>
              <Text style={styles.storeAddrText}>
                {selectedStore.address}, {selectedStore.area}
              </Text>
              <View style={styles.creditRow}>
                <CreditCard size={13} color={Colors.primaryDark} />
                <Text style={styles.creditText}>
                  Credit Limit: ₹{selectedStore.credit_limit?.toLocaleString('en-IN') || '0'} • Terms: {selectedStore.payment_terms || 'Net 30'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Step 2: Browse Products & Pick Quantities */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Select Products</Text>
          </View>

          <SearchBar
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="Search SKU code or brand..."
          />

          <View style={styles.productList}>
            {filteredProducts.map((product) => {
              const qty = cart.get(product.id) || 0;
              const minQty = product.min_order_qty || 1;

              return (
                <View key={product.id} style={styles.productRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.prodName}>{product.name}</Text>
                    <Text style={styles.prodMeta}>
                      SKU: {product.sku} • {product.pack_size}
                    </Text>
                    <Text style={styles.prodPrice}>
                      ₹{product.selling_price} / {product.unit} (MOQ: {minQty})
                    </Text>
                  </View>

                  {qty > 0 ? (
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateQuantity(product.id, qty - 1, minQty)}
                        style={styles.stepBtn}
                      >
                        <Minus size={14} color={Colors.primaryDark} />
                      </TouchableOpacity>
                      <Text style={styles.stepVal}>{qty}</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateQuantity(product.id, qty + 1, minQty)}
                        style={[styles.stepBtn, styles.stepBtnAdd]}
                      >
                        <Plus size={14} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => updateQuantity(product.id, minQty, minQty)}
                      style={styles.addBtn}
                    >
                      <Plus size={14} color={Colors.primaryDark} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Step 3: Order Review & Breakdown */}
        {cartItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Order Summary & Cart</Text>
            </View>

            {cartItems.map((item) => (
              <View key={item.product.id} style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemMeta}>
                    {item.quantity} × ₹{item.unitPrice}
                  </Text>
                </View>
                <Text style={styles.cartItemTotal}>
                  ₹{item.lineTotal.toLocaleString('en-IN')}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removeProduct(item.product.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryTotalRow}>
              <View>
                <Text style={styles.totalUnitsLabel}>{totalQuantity} total units</Text>
                <Text style={styles.totalSumAmount}>
                  ₹{totalOrderAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.pendingAdminBadge}>
                <Clock size={12} color="#B45309" />
                <Text style={styles.pendingAdminText}>Awaiting Admin Approval</Text>
              </View>
            </View>

            <Input
              label="Order Instructions / Dispatch Notes (Optional)"
              placeholder="e.g. Deliver before 12 PM, check store shelf capacity"
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
              numberOfLines={2}
              containerStyle={{ marginTop: 14 }}
            />
          </View>
        )}

        {/* Action Button */}
        <Button
          title={
            cartItems.length > 0
              ? `Submit Order (₹${totalOrderAmount.toLocaleString('en-IN')})`
              : 'Add Products to Continue'
          }
          variant="primary"
          size="xl"
          icon={<ShoppingBag size={18} color={Colors.white} />}
          disabled={cartItems.length === 0}
          loading={submitting}
          onPress={handleSubmitOrder}
          style={styles.submitOrderBtn}
        />
      </ScrollView>

      {/* Order Booking Success Modal */}
      <Modal
        visible={!!successOrder}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessOrder(null);
          router.replace('/sales/(tabs)/orders');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={44} color="#15803D" />
            </View>

            <Text style={styles.modalSuccessTitle}>Order Placed Successfully!</Text>
            <Text style={styles.modalOrderNumber}>{successOrder?.order_number}</Text>
            <Text style={styles.modalSuccessMsg}>
              Your FMCG order has been booked and queued for Central Admin confirmation and warehouse dispatch.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="View Order Details"
                variant="primary"
                size="lg"
                onPress={() => {
                  const id = successOrder?.id;
                  setSuccessOrder(null);
                  router.replace(`/sales/orders/${id}` as any);
                }}
                style={{ marginBottom: 8 }}
              />
              <Button
                title="Return to Dashboard"
                variant="outline"
                size="md"
                onPress={() => {
                  setSuccessOrder(null);
                  router.replace('/sales/(tabs)');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepNumBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  storePickerScroll: {
    paddingBottom: 10,
    gap: 8,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  storePillActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  storePillText: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  storePillTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  storeDetailsBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  storeNameText: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  storeAddrText: {
    ...Typography.captionMd,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  creditText: {
    ...Typography.captionSm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  productList: {
    marginTop: 14,
    gap: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  prodName: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  prodMeta: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  prodPrice: {
    ...Typography.captionLg,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
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
    minWidth: 24,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  addBtnText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cartItemName: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  cartItemMeta: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
  },
  cartItemTotal: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginRight: 10,
  },
  deleteBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalUnitsLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  totalSumAmount: {
    ...Typography.statLg,
    color: Colors.textPrimary,
  },
  pendingAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  pendingAdminText: {
    ...Typography.captionSm,
    color: '#B45309',
    fontWeight: '700',
  },
  submitOrderBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 40, 32, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 24,
    alignItems: 'center',
    width: '100%',
    ...Shadows.xl,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalSuccessTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalOrderNumber: {
    ...Typography.statSm,
    color: Colors.primaryDark,
    marginTop: 6,
    marginBottom: 8,
  },
  modalSuccessMsg: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    width: '100%',
  },
});
