import * as Crypto from 'expo-crypto';
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  X,
} from 'lucide-react-native';
import { Colors, Typography, Radius, Shadows } from '@/constants/theme';

export interface CustomAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface AlertPayload {
  id: string;
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
  options?: CustomAlertOptions;
}

// Global alert listener for imperative calls
type AlertListener = (payload: AlertPayload | null) => void;
let alertListener: AlertListener | null = null;

export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: CustomAlertOptions
  ) => {
    if (alertListener) {
      alertListener({
        id: Crypto.randomUUID(),
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
        options,
      });
    } else {
      // Fallback if provider is not yet mounted
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm(
          message ? `${title}\n\n${message}` : title
        );
        if (confirmed) {
          const actionBtn = buttons?.find((b) => b.style !== 'cancel') || buttons?.[0];
          actionBtn?.onPress?.();
        } else {
          const cancelBtn = buttons?.find((b) => b.style === 'cancel');
          cancelBtn?.onPress?.();
        }
      }
    }
  },
};

// Aliased export for drop-in replacement of React Native's Alert
export const Alert = CustomAlert;

interface AlertContextType {
  showAlert: (
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: CustomAlertOptions
  ) => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: CustomAlert.alert,
});

export const useAlert = () => useContext(AlertContext);

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentAlert, setCurrentAlert] = useState<AlertPayload | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.92))[0];

  useEffect(() => {
    alertListener = (payload) => {
      setCurrentAlert(payload);
    };
    return () => {
      alertListener = null;
    };
  }, []);

  const handleOpen = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleClose = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 160,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setCurrentAlert(null);
        if (callback) callback();
      });
    },
    [fadeAnim, scaleAnim]
  );

  useEffect(() => {
    if (currentAlert) {
      handleOpen();
    }
  }, [currentAlert, handleOpen]);

  // Determine icon & theme from title / message / buttons
  const getAlertVariant = () => {
    if (!currentAlert) return { icon: <Info size={24} color={Colors.primary} />, bg: '#FAF0F1' };

    if (currentAlert.options?.type) {
      switch (currentAlert.options.type) {
        case 'success':
          return {
            icon: <CheckCircle2 size={24} color={Colors.success} />,
            bg: '#EAF5EE',
          };
        case 'warning':
          return {
            icon: <AlertTriangle size={24} color={Colors.goldDark} />,
            bg: '#FAF4E8',
          };
        case 'error':
          return {
            icon: <AlertCircle size={24} color={Colors.primary} />,
            bg: '#FAF0F1',
          };
        default:
          return {
            icon: <Info size={24} color={Colors.primary} />,
            bg: '#FAF0F1',
          };
      }
    }

    const text = `${currentAlert.title} ${currentAlert.message || ''}`.toLowerCase();
    const hasDestructive = currentAlert.buttons?.some((b) => b.style === 'destructive');

    if (text.includes('log out') || text.includes('logout') || text.includes('sign out')) {
      return {
        icon: <LogOut size={24} color={Colors.primary} />,
        bg: '#FAF0F1',
      };
    }
    if (text.includes('success') || text.includes('confirmed') || text.includes('placed') || text.includes('registered') || text.includes('saved')) {
      return {
        icon: <CheckCircle2 size={24} color={Colors.success} />,
        bg: '#EAF5EE',
      };
    }
    if (text.includes('warning') || text.includes('verify') || text.includes('required') || text.includes('empty')) {
      return {
        icon: <AlertTriangle size={24} color={Colors.goldDark} />,
        bg: '#FAF4E8',
      };
    }
    if (hasDestructive || text.includes('error') || text.includes('fail') || text.includes('cancel')) {
      return {
        icon: <AlertCircle size={24} color={Colors.primary} />,
        bg: '#FAF0F1',
      };
    }

    return {
      icon: <Info size={24} color={Colors.primary} />,
      bg: '#FAF0F1',
    };
  };

  const variant = getAlertVariant();
  const buttons = currentAlert?.buttons || [{ text: 'OK', style: 'default' }];
  const isMultiButton = buttons.length > 1;

  return (
    <AlertContext.Provider value={{ showAlert: CustomAlert.alert }}>
      {children}

      <Modal
        visible={Boolean(currentAlert)}
        transparent
        animationType="none"
        onRequestClose={() => {
          if (currentAlert?.options?.cancelable !== false) {
            handleClose(currentAlert?.options?.onDismiss);
          }
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (currentAlert?.options?.cancelable !== false) {
              handleClose(currentAlert?.options?.onDismiss);
            }
          }}
        >
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.card,
                  {
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* Dismiss X button if cancelable */}
                {currentAlert?.options?.cancelable !== false && (
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => handleClose(currentAlert?.options?.onDismiss)}
                    activeOpacity={0.7}
                  >
                    <X size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Badge Icon */}
                <View style={[styles.iconCircle, { backgroundColor: variant.bg }]}>
                  {variant.icon}
                </View>

                {/* Title & Message */}
                <Text style={styles.title}>{currentAlert?.title}</Text>
                {currentAlert?.message ? (
                  <Text style={styles.message}>{currentAlert.message}</Text>
                ) : null}

                {/* Action Buttons */}
                <View
                  style={[
                    styles.buttonContainer,
                    isMultiButton && styles.buttonContainerMulti,
                  ]}
                >
                  {buttons.map((btn, index) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';

                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        onPress={() => {
                          handleClose(btn.onPress);
                        }}
                        style={[
                          styles.actionBtn,
                          isCancel && styles.actionBtnCancel,
                          isDestructive && styles.actionBtnDestructive,
                          !isCancel && !isDestructive && styles.actionBtnPrimary,
                          isMultiButton && styles.actionBtnFlex,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            isCancel && styles.actionBtnTextCancel,
                            (isDestructive || (!isCancel && !isDestructive)) &&
                              styles.actionBtnTextPrimary,
                          ]}
                        >
                          {btn.text || 'OK'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(29, 19, 14, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
  message: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 22,
    gap: 10,
  },
  buttonContainerMulti: {
    flexDirection: 'row',
  },
  actionBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFlex: {
    flex: 1,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  actionBtnDestructive: {
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  actionBtnCancel: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    ...Typography.buttonSm,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    color: Colors.white,
  },
  actionBtnTextCancel: {
    color: Colors.textSecondary,
  },
});
