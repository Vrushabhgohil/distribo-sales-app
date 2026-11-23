import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ShieldCheck, MapPin, Clock, Calendar, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Button } from '@/components/common/Button';

interface LocationConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export const LocationConsentModal: React.FC<LocationConsentModalProps> = ({
  visible,
  onAccept,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <ShieldCheck size={28} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Location Privacy Notice</Text>
            <Text style={styles.subtitle}>
              Digital Personal Data Protection (DPDP) Act 2023 Compliance
            </Text>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Motiba uses your device location exclusively to power beat route navigation, retail store check-ins, and verified order deliveries.
            </Text>

            <View style={styles.pointRow}>
              <MapPin size={18} color={Colors.primary} style={styles.pointIcon} />
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>Purpose Limitation</Text>
                <Text style={styles.pointDescription}>
                  GPS coordinates are captured strictly for verifying store visits, route mileage, and customer delivery drops.
                </Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Clock size={18} color={Colors.primary} style={styles.pointIcon} />
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>Shift-Bound Telemetry</Text>
                <Text style={styles.pointDescription}>
                  Tracking activates only during an explicit active work shift. Tracking unregisters and terminates immediately when your shift ends or upon sign-out.
                </Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Calendar size={18} color={Colors.primary} style={styles.pointIcon} />
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>90-Day Retention Schedule</Text>
                <Text style={styles.pointDescription}>
                  Telemetry data is retained for a maximum of 90 days for operational audit, after which it is permanently purged. Stale pings older than 24 hours are automatically dropped.
                </Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <CheckCircle size={18} color={Colors.primary} style={styles.pointIcon} />
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>Your Rights as a Data Principal</Text>
                <Text style={styles.pointDescription}>
                  You may withdraw background location tracking consent at any time from device app settings or your user profile.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Button
              title="I Agree & Continue"
              variant="primary"
              size="md"
              onPress={onAccept}
              style={styles.acceptButton}
            />
            <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Not Now (Foreground Only)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.heading2,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  content: {
    marginVertical: Spacing.sm,
  },
  description: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pointIcon: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  pointTextWrap: {
    flex: 1,
  },
  pointTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.text,
  },
  pointDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  acceptButton: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dismissText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
