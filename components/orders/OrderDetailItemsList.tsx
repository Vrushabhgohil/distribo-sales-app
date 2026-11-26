import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Package } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { OrderItem } from '@/types';

interface OrderDetailItemsListProps {
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
}

export const OrderDetailItemsList: React.FC<OrderDetailItemsListProps> = ({
  items,
  totalAmount,
  discountAmount = 0,
  taxAmount = 0,
}) => {
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>
        Ordered Products ({items.length} lines, {totalUnits} units)
      </Text>

      {items.length > 0 ? (
        items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            {item.product?.image_url ? (
              <Image
                source={{ uri: item.product.image_url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <Package size={20} color={Colors.primary} />
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.product?.name || 'Product Item'}</Text>
              <Text style={styles.itemMeta}>
                SKU: {item.product?.sku || 'N/A'} • Unit: {item.product?.unit || item.product?.pack_size || 'Pack'}
              </Text>
              <Text style={styles.itemQtyPrice}>
                Ordered: {item.quantity} × ₹{item.unit_price}
                {item.delivered_quantity > 0
                  ? ` • Delivered: ${item.delivered_quantity} • Remaining: ${Math.max(0, item.quantity - item.delivered_quantity)}`
                  : ''}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemTotal}>₹{item.total_price?.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyItemsText}>No products recorded in this order.</Text>
      )}

      <View style={styles.divider} />

      <Text style={[styles.sectionHeading, { marginBottom: 8 }]}>Order Summary</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Items</Text>
        <Text style={styles.summaryVal}>{totalUnits} units</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
      </View>

      {discountAmount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount Applied</Text>
          <Text style={[styles.summaryVal, { color: Colors.success }]}>
            -₹{discountAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      {taxAmount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Applicable GST Tax</Text>
          <Text style={styles.summaryVal}>₹{taxAmount.toLocaleString('en-IN')}</Text>
        </View>
      )}

      <View style={[styles.summaryRow, styles.finalTotalRow]}>
        <Text style={styles.totalLabel}>Final Order Amount</Text>
        <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  productPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemMeta: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemQtyPrice: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemTotal: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  emptyItemsText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  summaryVal: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  finalTotalRow: {
    marginTop: 8,
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
});
