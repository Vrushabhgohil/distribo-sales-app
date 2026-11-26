import { Header } from '@/components/common/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { dataService } from '@/services/data-service';
import { LedgerTransaction } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Lock,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');

  const { data: store } = useQuery({
    queryKey: ['store', id],
    queryFn: () => dataService.getStoreById(id!),
    enabled: !!id,
  });

  const {
    data: transactions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['store-ledger', id],
    queryFn: () => dataService.getStoreLedger(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const currentOutstanding =
    transactions.length > 0 ? transactions[0].running_balance : 0;
  const creditLimit = store?.credit_limit || 0;
  const availableCredit = Math.max(0, creditLimit - currentOutstanding);

  const filteredTransactions = useMemo(() => {
    if (filterType === 'debit') {
      return transactions.filter((t) => t.debit > 0);
    }
    if (filterType === 'credit') {
      return transactions.filter((t) => t.credit > 0);
    }
    return transactions;
  }, [transactions, filterType]);

  const renderTransactionItem = ({ item }: { item: LedgerTransaction }) => {
    const isDebit = item.debit > 0;

    return (
      <View style={styles.txnCard}>
        <View style={styles.txnRow}>
          <View
            style={[
              styles.txnIconWrap,
              { backgroundColor: isDebit ? Colors.goldLight : Colors.secondaryLight },
            ]}
          >
            {isDebit ? (
              <ArrowUpRight size={18} color={Colors.goldDark} />
            ) : (
              <ArrowDownRight size={18} color={Colors.secondary} />
            )}
          </View>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.txnDesc} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.txnDate}>
              {new Date(item.transaction_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {item.reference_type ? ` • ${item.reference_type}` : ''}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                styles.txnAmount,
                { color: isDebit ? Colors.goldDark : Colors.secondary },
              ]}
            >
              {isDebit ? '+' : '-'}₹
              {(isDebit ? item.debit : item.credit)?.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.runningBal}>
              Bal: ₹{item.running_balance?.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={store?.name || 'Store Ledger'}
        subtitle="Credit & Account Statement (View Only)"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.viewOnlyBadge}>
            <Lock size={12} color={Colors.textSecondary} />
            <Text style={styles.viewOnlyText}>View Only</Text>
          </View>
        }
      />

      {/* Outstanding Balance Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroOverline}>CURRENT OUTSTANDING</Text>
            <Text style={styles.heroAmount}>
              ₹{currentOutstanding.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.heroOverline}>AVAILABLE CREDIT</Text>
            <Text style={[styles.heroAmount, { fontSize: 20 }]}>
              ₹{availableCredit.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <Text style={styles.creditLimitText}>
            Credit Limit: ₹{creditLimit.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.creditLimitText}>
            Terms: {store?.payment_terms || 'Net 30'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All Entries' },
          { id: 'debit', label: 'Orders (Debit)' },
          { id: 'credit', label: 'Payments (Credit)' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilterType(f.id as any)}
            style={[styles.filterChip, filterType === f.id && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterType === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ledger Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <MotibaLoader size="medium" message="Loading store ledger..." />
          ) : (
            <EmptyState
              title="No Ledger Transactions"
              description="Orders and Admin-recorded payments for this retail outlet will appear here."
            />
          )
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  viewOnlyText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: Radius['2xl'],
    padding: 18,
    ...Shadows.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroOverline: {
    ...Typography.captionSm,
    color: Colors.gold,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroAmount: {
    ...Typography.displayMd,
    color: Colors.white,
    marginTop: 2,
  },
  creditLimitText: {
    ...Typography.captionSm,
    color: Colors.warmIvory,
    opacity: 0.95,
    fontWeight: '500',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  txnCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    ...Shadows.xs,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnDesc: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  txnDate: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  txnAmount: {
    ...Typography.statSm,
  },
  runningBal: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  modalError: {
    backgroundColor: Colors.errorBg,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  modalErrorText: {
    ...Typography.captionSm,
    color: Colors.error,
    fontWeight: '700',
  },
  inputLabel: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
});
