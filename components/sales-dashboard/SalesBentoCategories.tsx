import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Wheat, Sparkles, Flame, Droplets } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';

export const SalesBentoCategories: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.bentoGrid}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/sales/products' as any)}
        style={[styles.bentoCard, styles.bentoGrains]}
      >
        <View style={styles.bentoTextCol}>
          <Text style={styles.bentoTitle}>Grains & Dals</Text>
          <Text style={styles.bentoSub}>Basmati, toor & lentils</Text>
          <View style={[styles.bentoBadge, { backgroundColor: Colors.goldLight }]}>
            <Text style={[styles.bentoBadgeText, { color: Colors.goldDark }]}>Pure Indian</Text>
          </View>
        </View>
        <View style={[styles.bentoIconCircle, { backgroundColor: Colors.goldLight }]}>
          <Wheat size={26} color={Colors.goldDark} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/sales/products' as any)}
        style={[styles.bentoCard, styles.bentoAtta]}
      >
        <View style={styles.bentoTextCol}>
          <Text style={styles.bentoTitle}>Pure Atta</Text>
          <Text style={styles.bentoSub}>Chakki stone ground</Text>
          <View style={[styles.bentoBadge, { backgroundColor: Colors.secondaryLight }]}>
            <Text style={[styles.bentoBadgeText, { color: Colors.secondary }]}>100% Whole</Text>
          </View>
        </View>
        <View style={[styles.bentoIconCircle, { backgroundColor: Colors.secondaryLight }]}>
          <Sparkles size={26} color={Colors.secondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/sales/products' as any)}
        style={[styles.bentoCard, styles.bentoSpices]}
      >
        <View style={styles.bentoTextCol}>
          <Text style={styles.bentoTitle}>Royal Spices</Text>
          <Text style={styles.bentoSub}>Turmeric, chilli & blends</Text>
          <View style={[styles.bentoBadge, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[styles.bentoBadgeText, { color: Colors.primary }]}>Aromatic</Text>
          </View>
        </View>
        <View style={[styles.bentoIconCircle, { backgroundColor: Colors.primaryLight }]}>
          <Flame size={26} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/sales/products' as any)}
        style={[styles.bentoCard, styles.bentoOils]}
      >
        <View style={styles.bentoTextCol}>
          <Text style={styles.bentoTitle}>Edible Oils</Text>
          <Text style={styles.bentoSub}>Mustard, groundnut</Text>
          <View style={[styles.bentoBadge, { backgroundColor: Colors.goldLight }]}>
            <Text style={[styles.bentoBadgeText, { color: Colors.goldDark }]}>Cold Pressed</Text>
          </View>
        </View>
        <View style={[styles.bentoIconCircle, { backgroundColor: Colors.goldLight }]}>
          <Droplets size={26} color={Colors.goldDark} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  bentoCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Radius.xl,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 115,
    borderWidth: 1,
    ...Shadows.sm,
  },
  bentoGrains: {
    backgroundColor: '#FDFCF7',
    borderColor: '#EFEAD8',
  },
  bentoAtta: {
    backgroundColor: '#F7FCF8',
    borderColor: '#D8EFE0',
  },
  bentoSpices: {
    backgroundColor: '#FCF7F7',
    borderColor: '#EFD8D8',
  },
  bentoOils: {
    backgroundColor: '#FCFAF7',
    borderColor: '#EFE7D8',
  },
  bentoTextCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bentoTitle: {
    ...Typography.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  bentoSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  bentoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  bentoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bentoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
});
