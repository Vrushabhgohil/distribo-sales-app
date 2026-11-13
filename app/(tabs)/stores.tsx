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
  Plus,
  Store as StoreIcon,
  SlidersHorizontal,
  ArrowUpDown,
  MapPin,
  Check,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { StoreCard } from '@/components/ui/StoreCard';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { Store } from '@/types';

type SortOption = 'name_asc' | 'name_desc' | 'credit_high' | 'credit_low';

export default function StoresScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [showSortBar, setShowSortBar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: stores = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['stores', salesperson?.id],
    queryFn: () => dataService.getStores(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Distinct areas for filter pills
  const distinctAreas = useMemo(() => {
    const areas = new Set<string>();
    stores.forEach((s) => {
      if (s.area) areas.add(s.area);
    });
    return Array.from(areas);
  }, [stores]);

  // Distinct store types
  const distinctTypes = useMemo(() => {
    const types = new Set<string>();
    stores.forEach((s) => {
      if (s.store_type) types.add(s.store_type);
    });
    return Array.from(types);
  }, [stores]);

  const filteredStores = useMemo(() => {
    let result = stores.filter((store) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        store.name.toLowerCase().includes(q) ||
        store.owner_name?.toLowerCase().includes(q) ||
        store.area?.toLowerCase().includes(q) ||
        store.city?.toLowerCase().includes(q) ||
        store.mobile?.includes(q);

      const matchesArea =
        selectedArea === 'all' || store.area?.toLowerCase() === selectedArea.toLowerCase();

      const matchesType =
        selectedType === 'all' || store.store_type?.toLowerCase() === selectedType.toLowerCase();

      return matchesSearch && matchesArea && matchesType;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'credit_high') return (b.credit_limit || 0) - (a.credit_limit || 0);
      if (sortBy === 'credit_low') return (a.credit_limit || 0) - (b.credit_limit || 0);
      return 0;
    });

    return result;
  }, [stores, searchQuery, selectedArea, selectedType, sortBy]);

  const renderStoreItem = ({ item }: { item: Store }) => (
    <StoreCard
      store={item}
      onPress={() => router.push(`/stores/${item.id}` as any)}
      onVisitPress={() =>
        router.push({
          pathname: '/stores/visit' as any,
          params: { storeId: item.id },
        })
      }
      onOrderPress={() =>
        router.push({
          pathname: '/orders/create' as any,
          params: { storeId: item.id },
        })
      }
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Beat Stores"
        subtitle={`${filteredStores.length} retail outlets in territory`}
        showTrackingIndicator
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/stores/add' as any)}
            style={styles.addStoreBtn}
          >
            <Plus size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar & Action Filter Row */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search store name, owner, area, phone..."
          showFilter
          onFilterPress={() => setShowSortBar(!showSortBar)}
        />

        {/* Territory Area Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <CategoryPill
            label="All Areas"
            count={stores.length}
            isSelected={selectedArea === 'all'}
            onPress={() => setSelectedArea('all')}
          />

          {distinctAreas.map((area) => {
            const count = stores.filter((s) => s.area === area).length;
            return (
              <CategoryPill
                key={area}
                label={area}
                count={count}
                isSelected={selectedArea === area}
                onPress={() => setSelectedArea(area)}
              />
            );
          })}
        </ScrollView>

        {/* Optional Expandable Sorting & Type Filters */}
        {showSortBar && (
          <View style={styles.sortPanel}>
            <View style={styles.sortHeader}>
              <Text style={styles.sortTitle}>Sort Outlets</Text>
              <TouchableOpacity onPress={() => setShowSortBar(false)}>
                <Text style={styles.sortClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptionsRow}>
              {[
                { id: 'name_asc', label: 'Name (A-Z)' },
                { id: 'credit_high', label: 'Highest Credit' },
                { id: 'credit_low', label: 'Lowest Credit' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setSortBy(opt.id as SortOption)}
                  style={[
                    styles.sortChip,
                    sortBy === opt.id && styles.sortChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      sortBy === opt.id && styles.sortChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Outlet List */}
      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item.id}
        renderItem={renderStoreItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primaryDark]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<StoreIcon size={42} color={Colors.textTertiary} />}
              title={searchQuery ? 'No matching retail stores' : 'No stores in your beat'}
              description={
                searchQuery
                  ? 'Try searching with another keyword or clearing your area filter.'
                  : 'Enroll a new retail store to your beat route to start booking orders.'
              }
              actionTitle="Register New Store"
              onAction={() => router.push('/stores/add' as any)}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addStoreBtn: {
    backgroundColor: Colors.primaryDark,
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterScroll: {
    paddingVertical: 12,
  },
  sortPanel: {
    paddingTop: 8,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sortTitle: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
  },
  sortClose: {
    ...Typography.labelSm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sortChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '50',
  },
  sortChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  listContent: {
    padding: 18,
    paddingBottom: 40,
  },
});
