import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Product } from '@/types';
import { Image } from 'expo-image';
import { Minus, Package, Plus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface ProductCardProps {
  product: Product;
  quantity?: number;
  onPress?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  onQuantityChange?: (qty: number) => void;
  layout?: 'grid' | 'list';
  style?: ViewStyle;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity = 0,
  onPress,
  onAdd,
  onRemove,
  onQuantityChange,
  layout = 'grid',
  style,
}) => {
  const discount = product.mrp > product.selling_price
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : 0;

  if (layout === 'list') {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.listCard, style]}>
        <View style={styles.listImageBox}>
          


          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.listImage} contentFit="cover" />
          ) : (
            <View style={styles.listImagePlaceholder}>
              <Package size={24} color={Colors.textTertiary} />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountTag}>
              <Text style={styles.discountText}>{discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.listInfo}>
          {product.brand?.name && (
            <Text style={styles.brandLabel} numberOfLines={1}>{product.brand.name}</Text>
          )}
          <Text style={styles.listName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.packInfo}>{product.pack_size} • {product.unit}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.sellingPrice}>₹{product.selling_price}</Text>
            {discount > 0 && <Text style={styles.mrpPrice}>₹{product.mrp}</Text>}
          </View>
        </View>

        {/* Quantity Controls */}
        <View style={styles.listQtyCol}>
          {quantity > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={onRemove} activeOpacity={0.7}>
                <Minus size={14} color={Colors.primaryDark} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtnFill} onPress={onAdd} activeOpacity={0.7}>
                <Plus size={14} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.7}>
              <Plus size={16} color={Colors.primaryDark} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Grid layout
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.gridCard, style]}>
      <View style={styles.gridImageBox}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.gridImage} contentFit="cover" />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Package size={28} color={Colors.textTertiary} />
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>{discount}%</Text>
          </View>
        )}
      </View>

      <View style={styles.gridInfo}>
        {product.brand?.name && (
          <Text style={styles.brandLabel} numberOfLines={1}>{product.brand.name}</Text>
        )}
        <Text style={styles.gridName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.packInfo}>{product.pack_size}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.sellingPrice}>₹{product.selling_price}</Text>
          {discount > 0 && <Text style={styles.mrpPrice}>₹{product.mrp}</Text>}
        </View>
      </View>

      {/* Grid Add Button */}
      {quantity > 0 ? (
        <View style={styles.gridQtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onRemove} activeOpacity={0.7}>
            <Minus size={13} color={Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtnFill} onPress={onAdd} activeOpacity={0.7}>
            <Plus size={13} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.gridAddBtn} onPress={onAdd} activeOpacity={0.7}>
          <Plus size={14} color={Colors.primaryDark} />
          <Text style={styles.gridAddText}>Add</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ─── LIST LAYOUT ────────────────
  listCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    alignItems: 'center',
    ...Shadows.xs,
  },
  listImageBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSecondary,
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  listName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  listQtyCol: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },

  // ─── GRID LAYOUT ────────────────
  gridCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  gridImageBox: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceSecondary,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInfo: {
    padding: 10,
    gap: 2,
  },
  gridName: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
  },
  gridQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  gridAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  gridAddText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
  },

  // ─── SHARED ─────────────────────
  brandLabel: {
    ...Typography.captionSm,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  packInfo: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sellingPrice: {
    ...Typography.statSm,
    color: Colors.textPrimary,
  },
  mrpPrice: {
    ...Typography.captionMd,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.xs,
  },
  discountText: {
    ...Typography.captionSm,
    color: Colors.white,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  addBtnText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  qtyBtnFill: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    ...Typography.statSm,
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
});
