import { Alert } from '@/components/ui/CustomAlert';
import { useAuth } from '@/features/auth/AuthContext';
import { queryKeys } from '@/features/hooks/query-keys';
import { useBrands, useCategories, useProducts, useStoreLedger, useStores } from '@/features/hooks/useMotibaQueries';
import { invoiceService } from '@/services/invoice-service';
import { orderService } from '@/services/order-service';
import { CartItem, Order } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

interface UseCreateOrderParams {
  initialStoreId?: string;
  preselectProductId?: string;
  prefilledCart?: string;
}

export function useCreateOrder({ initialStoreId, preselectProductId, prefilledCart }: UseCreateOrderParams) {
  const queryClient = useQueryClient();
  const { salesperson } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId || '');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [discountInput, setDiscountInput] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  const { data: stores = [] } = useStores(salesperson?.id);
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: storeLedger = [] } = useStoreLedger(selectedStoreId);

  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

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

  useEffect(() => {
    if (prefilledCart && products.length > 0) {
      try {
        const parsed = JSON.parse(prefilledCart) as Record<string, number>;
        const m = new Map<string, number>();
        Object.entries(parsed).forEach(([pId, qty]) => {
          m.set(pId, qty);
        });
        setCart(m);
      } catch {
        // Ignored
      }
    }
  }, [prefilledCart, products]);

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId);
  }, [stores, selectedStoreId]);

  const storeOutstanding = useMemo(() => {
    return storeLedger.length > 0 ? storeLedger[0].running_balance : 0;
  }, [storeLedger]);

  const storeAvailableCredit = useMemo(() => {
    return Math.max(0, (selectedStore?.credit_limit || 0) - storeOutstanding);
  }, [selectedStore, storeOutstanding]);

  const updateQuantity = (productId: string, qty: number, minQty: number = 1, maxQty?: number | null) => {
    setCart((prev) => {
      const updated = new Map(prev);
      if (qty <= 0) {
        updated.delete(productId);
      } else {
        let clamped = Math.max(qty, minQty);
        if (maxQty && maxQty > 0) {
          clamped = Math.min(clamped, maxQty);
        }
        updated.set(productId, clamped);
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

  const subtotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    const parsed = parseFloat(discountInput);
    if (isNaN(parsed) || parsed <= 0) return 0;
    // Order-level discount cannot exceed subtotal
    return Math.min(parsed, subtotalAmount);
  }, [discountInput, subtotalAmount]);

  const taxAmount = useMemo(() => {
    if (subtotalAmount <= 0) return 0;
    const discountRatio = (subtotalAmount - discountAmount) / subtotalAmount;
    return cartItems.reduce((sum, item) => {
      const gstRate = (item.product.gst_percentage || 0) / 100;
      return sum + item.lineTotal * discountRatio * gstRate;
    }, 0);
  }, [cartItems, subtotalAmount, discountAmount]);

  const totalOrderAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - discountAmount + taxAmount);
  }, [subtotalAmount, discountAmount, taxAmount]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sub_category?.toLowerCase().includes(q);

      const matchesCat = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
      const matchesBrand = selectedBrandId === 'all' || p.brand_id === selectedBrandId;

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, productSearch, selectedCategoryId, selectedBrandId]);

  const submitOrder = async () => {
    if (!selectedStoreId) {
      Alert.alert('Store Required', 'Please select a store to book this order.');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Cart is Empty', 'Please add at least one product before submitting the order.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await orderService.createOrder({
        storeId: selectedStoreId,
        salespersonId: salesperson?.id,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        discountAmount,
        taxAmount: Math.round(taxAmount),
        notes: orderNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        const enrichedOrder: Order = {
          ...res.data,
          store: res.data.store || selectedStore,
          salesperson: res.data.salesperson || salesperson || undefined,
          discount_amount: discountAmount > 0 ? discountAmount : (res.data.discount_amount ?? 0),
          tax_amount: taxAmount > 0 ? Math.round(taxAmount) : (res.data.tax_amount ?? 0),
          total_amount: Math.round(totalOrderAmount),
          items:
            res.data.items && res.data.items.length > 0
              ? res.data.items
              : cartItems.map((item, idx) => ({
                id: `item-${idx}`,
                order_id: res.data!.id,
                product_id: item.product.id,
                quantity: item.quantity,
                delivered_quantity: 0,
                unit_price: item.unitPrice,
                total_price: item.lineTotal,
                created_at: new Date().toISOString(),
                product: item.product,
              })),
        };
        await invoiceService.ensureInvoiceForOrder(enrichedOrder);
        setSuccessOrder(enrichedOrder);
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      } else {
        Alert.alert('Booking Error', res.error || 'Failed to submit order. Please try again.');
      }
    } catch {
      Alert.alert('Booking Error', 'An unexpected error occurred while placing your order.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
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
  };
}
