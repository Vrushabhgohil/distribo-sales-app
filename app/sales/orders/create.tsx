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
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ScanBarcode,
  RefreshCw,
  Package,
} from 'lucide-react-native';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchBar } from '@/components/ui/SearchBar';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useCreateOrder } from '@/features/orders/useCreateOrder';
import { OrderStorePicker } from '@/components/orders/OrderStorePicker';
import { OrderSuccessModal } from '@/components/orders/OrderSuccessModal';
import { BarcodeScannerModal } from '@/components/orders/BarcodeScannerModal';

export default function CreateOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeId?: string;
    preselectProductId?: string;
    prefilledCart?: string;
  }>();

  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(params.storeId ? 2 : 1);

  const {
    salesperson,
    stores,
    products,
    loadingProducts,
    refetchProducts,
    categories,
    brands,
    selectedStore,
    selectedStoreId,
    setSelectedStoreId,
    storeOutstanding,
    storeAvailableCredit,
    productSearch,
    setProductSearch,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedBrandId,
    setSelectedBrandId,
    cart,
    cartItems,
    subtotalAmount,
    discountInput,
    setDiscountInput,
    discountAmount,
    taxAmount,
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

  const STEPS = [
    { id: 1 as const, label: '1. Store' },
    { id: 2 as const, label: '2. Products' },
    { id: 3 as const, label: '3. Cart & Tax' },
    { id: 4 as const, label: '4. Submit' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Book New Order"
        subtitle={`Step ${step} of 4`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Step Progress Bar */}
      <View style={styles.stepperBar}>
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.8}
              onPress={() => {
                if (s.id <= 2 || cartItems.length > 0) setStep(s.id);
              }}
              style={[
                styles.stepPill,
                active && styles.stepPillActive,
                done && styles.stepPillDone,
              ]}
            >
              <Text
                style={[
                  styles.stepPillText,
                  (active || done) && styles.stepPillTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* STEP 1: Select Store & Credit Info */}
        {step === 1 && (
          <>
            <OrderStorePicker
              stores={stores}
              selectedStore={selectedStore}
              onSelectStore={(id) => setSelectedStoreId(id)}
              visible={storePickerVisible}
              onOpen={() => setStorePickerVisible(true)}
              onClose={() => setStorePickerVisible(false)}
            />

            {selectedStore && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Store Credit Position</Text>
                <View style={styles.creditGrid}>
                  <View style={styles.creditBox}>
                    <Text style={styles.creditLabel}>Credit Limit</Text>
                    <Text style={styles.creditVal}>
                      ₹{(selectedStore.credit_limit || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.creditBox}>
                    <Text style={styles.creditLabel}>Outstanding</Text>
                    <Text style={[styles.creditVal, { color: Colors.goldDark }]}>
                      ₹{storeOutstanding.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.creditBox}>
                    <Text style={styles.creditLabel}>Available Credit</Text>
                    <Text style={[styles.creditVal, { color: Colors.secondary }]}>
                      ₹{storeAvailableCredit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.creditNote}>
                  Final credit approval & order confirmation remain with Admin.
                </Text>
              </View>
            )}

            <Button
              title="Next: Select Products"
              variant="primary"
              size="xl"
              disabled={!selectedStoreId}
              onPress={() => setStep(2)}
              style={styles.submitBtn}
            />
          </>
        )}

        {/* STEP 2: Product Catalog */}
        {step === 2 && (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.catalogHeaderRow}>
                <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>Select Products</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setScannerVisible(true)}
                  style={styles.scanBtn}
                >
                  <ScanBarcode size={16} color={Colors.white} />
                  <Text style={styles.scanBtnText}>Scan Barcode</Text>
                </TouchableOpacity>
              </View>

              <SearchBar
                placeholder="Search by name, SKU, or barcode..."
                value={productSearch}
                onChangeText={setProductSearch}
                style={styles.searchBar}
              />

              {/* Category Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCategoryId('all')}
                  style={[styles.filterChip, selectedCategoryId === 'all' && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selectedCategoryId === 'all' && styles.filterChipTextActive]}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[styles.filterChip, selectedCategoryId === cat.id && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, selectedCategoryId === cat.id && styles.filterChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Brand Filter */}
              {brands.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedBrandId('all')}
                    style={[styles.filterChip, selectedBrandId === 'all' && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, selectedBrandId === 'all' && styles.filterChipTextActive]}>
                      All Brands
                    </Text>
                  </TouchableOpacity>
                  {brands.map((brand) => (
                    <TouchableOpacity
                      key={brand.id}
                      onPress={() => setSelectedBrandId(brand.id)}
                      style={[styles.filterChip, selectedBrandId === brand.id && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, selectedBrandId === brand.id && styles.filterChipTextActive]}>
                        {brand.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.productsList}>
                {loadingProducts ? (
                  <View style={styles.emptyProductsBox}>
                    <MotibaLoader size="medium" message="Loading product catalog..." />
                  </View>
                ) : filteredProducts.length === 0 ? (
                  <View style={styles.emptyProductsBox}>
                    <Text style={styles.emptyProductsText}>
                      {products.length === 0
                        ? 'No active products found in catalog.'
                        : 'No products match your search or filter.'}
                    </Text>
                    <Button
                      title="Refresh Catalog"
                      variant="outline"
                      size="sm"
                      fullWidth={false}
                      icon={<RefreshCw size={14} color={Colors.primary} />}
                      onPress={() => refetchProducts()}
                      style={{ marginTop: 10 }}
                    />
                  </View>
                ) : (
                  filteredProducts.map((product) => {
                  const inCartQty = cart.get(product.id) || 0;
                  const minQty = product.min_order_qty || 1;
                  const maxQty = product.max_order_qty;
                  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity <= 0;

                  return (
                    <View
                      key={product.id}
                      style={[styles.productCardItem, inCartQty > 0 && styles.productCardItemSelected]}
                    >
                      <View style={styles.productThumbBox}>
                        {product.image_url ? (
                          <Image
                            source={{ uri: product.image_url }}
                            style={styles.productThumbImg}
                            contentFit="cover"
                          />
                        ) : (
                          <Package size={22} color={Colors.primary} />
                        )}
                      </View>

                      <View style={styles.productDetails}>
                        <View style={styles.productTopRow}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {product.name}
                          </Text>
                        </View>

                        <Text style={styles.productMeta}>
                          SKU: {product.sku || 'N/A'}
                          {product.pack_size || product.unit
                            ? ` • ${[product.pack_size, product.unit].filter(Boolean).join(' ')}`
                            : ''}
                        </Text>

                        <View style={styles.productPriceRow}>
                          <Text style={styles.productPriceText}>
                            ₹{(product.selling_price || 0).toLocaleString('en-IN')}
                          </Text>
                          {product.mrp > product.selling_price && (
                            <Text style={styles.productMrpText}>
                              MRP ₹{product.mrp.toLocaleString('en-IN')}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.stockBadge,
                              { backgroundColor: isOutOfStock ? Colors.errorBg : Colors.secondaryLight },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stockBadgeText,
                                { color: isOutOfStock ? Colors.error : Colors.secondary },
                              ]}
                            >
                              {isOutOfStock
                                ? 'Out of Stock'
                                : product.stock_quantity !== undefined && product.stock_quantity !== null
                                ? `${product.stock_quantity} in stock`
                                : 'Available'}
                            </Text>
                          </View>
                        </View>

                        {(minQty > 1 || product.gst_percentage > 0) && (
                          <Text style={styles.minQtyLabel}>
                            {minQty > 1 ? `Min qty: ${minQty}` : ''}
                            {minQty > 1 && product.gst_percentage > 0 ? ' • ' : ''}
                            {product.gst_percentage > 0 ? `GST: ${product.gst_percentage}%` : ''}
                          </Text>
                        )}
                      </View>

                      {inCartQty === 0 ? (
                        <Button
                          title={isOutOfStock ? 'N/A' : 'Add'}
                          variant="outline"
                          size="sm"
                          fullWidth={false}
                          disabled={isOutOfStock}
                          icon={!isOutOfStock ? <Plus size={14} color={Colors.primary} /> : undefined}
                          onPress={() => updateQuantity(product.id, minQty, minQty, maxQty)}
                        />
                      ) : (
                        <View style={styles.qtyControl}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => updateQuantity(product.id, inCartQty - 1, minQty, maxQty)}
                            style={styles.qtyBtn}
                          >
                            <Minus size={14} color={Colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{inCartQty}</Text>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => updateQuantity(product.id, inCartQty + 1, minQty, maxQty)}
                            style={styles.qtyBtn}
                          >
                            <Plus size={14} color={Colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }))}
              </View>
            </View>

            <View style={styles.stepNavRow}>
              <Button
                title="Back"
                variant="outline"
                size="lg"
                onPress={() => setStep(1)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={`Review Cart (${cartItems.length})`}
                variant="primary"
                size="lg"
                disabled={cartItems.length === 0}
                onPress={() => setStep(3)}
                style={{ flex: 2 }}
              />
            </View>
          </>
        )}

        {/* STEP 3: Review Cart, Order-Level Discount, Taxes & Notes */}
        {step === 3 && (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.cartHeadingRow}>
                <ShoppingBag size={18} color={Colors.primary} />
                <Text style={styles.cartHeading}>
                  Review Cart ({cartItems.length} items, {totalQuantity} units)
                </Text>
              </View>

              {cartItems.map((item) => (
                <View key={item.product.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemSub}>
                      {item.product.pack_size || ''} {item.product.unit || 'Unit'} • {item.quantity} × ₹{item.unitPrice} = ₹{item.lineTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1, item.product.min_order_qty || 1, item.product.max_order_qty)}
                      style={styles.qtyBtn}
                    >
                      <Minus size={13} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1, item.product.min_order_qty || 1, item.product.max_order_qty)}
                      style={styles.qtyBtn}
                    >
                      <Plus size={13} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => removeProduct(item.product.id)}
                    style={[styles.removeBtn, { marginLeft: 8 }]}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Order-Level Discount */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Order-Level Discount (₹)</Text>
              <Input
                placeholder="Enter overall order discount amount (e.g. 250)"
                keyboardType="numeric"
                value={discountInput}
                onChangeText={setDiscountInput}
              />
              <Text style={styles.creditNote}>
                Discounts apply only at the order level, subject to Admin rules.
              </Text>
            </View>

            {/* Taxes & Calculation Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Taxes & Order Total</Text>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotalAmount.toLocaleString('en-IN')}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Order Discount</Text>
                  <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
                    -₹{discountAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Estimated GST Tax</Text>
                <Text style={styles.summaryValue}>₹{Math.round(taxAmount).toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.summaryLine, styles.totalLine]}>
                <Text style={styles.totalLabel}>Final Order Amount</Text>
                <Text style={styles.totalValue}>₹{Math.round(totalOrderAmount).toLocaleString('en-IN')}</Text>
              </View>
            </View>

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

            <View style={styles.stepNavRow}>
              <Button
                title="Add More"
                variant="outline"
                size="lg"
                onPress={() => setStep(2)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Review & Submit"
                variant="primary"
                size="lg"
                disabled={cartItems.length === 0}
                onPress={() => setStep(4)}
                style={{ flex: 2 }}
              />
            </View>
          </>
        )}

        {/* STEP 4: Final Order Summary & Submit */}
        {step === 4 && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Final Order Summary</Text>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Store</Text>
                <Text style={styles.summaryValue}>{selectedStore?.name || 'Retail Outlet'}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Sales Person</Text>
                <Text style={styles.summaryValue}>{salesperson?.name || 'Sales Officer'}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Order Date</Text>
                <Text style={styles.summaryValue}>{new Date().toLocaleDateString('en-IN')}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Status on Submit</Text>
                <Text style={[styles.summaryValue, { color: Colors.goldDark }]}>Pending Admin Confirmation</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Products ({cartItems.length})</Text>
              {cartItems.map((item) => (
                <View key={item.product.id} style={styles.summaryLine}>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    {item.product.name} ({item.quantity} × ₹{item.unitPrice})
                  </Text>
                  <Text style={styles.summaryValue}>₹{item.lineTotal.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <View style={[styles.summaryLine, styles.totalLine]}>
                <Text style={styles.totalLabel}>Final Total</Text>
                <Text style={styles.totalValue}>₹{Math.round(totalOrderAmount).toLocaleString('en-IN')}</Text>
              </View>
              {orderNotes.trim() ? (
                <Text style={[styles.creditNote, { marginTop: 8 }]}>Notes: {orderNotes.trim()}</Text>
              ) : null}
            </View>

            <View style={styles.stepNavRow}>
              <Button
                title="Edit Cart"
                variant="outline"
                size="lg"
                onPress={() => setStep(3)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={submitting ? 'Submitting...' : 'Submit Order'}
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={submitting || cartItems.length === 0 || !selectedStoreId}
                onPress={submitOrder}
                style={{ flex: 2 }}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        products={products}
        cart={cart}
        onAddProduct={(product, quantity) =>
          updateQuantity(product.id, quantity, product.min_order_qty || 1, product.max_order_qty)
        }
      />

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
  stepperBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
  },
  stepPillActive: {
    backgroundColor: Colors.primary,
  },
  stepPillDone: {
    backgroundColor: Colors.secondaryLight,
  },
  stepPillText: {
    ...Typography.captionSm,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontSize: 11,
  },
  stepPillTextActive: {
    color: Colors.white,
  },
  creditGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  creditBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 10,
  },
  creditLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  creditVal: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  creditNote: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  stepNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  scanBtnText: {
    ...Typography.captionBold,
    color: Colors.white,
    fontSize: 12,
  },
  emptyProductsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProductsText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  productCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  productCardItemSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryTint,
  },
  productThumbBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productThumbImg: {
    width: '100%',
    height: '100%',
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  productPriceText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '800',
  },
  productMrpText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
