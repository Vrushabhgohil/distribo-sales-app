import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Store as StoreIcon, ChevronDown, CheckCircle2, X } from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Store } from '@/types';

interface OrderStorePickerProps {
  stores: Store[];
  selectedStore: Store | undefined;
  onSelectStore: (storeId: string) => void;
  visible: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const OrderStorePicker: React.FC<OrderStorePickerProps> = ({
  stores,
  selectedStore,
  onSelectStore,
  visible,
  onClose,
  onOpen,
}) => {
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={onOpen} style={styles.storePickerPill}>
        <View style={styles.storeIconWrap}>
          <StoreIcon size={20} color={Colors.primary} />
        </View>
        <View style={styles.storeTextCol}>
          <Text style={styles.storeLabel}>SELECT OUTLET</Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {selectedStore ? selectedStore.name : 'Choose Store...'}
          </Text>
        </View>
        <ChevronDown size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Retail Store</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedStore?.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectStore(item.id);
                      onClose();
                    }}
                    style={[styles.storeItem, isSelected && styles.storeItemActive]}
                  >
                    <View style={styles.storeItemInfo}>
                      <Text style={[styles.storeItemName, isSelected && styles.storeItemNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.storeItemSub}>
                        {item.owner_name} • {item.area}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  storePickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    ...Shadows.xs,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeTextCol: {
    flex: 1,
  },
  storeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.goldDark,
    letterSpacing: 0.8,
  },
  storeName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 15,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 12,
  },
  modalTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    borderRadius: Radius.md,
  },
  storeItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  storeItemInfo: {
    flex: 1,
  },
  storeItemName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  storeItemNameActive: {
    color: Colors.primary,
  },
  storeItemSub: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
