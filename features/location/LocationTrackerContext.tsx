import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { locationService, CURRENT_CONSENT_VERSION } from '@/services/location-service';
import { LocationConsentModal } from '@/components/location/LocationConsentModal';

export const BACKGROUND_LOCATION_TASK = 'MOTIBA_BACKGROUND_LOCATION_TASK';
export const CONSENT_STORAGE_KEY = '@motiba_location_consent_version';
export const SHIFT_STORAGE_KEY = '@motiba_shift_active';

interface LocationTrackerContextType {
  isTracking: boolean;
  isShiftActive: boolean;
  hasConsent: boolean;
  permissionStatus: Location.PermissionStatus | null;
  permissionDenied: boolean;
  permissionGranted: boolean;
  currentCoords: { latitude: number; longitude: number; accuracy?: number | null } | null;
  location: { latitude: number; longitude: number } | null;
  lastPingTime: string | null;
  trackingStatus: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
  updateIntervalSec: number;
  batteryOptimized: boolean;
  startShift: () => Promise<void>;
  endShift: () => Promise<void>;
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<void>;
  setTrackingStatus: (status: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline') => void;
  setUpdateIntervalSec: (interval: number) => void;
  setBatteryOptimized: (enabled: boolean) => void;
  requestPermissions: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
  openAppSettings: () => Promise<void>;
  showConsentNotice: () => void;
}

const LocationTrackerContext = createContext<LocationTrackerContextType | undefined>(undefined);

// Register background task handler at module level
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('Background location task error:', error);
    return;
  }

  // 1. Session verification: Background task must validate active Supabase session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return;
  }

  // 2. Shift verification: Track strictly during an explicit active work shift
  const shiftActive = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);
  if (shiftActive !== 'true') {
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[locations.length - 1];
      const timestamp = loc.timestamp || Date.now();
      const now = Date.now();

      // Drop stale pings older than 24 hours
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        return;
      }

      try {
        const userRole = await AsyncStorage.getItem('@motiba_user_role');
        const sessionStr = await AsyncStorage.getItem('@motiba_auth_session');

        if (sessionStr) {
          const profile = JSON.parse(sessionStr);
          await locationService.recordLocationPing({
            salespersonId: userRole === 'sales_person' ? profile.id : null,
            deliveryPersonId: userRole === 'delivery_person' ? profile.id : null,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            status: 'travelling',
            recordedAt: new Date(timestamp).toISOString(),
          });
        }
      } catch (err) {
        console.warn('Background ping exception:', err);
      }
    }
  }
});

export const LocationTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole, salesperson, deliveryPerson } = useAuth();
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [consentModalVisible, setConsentModalVisible] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatusState] = useState<
    'online' | 'travelling' | 'on_visit' | 'idle' | 'offline'
  >('online');
  const [updateIntervalSec, setUpdateIntervalSecState] = useState<number>(60);
  const [batteryOptimized, setBatteryOptimizedState] = useState<boolean>(true);

  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastUploadedAtRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);
  const isTrackingRef = useRef<boolean>(false);
  const isShiftActiveRef = useRef<boolean>(false);
  const trackingStatusRef = useRef(trackingStatus);
  trackingStatusRef.current = trackingStatus;
  isShiftActiveRef.current = isShiftActive;

  // Restore consent and shift state on mount
  useEffect(() => {
    let isMounted = true;
    const restoreState = async () => {
      try {
        const storedConsent = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
        const storedShift = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);

        const profileConsent =
          userRole === 'sales_person'
            ? salesperson?.location_consent_version
            : deliveryPerson?.location_consent_version;

        if (isMounted) {
          setHasConsent(Boolean(storedConsent || profileConsent));
          setIsShiftActive(storedShift === 'true');
        }
      } catch {
        // Fallback default to non-shift
      }
    };
    restoreState();
    return () => {
      isMounted = false;
    };
  }, [userRole, salesperson?.location_consent_version, deliveryPerson?.location_consent_version]);

  // Open device settings when permission is permanently denied
  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      console.warn('Unable to open settings:', e);
    }
  };

  const handleAcceptConsent = async () => {
    try {
      setConsentModalVisible(false);
      setHasConsent(true);
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CURRENT_CONSENT_VERSION);
      // Persist to server audit log & profile
      await locationService.recordConsent(CURRENT_CONSENT_VERSION);
      // Proceed to request OS permissions
      await executePermissionRequest();
    } catch (err) {
      console.warn('Accept consent error:', err);
    }
  };

  const handleDismissConsent = () => {
    setConsentModalVisible(false);
  };

  const showConsentNotice = () => {
    setConsentModalVisible(true);
  };

  const executePermissionRequest = async (): Promise<boolean> => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(current.status);

      if (current.status === 'granted') {
        return true;
      }

      if (current.canAskAgain || current.status === Location.PermissionStatus.UNDETERMINED) {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(fgStatus);

        if (fgStatus !== 'granted') {
          return false;
        }

        if (Platform.OS !== 'web') {
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch {}
        }
        return true;
      }

      return false;
    } catch (e) {
      console.warn('Error requesting location permissions:', e);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (!hasConsent) {
      setConsentModalVisible(true);
      return false;
    }
    return await executePermissionRequest();
  };

  const refreshLocation = async (): Promise<void> => {
    try {
      const hasPerm = await requestPermissions();
      if (!hasPerm) return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      setCurrentCoords(coords);
      setLastPingTime(new Date().toLocaleTimeString());

      if (isShiftActiveRef.current) {
        await locationService.recordLocationPing({
          salespersonId: userRole === 'sales_person' ? salesperson?.id : null,
          deliveryPersonId: userRole === 'delivery_person' ? deliveryPerson?.id : null,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: trackingStatusRef.current,
        });
      }
    } catch (err) {
      console.warn('Location refresh error:', err);
    }
  };

  const startShift = async (): Promise<void> => {
    setIsShiftActive(true);
    isShiftActiveRef.current = true;
    await AsyncStorage.setItem(SHIFT_STORAGE_KEY, 'true');
    await startTracking();
  };

  const endShift = async (): Promise<void> => {
    setIsShiftActive(false);
    isShiftActiveRef.current = false;
    await AsyncStorage.setItem(SHIFT_STORAGE_KEY, 'false');
    await stopTracking();
  };

  const startTracking = async (): Promise<{ success: boolean; error?: string }> => {
    if (!hasConsent) {
      setConsentModalVisible(true);
      return { success: false, error: 'Location privacy consent required before tracking.' };
    }

    if (!isShiftActiveRef.current) {
      return { success: false, error: 'Telemetry tracking is restricted to active work shifts.' };
    }

    if (isTrackingRef.current || isStartingRef.current) {
      return { success: true };
    }

    isStartingRef.current = true;

    try {
      const hasPermission = await executePermissionRequest();
      if (!hasPermission) {
        isStartingRef.current = false;
        return {
          success: false,
          error: 'Location permission denied. Please allow location access in device settings.',
        };
      }

      // Initial quick fix
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentCoords({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          accuracy: initial.coords.accuracy,
        });
        setLastPingTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Could not get initial position:', err);
      }

      // Foreground watch
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
      }

      foregroundSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: batteryOptimized
            ? Location.Accuracy.Balanced
            : Location.Accuracy.High,
          timeInterval: updateIntervalSec * 1000,
          distanceInterval: batteryOptimized ? 25 : 10,
        },
        async (loc) => {
          setCurrentCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          });

          // Only upload if shift is actively maintained
          if (!isShiftActiveRef.current) return;

          const now = Date.now();
          if (now - lastUploadedAtRef.current >= updateIntervalSec * 1000) {
            lastUploadedAtRef.current = now;
            setLastPingTime(new Date().toLocaleTimeString());

            await locationService.recordLocationPing({
              salespersonId: userRole === 'sales_person' ? salesperson?.id : null,
              deliveryPersonId: userRole === 'delivery_person' ? deliveryPerson?.id : null,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              status: trackingStatusRef.current,
            });
          }
        }
      );

      // Start background tracking task if supported
      if (Platform.OS !== 'web') {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!isRegistered) {
          try {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: updateIntervalSec * 1000,
              distanceInterval: 50,
              deferredUpdatesInterval: updateIntervalSec * 1000,
              foregroundService: {
                notificationTitle: 'Motiba Shift Active',
                notificationBody: 'Recording verified work route coordinates during active shift.',
                notificationColor: '#970F18',
              },
            });
          } catch (taskErr) {
            console.warn('Background location task registration notice:', taskErr);
          }
        }
      }

      isTrackingRef.current = true;
      setIsTracking(true);
      isStartingRef.current = false;
      return { success: true };
    } catch (err: unknown) {
      isStartingRef.current = false;
      const message = err instanceof Error ? err.message : 'Failed to start location tracker.';
      return { success: false, error: message };
    }
  };

  const stopTracking = async (): Promise<void> => {
    try {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
      }

      if (Platform.OS !== 'web') {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      }

      isTrackingRef.current = false;
      setIsTracking(false);
    } catch (err) {
      console.warn('Error stopping location tracking:', err);
    }
  };

  const setTrackingStatus = (status: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline') => {
    setTrackingStatusState(status);
  };

  const setUpdateIntervalSec = (interval: number) => {
    setUpdateIntervalSecState(interval);
  };

  const setBatteryOptimized = (enabled: boolean) => {
    setBatteryOptimizedState(enabled);
  };

  useEffect(() => {
    return () => {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
      }
    };
  }, []);

  const permissionDenied = permissionStatus === Location.PermissionStatus.DENIED;
  const permissionGranted = permissionStatus === Location.PermissionStatus.GRANTED;

  return (
    <LocationTrackerContext.Provider
      value={{
        isTracking,
        isShiftActive,
        hasConsent,
        permissionStatus,
        permissionDenied,
        permissionGranted,
        currentCoords,
        location: currentCoords ? { latitude: currentCoords.latitude, longitude: currentCoords.longitude } : null,
        lastPingTime,
        trackingStatus,
        updateIntervalSec,
        batteryOptimized,
        startShift,
        endShift,
        startTracking,
        stopTracking,
        setTrackingStatus,
        setUpdateIntervalSec,
        setBatteryOptimized,
        requestPermissions,
        requestPermission: requestPermissions,
        refreshLocation,
        openAppSettings,
        showConsentNotice,
      }}
    >
      {children}
      <LocationConsentModal
        visible={consentModalVisible}
        onAccept={handleAcceptConsent}
        onDismiss={handleDismissConsent}
      />
    </LocationTrackerContext.Provider>
  );
};

export const useLocationTracker = () => {
  const context = useContext(LocationTrackerContext);
  if (!context) {
    throw new Error('useLocationTracker must be used within a LocationTrackerProvider');
  }
  return context;
};
