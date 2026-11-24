import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
} from 'lucide-react-native';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useCreateOrder } from '@/features/orders/useCreateOrder';
import { OrderStorePicker } from '@/components/orders/OrderStorePicker';
import { OrderSuccessModal } from '@/components/orders/OrderSuccessModal';

export default function CreateOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeId?: string;
    preselectProductId?: string;
    prefilledCart?: string;
  }>();

  const [storePickerVisible, setStorePickerVisible] = useState(false);

  const {
    stores,
    selectedStore,
    selectedStoreId,
    setSelectedStoreId,
    productSearch,
    setProductSearch,
    cart,
    cartItems,
    totalOrderAmount,
    totalQuantity,
    filteredProducts,
    orderNotes,
    setOrderNotes,
    submitting,
    successOrder,
    setSuccessOrder,
    updateQuantity,
    removeProduct,
    submitOrder,
  } = useCreateOrder({
    initialStoreId: params.storeId,
    preselectProductId: params.preselectProductId,
    prefilledCart: params.prefilledCart,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Create New Order"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Store Picker Modal + Trigger */}
        <OrderStorePicker
          stores={stores}
          selectedStore={selectedStore}
          onSelectStore={(id) => setSelectedStoreId(id)}
          visible={storePickerVisible}
          onOpen={() => setStorePickerVisible(true)}
          onClose={() => setStorePickerVisible(false)}
        />

        {/* Product Catalog Search */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Add Products to Order</Text>
          <SearchBar
            placeholder="Search by product name, SKU or category..."
            value={productSearch}
            onChangeText={setProductSearch}
            style={styles.searchBar}
          />

          <View style={styles.productsList}>
            {filteredProducts.slice(0, 15).map((product) => {
              const inCartQty = cart.get(product.id) || 0;
              const minQty = product.min_order_qty || 1;

              return (
                <View key={product.id} style={styles.productRow}>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      SKU: {product.sku || 'N/A'} • ₹{product.selling_price} / {product.unit || 'Unit'}
                    </Text>
                    {minQty > 1 && (
                      <Text style={styles.minQtyLabel}>Min order qty: {minQty}</Text>
                    )}
                  </View>

                  {inCartQty === 0 ? (
                    <Button
                      title="Add"
                      variant="outline"
                      size="sm"
                      icon={<Plus size={14} color={Colors.primary} />}
                      onPress={() => updateQuantity(product.id, minQty, minQty)}
                    />
                  ) : (
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateQuantity(product.id, inCartQty - 1, minQty)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={14} color={Colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{inCartQty}</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateQuantity(product.id, inCartQty + 1, minQty)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={14} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Cart Review */}
        {cartItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.cartHeadingRow}>
              <ShoppingBag size={18} color={Colors.primary} />
              <Text style={styles.cartHeading}>
                Order Items ({cartItems.length} items, {totalQuantity} units)
              </Text>
            </View>

            {cartItems.map((item) => (
              <View key={item.product.id} style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemSub}>
                    {item.quantity} × ₹{item.unitPrice} = ₹{item.lineTotal.toLocaleString('en-IN')}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removeProduct(item.product.id)}
                  style={styles.removeBtn}
                >
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.orderSummaryBox}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Total Quantity</Text>
                <Text style={styles.summaryValue}>{totalQuantity} units</Text>
              </View>
              <View style={[styles.summaryLine, styles.totalLine]}>
                <Text style={styles.totalLabel}>Estimated Amount</Text>
                <Text style={styles.totalValue}>₹{totalOrderAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes & Instructions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Order Notes (Optional)</Text>
          <Input
            placeholder="Special delivery instructions, preferred timing, etc."
            value={orderNotes}
            onChangeText={setOrderNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </View>

        {/* Submit Button */}
        <Button
          title={submitting ? 'Placing Order...' : `Book Order (₹${totalOrderAmount.toLocaleString('en-IN')})`}
          variant="primary"
          size="xl"
          loading={submitting}
          disabled={submitting || cartItems.length === 0 || !selectedStoreId}
          onPress={submitOrder}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* Success Modal */}
      <OrderSuccessModal
        order={successOrder}
        onDismiss={() => setSuccessOrder(null)}
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
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    ...Shadows.xs,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  searchBar: {
    marginBottom: 12,
  },
  productsList: {
    marginTop: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  productDetails: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  productMeta: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  minQtyLabel: {
    ...Typography.captionSm,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    padding: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  qtyText: {
    ...Typography.bodyMd,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  cartHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cartHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cartItemName: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cartItemSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  orderSummaryBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalLine: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  notesInput: {
    minHeight: 70,
  },
  submitBtn: {
    marginTop: 8,
  },
});
