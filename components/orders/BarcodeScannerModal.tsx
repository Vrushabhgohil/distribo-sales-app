import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import {
  X,
  ScanBarcode,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  cart: Map<string, number>;
  onAddProduct: (product: Product, quantity: number) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  products,
  cart,
  onAddProduct,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);

  const resetScan = () => {
    setScannedCode(null);
    setMatchedProduct(null);
    setScanError(null);
    setQty(1);
  };

  const handleClose = () => {
    resetScan();
    onClose();
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannedCode) return;

    const code = (data || '').trim().toLowerCase();
    if (!code) {
      setScannedCode('INVALID');
      setMatchedProduct(null);
      setScanError('Invalid barcode detected. Please scan again.');
      return;
    }

    setScannedCode(data.trim());

    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.trim().toLowerCase() === code) ||
        (p.sku && p.sku.trim().toLowerCase() === code)
    );

    if (!found) {
      setMatchedProduct(null);
      setScanError(`No active product found for scanned barcode "${data.trim()}".`);
      return;
    }

    const isOutOfStock =
      found.stock_quantity !== undefined && found.stock_quantity !== null && found.stock_quantity <= 0;
    if (found.status === 'inactive' || isOutOfStock) {
      setMatchedProduct(null);
      setScanError(`"${found.name}" is currently unavailable or out of stock.`);
      return;
    }

    setScanError(null);
    const minQty = Math.max(1, found.min_order_qty || 1);
    const maxQty = found.max_order_qty;
    const existingQty = cart.get(found.id) || 0;
    let nextQty = existingQty > 0 ? existingQty + 1 : minQty;
    if (maxQty && maxQty > 0) {
      nextQty = Math.min(nextQty, maxQty);
    }

    onAddProduct(found, nextQty);
    handleClose();
  };

  const handleConfirmAdd = () => {
    if (!matchedProduct) return;
    const minQty = Math.max(1, matchedProduct.min_order_qty || 1);
    const maxQty = matchedProduct.max_order_qty;
    let finalQty = Math.max(qty, minQty);
    if (maxQty && maxQty > 0) {
      finalQty = Math.min(finalQty, maxQty);
    }
    onAddProduct(matchedProduct, finalQty);
    handleClose();
  };

  const existingInCart = matchedProduct ? cart.get(matchedProduct.id) || 0 : 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ScanBarcode size={22} color={Colors.primary} />
            <Text style={styles.headerTitle}>Scan Product Barcode</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Camera Scanner Area */}
        <View style={styles.scannerContainer}>
          {!permission ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Checking camera permissions...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <AlertCircle size={40} color={Colors.primary} />
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionText}>
                Grant camera access to scan product barcodes directly into your order.
              </Text>
              <Button
                title="Grant Camera Permission"
                variant="primary"
                size="md"
                onPress={requestPermission}
                style={{ marginTop: 12, width: '100%' }}
              />
              {!permission.canAskAgain && (
                <Button
                  title="Open Device Settings"
                  variant="outline"
                  size="md"
                  onPress={() => Linking.openSettings()}
                  style={{ marginTop: 8, width: '100%' }}
                />
              )}
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
                autofocus="on"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'code93',
                    'itf14',
                    'codabar',
                    'qr',
                    'datamatrix',
                    'pdf417',
                    'aztec',
                  ],
                }}
                onBarcodeScanned={scannedCode ? undefined : handleBarCodeScanned}
              >
                <View style={styles.overlayFrame}>
                  <View style={styles.scanTarget} />
                  <Text style={styles.scanHint}>
                    Point your camera at the product barcode
                  </Text>
                </View>
              </CameraView>
            </View>
          )}
        </View>

        {/* Scan Result / Error Panel */}
        <View style={styles.resultPanel}>
          {scanError && (
            <View style={styles.errorCard}>
              <AlertCircle size={20} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Scan Unsuccessful</Text>
                <Text style={styles.errorMsg}>{scanError}</Text>
              </View>
              <TouchableOpacity onPress={resetScan} style={styles.rescanBtn}>
                <RefreshCw size={16} color={Colors.primary} />
                <Text style={styles.rescanText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {matchedProduct && (
            <View style={styles.matchedCard}>
              <View style={styles.matchedHeader}>
                <CheckCircle2 size={18} color={Colors.secondary} />
                <Text style={styles.matchedBadge}>Product Scanned</Text>
                <TouchableOpacity onPress={resetScan} style={{ marginLeft: 'auto' }}>
                  <Text style={styles.rescanText}>Scan Another</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.matchedName}>{matchedProduct.name}</Text>
              <Text style={styles.matchedMeta}>
                SKU: {matchedProduct.sku}
                {matchedProduct.barcode ? ` • Barcode: ${matchedProduct.barcode}` : ''}
              </Text>
              <Text style={styles.matchedPrice}>
                ₹{matchedProduct.selling_price} / {matchedProduct.pack_size || matchedProduct.unit || 'Unit'}
                {matchedProduct.stock_quantity !== undefined && matchedProduct.stock_quantity !== null
                  ? ` • Stock: ${matchedProduct.stock_quantity}`
                  : ''}
              </Text>

              {existingInCart > 0 && (
                <Text style={styles.duplicateNote}>
                  Already in order ({existingInCart} units). Confirming will update the quantity.
                </Text>
              )}

              <View style={styles.qtyActionRow}>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    onPress={() => setQty((q) => Math.max(matchedProduct.min_order_qty || 1, q - 1))}
                    style={styles.qtyBtn}
                  >
                    <Minus size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="number-pad"
                    value={String(qty)}
                    onChangeText={(val) => {
                      const n = parseInt(val, 10);
                      setQty(isNaN(n) || n < 1 ? 1 : n);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setQty((q) =>
                        matchedProduct.max_order_qty
                          ? Math.min(matchedProduct.max_order_qty, q + 1)
                          : q + 1
                      )
                    }
                    style={styles.qtyBtn}
                  >
                    <Plus size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Button
                  title={existingInCart > 0 ? 'Update Order Qty' : 'Add to Order'}
                  variant="primary"
                  size="md"
                  fullWidth={false}
                  onPress={handleConfirmAdd}
                  style={{ flex: 1, marginLeft: 12 }}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    margin: 16,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlayFrame: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanTarget: {
    width: 240,
    height: 140,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: Radius.xl,
    backgroundColor: 'transparent',
  },
  scanHint: {
    ...Typography.captionBold,
    color: Colors.white,
    marginTop: 14,
    textAlign: 'center',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  permissionText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultPanel: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorBg,
    padding: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  errorTitle: {
    ...Typography.labelMd,
    color: Colors.error,
    fontWeight: '700',
  },
  errorMsg: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  rescanText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  matchedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.secondaryTint,
    ...Shadows.sm,
  },
  matchedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  matchedBadge: {
    ...Typography.captionBold,
    color: Colors.secondary,
  },
  matchedName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  matchedMeta: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  matchedPrice: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  duplicateNote: {
    ...Typography.captionSm,
    color: Colors.goldDark,
    marginTop: 6,
    fontWeight: '600',
  },
  qtyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 4,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  qtyInput: {
    width: 44,
    textAlign: 'center',
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
});
