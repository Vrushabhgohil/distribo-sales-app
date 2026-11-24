import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Package, Star, Plus } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Product } from '@/types';

interface SalesBestsellersProps {
  products: Product[];
}

export const SalesBestsellers: React.FC<SalesBestsellersProps> = ({ products }) => {
  const router = useRouter();

  if (products.length === 0) return null;

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Beat Bestsellers</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/sales/products' as any)}>
          <Text style={styles.viewAllText}>See all &gt;</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bestsellerScroll}>
        {products.map((item: Product) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => router.push(`/sales/products/${item.id}` as any)}
            style={styles.bestsellerCard}
          >
            <View style={styles.bestsellerImgWrap}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.bestsellerImg} contentFit="cover" />
              ) : (
                <View style={styles.bestsellerImgPlaceholder}>
                  <Package size={32} color={Colors.textTertiary} />
                </View>
              )}
              <View style={styles.ratingBadge}>
                <Star size={11} color={Colors.gold} fill={Colors.gold} />
                <Text style={styles.ratingText}>4.9</Text>
              </View>
            </View>

            <View style={styles.bestsellerInfo}>
              <Text style={styles.bestsellerName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.bestsellerPack}>{item.pack_size || item.unit}</Text>

              <View style={styles.bestsellerBottom}>
                <View>
                  <Text style={styles.bestsellerPrice}>₹{item.selling_price}</Text>
                  {item.mrp > item.selling_price && (
                    <Text style={styles.bestsellerMrp}>₹{item.mrp}</Text>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/sales/orders/create' as any,
                      params: { productId: item.id },
                    })
                  }
                  style={styles.addCircleBtn}
                >
                  <Plus size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 13,
  },
  bestsellerScroll: {
    paddingRight: 16,
    gap: 12,
    marginBottom: 24,
  },
  bestsellerCard: {
    width: 156,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  bestsellerImgWrap: {
    height: 120,
    backgroundColor: Colors.surfaceSecondary,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestsellerImg: {
    width: '100%',
    height: '100%',
  },
  bestsellerImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  bestsellerInfo: {
    padding: 10,
  },
  bestsellerName: {
    ...Typography.labelLg,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 17,
    fontWeight: '700',
  },
  bestsellerPack: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  bestsellerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestsellerPrice: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  bestsellerMrp: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    fontSize: 10,
  },
  addCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
});
