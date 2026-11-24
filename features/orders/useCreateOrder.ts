import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useStores, useProducts } from '@/features/hooks/useMotibaQueries';
import { orderService } from '@/services/order-service';
import { CartItem, Order, Store, Product } from '@/types';
import { Alert } from '@/components/ui/CustomAlert';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/hooks/query-keys';

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
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  const { data: stores = [] } = useStores(salesperson?.id);
  const { data: products = [] } = useProducts();

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
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.sub_category?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

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
        notes: orderNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setSuccessOrder(res.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
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
    stores,
    products,
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
  };
}
