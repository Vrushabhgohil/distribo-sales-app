import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Package,
  PlusCircle,
  ShieldCheck,
  Tag,
  Layers,
  Percent,
  Barcode,
  ShoppingBag,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { dataService } from '@/services/data-service';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => dataService.getProductById(id!),
    enabled: !!id,
  });

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Product Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading product master...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const discountPercent =
    product.mrp > product.selling_price
      ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Product Media Display */}
        <View style={styles.imageCard}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImg} contentFit="contain" />
          ) : (
            <View style={styles.placeholderImg}>
              <Package size={56} color={Colors.textTertiary} />
            </View>
          )}

          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* Title & Brand Header Card */}
        <View style={styles.infoCard}>
          <View style={styles.brandRow}>
            {product.brand?.name && (
              <View style={styles.brandPill}>
                <Text style={styles.brandText}>{product.brand.name}</Text>
              </View>
            )}
            <StatusBadge status={product.status || 'active'} />
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>
          <Text style={styles.categorySub}>
            Category: {product.category?.name || 'FMCG Packaged Goods'} • {product.sub_category || 'General'}
          </Text>

          <View style={styles.priceStrip}>
            <View style={styles.priceCol}>
              <Text style={styles.priceOverline}>SELLING PRICE</Text>
              <Text style={styles.sellingPrice}>₹{product.selling_price?.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceCol}>
              <Text style={styles.priceOverline}>MAX RETAIL PRICE</Text>
              <Text style={styles.mrpText}>₹{product.mrp?.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceCol}>
              <Text style={styles.priceOverline}>DISTRIBUTOR</Text>
              <Text style={styles.distPrice}>₹{product.distributor_price?.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Specifications Table */}
        <View style={styles.specCard}>
          <Text style={styles.sectionHeading}>Packaging & Tax Specifications</Text>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>SKU Reference</Text>
            <Text style={styles.specVal}>{product.sku}</Text>
          </View>

          {product.barcode && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Barcode / EAN</Text>
              <Text style={styles.specVal}>{product.barcode}</Text>
            </View>
          )}

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Packaging Size</Text>
            <Text style={styles.specVal}>{product.pack_size}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Unit of Measure</Text>
            <Text style={styles.specVal}>{product.unit}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>GST Tax Rate</Text>
            <Text style={styles.specVal}>{product.gst_percentage}%</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Minimum Order Qty (MOQ)</Text>
            <Text style={styles.specVal}>{product.min_order_qty} units</Text>
          </View>

          {product.max_order_qty && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Maximum Order Qty</Text>
              <Text style={styles.specVal}>{product.max_order_qty} units</Text>
            </View>
          )}
        </View>

        {/* Bottom Booking Action */}
        <Button
          title="Add to New FMCG Order"
          variant="primary"
          size="xl"
          icon={<ShoppingBag size={18} color={Colors.white} />}
          onPress={() =>
            router.push({
              pathname: '/sales/orders/create' as any,
              params: { preselectProductId: product.id },
            })
          }
          style={styles.bookBtn}
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
  centerContainer: {
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
  imageCard: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.xs,
  },
  productImg: {
    width: '85%',
    height: '85%',
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  discountBadgeText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandPill: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  brandText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  productTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  categorySub: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 12,
    marginTop: 16,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
  },
  priceOverline: {
    ...Typography.captionSm,
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '700',
  },
  sellingPrice: {
    ...Typography.statSm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  mrpText: {
    ...Typography.captionLg,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  distPrice: {
    ...Typography.captionLg,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  priceDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  specCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 18,
    ...Shadows.xs,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  specKey: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  specVal: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  bookBtn: {
    marginBottom: 20,
  },
});
