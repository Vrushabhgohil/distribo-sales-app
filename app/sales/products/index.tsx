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
  ArrowLeft,
  ShoppingBag,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { ProductCard } from '@/components/ui/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { Button } from '@/components/ui/Button';
import { dataService } from '@/services/data-service';
import { Product } from '@/types';

export default function ProductsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [draftCart, setDraftCart] = useState<Record<string, number>>({});

  const {
    data: products = [],
    isLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => dataService.getProducts(),
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dataService.getCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => dataService.getBrands(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchCategories()]);
    setRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        (prod.brand?.name && prod.brand.name.toLowerCase().includes(q)) ||
        (prod.category?.name && prod.category.name.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || prod.category_id === selectedCategory;

      const matchesBrand =
        selectedBrand === 'all' || prod.brand_id === selectedBrand;

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand]);

  const totalCartCount = useMemo(() => {
    return Object.values(draftCart).reduce((sum, qty) => sum + qty, 0);
  }, [draftCart]);

  const totalCartAmount = useMemo(() => {
    return Object.entries(draftCart).reduce((sum, [pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      return sum + (prod ? prod.selling_price * qty : 0);
    }, 0);
  }, [draftCart, products]);

  const handleAdd = (productId: string) => {
    setDraftCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleRemove = (productId: string) => {
    setDraftCart((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const navigateToCreateOrder = () => {
    router.push({
      pathname: '/sales/orders/create' as any,
      params: {
        prefilledCart: JSON.stringify(draftCart),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Header */}
      <Header
        title="Product Catalogue"
        subtitle={`${filteredProducts.length} items available`}
        leftAction={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.headerRightRow}>
            {/* Toggle Grid / List layout */}
            <TouchableOpacity
              onPress={() => setLayoutMode(layoutMode === 'grid' ? 'list' : 'grid')}
              style={styles.viewModeBtn}
              activeOpacity={0.7}
            >
              {layoutMode === 'grid' ? (
                <List size={18} color={Colors.textPrimary} />
              ) : (
                <LayoutGrid size={18} color={Colors.textPrimary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={navigateToCreateOrder}
              style={styles.cartBtn}
            >
              <ShoppingBag size={18} color={Colors.white} />
              {totalCartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search Bar */}
      <View style={styles.filterSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, brands, SKU..."
        />

        {/* Categories Horizontal Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <CategoryPill
            label="All Categories"
            count={products.length}
            isSelected={selectedCategory === 'all'}
            onPress={() => setSelectedCategory('all')}
          />
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <CategoryPill
                key={cat.id}
                label={cat.name}
                count={count}
                isSelected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Products Presentation */}
      <FlatList
        key={layoutMode} // Force re-render on grid/list layout switch
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={layoutMode === 'grid' ? 2 : 1}
        columnWrapperStyle={layoutMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            layout={layoutMode}
            quantity={draftCart[item.id] || 0}
            onAdd={() => handleAdd(item.id)}
            onRemove={() => handleRemove(item.id)}
            onPress={() => router.push(`/sales/products/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <MotibaLoader size="medium" message="Loading product catalog..." />
          ) : (
            <EmptyState
              title={searchQuery ? 'No matching FMCG products' : 'No products available'}
              description={
                searchQuery
                  ? 'Try searching by a brand name, pack size, or different keyword.'
                  : 'Product master items will show here once cataloged in the Admin Portal.'
              }
            />
          )
        }
      />

      {/* Floating Cart Checkout Bar if items selected */}
      {totalCartCount > 0 && (
        <View style={styles.floatingCartBar}>
          <View style={styles.cartInfoCol}>
            <Text style={styles.cartItemsCount}>
              {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} selected
            </Text>
            <Text style={styles.cartTotalPrice}>
              Total: ₹{totalCartAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <Button
            title="Proceed to Order"
            variant="primary"
            size="md"
            fullWidth={false}
            icon={<ArrowRight size={16} color={Colors.white} />}
            iconPosition="right"
            onPress={navigateToCreateOrder}
            style={styles.cartActionBtn}
          />
        </View>
      )}
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModeBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.xs,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  cartBadgeText: {
    ...Typography.captionSm,
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryScroll: {
    paddingVertical: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
    ...Shadows.lg,
  },
  cartInfoCol: {
    gap: 2,
  },
  cartItemsCount: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cartTotalPrice: {
    ...Typography.statSm,
    color: Colors.textPrimary,
  },
  cartActionBtn: {
    paddingHorizontal: 18,
  },
});
