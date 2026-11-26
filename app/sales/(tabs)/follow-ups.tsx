import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Plus,
  Store as StoreIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MotibaLoader } from '@/components/common/MotibaLoader';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { FollowUp, Store } from '@/types';

const TAB_FILTERS = ['Pending', 'Upcoming', 'Overdue', 'Completed'];

export default function FollowUpsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { salesperson } = useAuth();
  const [activeTab, setActiveTab] = useState('Pending');
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [followUpDate, setFollowUpDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [followUpTime, setFollowUpTime] = useState('11:00 AM');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: followUps = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['follow-ups', salesperson?.id],
    queryFn: () => dataService.getFollowUps(salesperson?.id || ''),
    enabled: !!salesperson?.id,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores', salesperson?.id],
    queryFn: () => dataService.getStores(salesperson?.id),
    enabled: !!salesperson?.id,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => dataService.updateFollowUpStatus(id, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((item) => {
      if (activeTab === 'Pending') {
        return item.status === 'pending' && item.follow_up_date >= todayStr;
      }
      if (activeTab === 'Upcoming') {
        return item.follow_up_date > todayStr && item.status !== 'completed';
      }
      if (activeTab === 'Overdue') {
        return (
          (item.follow_up_date < todayStr || item.status === 'overdue') &&
          item.status !== 'completed'
        );
      }
      if (activeTab === 'Completed') {
        return item.status === 'completed';
      }
      return true;
    });
  }, [followUps, activeTab, todayStr]);

  const handleCreateFollowUp = async () => {
    if (!selectedStoreId) {
      setFormError('Please select a retail outlet.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please enter a reason or task purpose.');
      return;
    }

    setFormError(null);
    const res = await dataService.createFollowUp({
      store_id: selectedStoreId,
      salesperson_id: salesperson?.id || '',
      follow_up_date: followUpDate,
      follow_up_time: followUpTime,
      reason: reason.trim(),
      notes: notes.trim() || null,
      priority,
      status: 'pending',
    });

    if (res.success) {
      setIsModalOpen(false);
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    } else {
      setFormError(res.error || 'Failed to schedule task.');
    }
  };

  const renderFollowUpItem = ({ item }: { item: FollowUp }) => {
    const isCompleted = item.status === 'completed';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (item.store_id) {
            router.push(`/sales/stores/${item.store_id}` as any);
          }
        }}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.storeName}>{item.store?.name || 'Retail Outlet'}</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
          <StatusBadge status={item.priority} label={item.priority.toUpperCase()} />
        </View>

        {item.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        <View style={styles.cardBottom}>
          <View style={styles.timeRow}>
            <Clock size={13} color={Colors.textTertiary} />
            <Text style={styles.dateTimeText}>
              {new Date(item.follow_up_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
              {item.follow_up_time ? ` at ${item.follow_up_time}` : ''}
            </Text>
          </View>

          {!isCompleted ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => completeMutation.mutate(item.id)}
              style={styles.doneBtn}
            >
              <CheckCircle2 size={14} color={Colors.primary} />
              <Text style={styles.doneBtnText}>Mark Done</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedTag}>
              <CheckCircle2 size={13} color={Colors.success} />
              <Text style={styles.completedTagText}>Completed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Follow-ups & Tasks"
        subtitle={`${filteredFollowUps.length} follow-ups in view`}
        showTrackingIndicator
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (stores.length > 0 && !selectedStoreId) {
                setSelectedStoreId(stores[0].id);
              }
              setIsModalOpen(true);
            }}
            style={styles.addBtn}
          >
            <Plus size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TAB_FILTERS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filteredFollowUps}
        keyExtractor={(item) => item.id}
        renderItem={renderFollowUpItem}
        contentContainerStyle={[
          styles.listContent,
          filteredFollowUps.length === 0 && styles.listContentEmpty,
        ]}
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
            <MotibaLoader size="medium" message="Loading beat follow-ups..." />
          ) : (
            <EmptyState
              icon={<CalendarClock size={42} color={Colors.textTertiary} />}
              title={`No ${activeTab.toLowerCase()} tasks`}
              description="Keep on top of store payment collections, order restocking reminders, and beat meetings."
              actionTitle="Schedule New Task"
              onAction={() => {
                if (stores.length > 0 && !selectedStoreId) {
                  setSelectedStoreId(stores[0].id);
                }
                setIsModalOpen(true);
              }}
            />
          )
        }
      />

      {/* Add Follow-Up Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Follow-up Task</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsModalOpen(false)}
              style={styles.closeBtn}
            >
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {formError && (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{formError}</Text>
              </View>
            )}

            {/* Select Store */}
            <Text style={styles.inputLabel}>Select Retail Store</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
            >
              {stores.map((s) => {
                const isSelected = selectedStoreId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedStoreId(s.id)}
                    style={[
                      styles.storeOptionPill,
                      isSelected && styles.storeOptionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.storeOptionText,
                        isSelected && styles.storeOptionTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Input
              label="Follow-up Date (YYYY-MM-DD)"
              value={followUpDate}
              onChangeText={setFollowUpDate}
              placeholder="e.g. 2026-11-04"
            />

            <Input
              label="Preferred Time"
              value={followUpTime}
              onChangeText={setFollowUpTime}
              placeholder="e.g. 11:30 AM"
            />

            <Input
              label="Task Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Payment collection / Stock check"
            />

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details for this visit"
              multiline
              numberOfLines={3}
            />

            {/* Priority Selector */}
            <Text style={styles.inputLabel}>Priority Level</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                const isSel = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.7}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityOption,
                      isSel && styles.priorityOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        isSel && styles.priorityOptionTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Schedule Follow-up"
              variant="primary"
              size="xl"
              onPress={handleCreateFollowUp}
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
  addBtn: {
    backgroundColor: Colors.primary,
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: 18,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  storeName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  reasonText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  notesText: {
    ...Typography.captionLg,
    color: Colors.textSecondary,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateTimeText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  doneBtnText: {
    ...Typography.buttonSm,
    color: Colors.primary,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedTagText: {
    ...Typography.captionSm,
    color: Colors.success,
    fontWeight: '700',
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
  storeOptionPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  storeOptionPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  storeOptionText: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  storeOptionTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  priorityOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priorityOptionText: {
    ...Typography.captionSm,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  priorityOptionTextActive: {
    color: Colors.white,
  },
});
