import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Calendar,
  X,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  TrendingUp,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/common/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { dataService } from '@/services/data-service';
import { useAuth } from '@/features/auth/AuthContext';
import { LedgerTransaction } from '@/types';

const PAYMENT_MODES = ['Cash', 'UPI / QR', 'Cheque', 'Bank Transfer'];

export default function CustomerLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { salesperson } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [selectedMode, setSelectedMode] = useState('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const filteredTransactions = useMemo(() => {
    if (filterType === 'debit') {
      return transactions.filter((t) => t.debit > 0);
    }
    if (filterType === 'credit') {
      return transactions.filter((t) => t.credit > 0);
    }
    return transactions;
  }, [transactions, filterType]);

  const handleRecordPayment = async () => {
    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive payment collection amount.');
      return;
    }

    setSubmittingPayment(true);
    setFormError(null);

    const result = await dataService.recordPayment({
      storeId: id!,
      amount: numAmount,
      paymentMode: selectedMode,
      referenceNumber: refNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      salespersonId: salesperson?.id,
    });

    setSubmittingPayment(false);

    if (result.success) {
      setIsPaymentModalOpen(false);
      setAmount('');
      setRefNumber('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['store-ledger', id] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      Alert.alert(
        'Payment Recorded',
        `₹${numAmount.toLocaleString('en-IN')} payment collection entry logged in store ledger.`
      );
    } else {
      setFormError(result.error || 'Failed to record payment collection.');
    }
  };

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
        title={store?.name || 'Customer Ledger'}
        subtitle="Accounts & Payment Collections"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsPaymentModalOpen(true)}
            style={styles.addPaymentBtn}
          >
            <Plus size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Outstanding Balance Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroOverline}>CURRENT STORE BALANCE</Text>
            <Text style={styles.heroAmount}>
              ₹{currentOutstanding.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.creditLimitText}>
              Credit Limit: ₹{store?.credit_limit?.toLocaleString('en-IN') || '0'}
            </Text>
          </View>

          <Button
            title="Collect"
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon={<Plus size={14} color={Colors.primaryDark} />}
            onPress={() => setIsPaymentModalOpen(true)}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All Entries' },
          { id: 'debit', label: 'Orders (Debit)' },
          { id: 'credit', label: 'Collections (Credit)' },
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
            colors={[Colors.primaryDark]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Ledger Transactions"
              description="Orders and payment collections logged for this retail outlet will appear here."
            />
          ) : undefined
        }
      />

      {/* Record Payment Collection Modal */}
      <Modal
        visible={isPaymentModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPaymentModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment Collection</Text>
            <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)} style={styles.closeBtn}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {formError && (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{formError}</Text>
              </View>
            )}

            <Input
              label="Collection Amount (₹) *"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              leftIcon={<CreditCard size={18} color={Colors.textTertiary} />}
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.modeChipsRow}>
              {PAYMENT_MODES.map((mode) => {
                const isSel = selectedMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setSelectedMode(mode)}
                    style={[styles.modeChip, isSel && styles.modeChipActive]}
                  >
                    <Text style={[styles.modeChipText, isSel && styles.modeChipTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="UPI Ref / Cheque # (Optional)"
              placeholder="e.g. UPI/123456789 or CHQ#44321"
              value={refNumber}
              onChangeText={setRefNumber}
            />

            <Input
              label="Receipt Notes (Optional)"
              placeholder="e.g. Partial collection against invoice #ORD-20261101"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <Button
              title="Log Payment Collection"
              variant="primary"
              size="xl"
              loading={submittingPayment}
              onPress={handleRecordPayment}
              style={{ marginTop: 14, marginBottom: 40 }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  addPaymentBtn: {
    backgroundColor: Colors.primaryDark,
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  heroCard: {
    backgroundColor: Colors.primaryDark,
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
    color: Colors.primary,
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
    color: 'rgba(255, 255, 255, 0.7)',
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
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
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
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
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
