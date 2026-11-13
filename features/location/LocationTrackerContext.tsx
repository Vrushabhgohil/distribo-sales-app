import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';

export const BACKGROUND_LOCATION_TASK = 'DISTRIBO_BACKGROUND_LOCATION_TASK';

interface LocationTrackerContextType {
  isTracking: boolean;
  permissionStatus: Location.PermissionStatus | null;
  permissionDenied: boolean;
  currentCoords: { latitude: number; longitude: number; accuracy?: number | null } | null;
  lastPingTime: string | null;
  trackingStatus: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
  updateIntervalSec: number;
  batteryOptimized: boolean;
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<void>;
  setTrackingStatus: (status: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline') => void;
  setUpdateIntervalSec: (interval: number) => void;
  setBatteryOptimized: (enabled: boolean) => void;
  requestPermissions: () => Promise<boolean>;
  openAppSettings: () => Promise<void>;
}

const LocationTrackerContext = createContext<LocationTrackerContextType | undefined>(undefined);

// Register background task handler at module level
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[locations.length - 1];
      try {
        const storedSp = await AsyncStorage.getItem('@distribo_salesperson_session');
        if (storedSp) {
          const sp = JSON.parse(storedSp);
          if (sp.id) {
            await dataService.recordLocationPing({
              salespersonId: sp.id,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              status: 'travelling',
            });
          }
        }
      } catch (err) {
        console.warn('Background ping exception:', err);
      }
    }
  }
});

export const LocationTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { salesperson } = useAuth();
  const [isTracking, setIsTracking] = useState<boolean>(false);
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
  const trackingStatusRef = useRef(trackingStatus);
  trackingStatusRef.current = trackingStatus;

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

  const requestPermissions = async (): Promise<boolean> => {
    try {
      // First check existing permissions without prompt
      const current = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(current.status);

      if (current.status === 'granted') {
        return true;
      }

      // If undetermined or can ask, request through native dialog
      if (current.canAskAgain || current.status === Location.PermissionStatus.UNDETERMINED) {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(fgStatus);

        if (fgStatus !== 'granted') {
          return false;
        }

        // Optional background permission on native devices
        if (Platform.OS !== 'web') {
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch {}
        }
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const startTracking = async (): Promise<{ success: boolean; error?: string }> => {
    if (!salesperson) {
      return { success: false, error: 'Cannot track location when signed out.' };
    }

    if (isStartingRef.current || isTrackingRef.current) {
      return { success: true };
    }

    isStartingRef.current = true;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        isStartingRef.current = false;
        return {
          success: false,
          error: 'Location permission was denied. Please enable location permissions to record your beat visits.',
        };
      }

      // 1. Get initial position immediately
      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: batteryOptimized ? Location.Accuracy.Balanced : Location.Accuracy.High,
      });

      const coords = {
        latitude: initialPos.coords.latitude,
        longitude: initialPos.coords.longitude,
        accuracy: initialPos.coords.accuracy,
      };

      setCurrentCoords(coords);
      setLastPingTime(new Date().toISOString());
      lastUploadedAtRef.current = Date.now();

      // Send initial coordinate to Supabase
      await dataService.recordLocationPing({
        salespersonId: salesperson.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        status: trackingStatusRef.current,
      });

      // 2. Clear any lingering foreground watcher
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
      }

      const intervalMs = updateIntervalSec * 1000;
      const distanceInterval = batteryOptimized ? 25 : 10; // meters

      foregroundSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: batteryOptimized ? Location.Accuracy.Balanced : Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval,
        },
        async (loc) => {
          const now = Date.now();
          const newCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          };
          setCurrentCoords(newCoords);

          // Throttle network writes according to battery-conscious interval
          if (now - lastUploadedAtRef.current >= intervalMs) {
            lastUploadedAtRef.current = now;
            setLastPingTime(new Date().toISOString());

            await dataService.recordLocationPing({
              salespersonId: salesperson.id,
              latitude: newCoords.latitude,
              longitude: newCoords.longitude,
              status: trackingStatusRef.current,
            });
          }
        }
      );

      // 3. Register background tracking on native platforms if supported
      if (Platform.OS !== 'web') {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
          if (!isRegistered) {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: intervalMs * 2,
              distanceInterval: 50,
              deferredUpdatesInterval: intervalMs * 2,
              foregroundService: {
                notificationTitle: 'Distribo Sales Field Tracking',
                notificationBody: 'Recording beat route coordinates for Admin Portal dispatch.',
                notificationColor: '#166534',
              },
            });
          }
        } catch (bgErr) {
          console.log('Background updates registration note:', bgErr);
        }
      }

      isTrackingRef.current = true;
      setIsTracking(true);
      isStartingRef.current = false;
      return { success: true };
    } catch (err: any) {
      console.warn('Start tracking error:', err);
      isStartingRef.current = false;
      return { success: false, error: err.message || 'Failed to start GPS tracking.' };
    }
  };

  const stopTracking = async () => {
    isTrackingRef.current = false;
    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;
    }

    if (Platform.OS !== 'web') {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      } catch (err) {
        console.warn('Stop background tracking error:', err);
      }
    }

    // Push offline status ping before stopping
    if (salesperson && currentCoords) {
      try {
        await dataService.recordLocationPing({
          salespersonId: salesperson.id,
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          status: 'offline',
        });
      } catch {}
    }

    setIsTracking(false);
  };

  // AUTOMATIC GPS TRACKING ON LOGIN & AUTO STOP ON LOGOUT
  useEffect(() => {
    let isMounted = true;

    if (salesperson) {
      // Automatically initiate tracking once authenticated
      if (!isTrackingRef.current && !isStartingRef.current) {
        startTracking().then((res) => {
          if (!isMounted) return;
          if (!res.success) {
            console.log('Auto GPS start notice:', res.error);
          }
        });
      }
    } else {
      // User is logged out -> stop tracking immediately
      if (isTrackingRef.current) {
        stopTracking();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [salesperson?.id]);

  const setTrackingStatus = (newStatus: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline') => {
    setTrackingStatusState(newStatus);
    trackingStatusRef.current = newStatus;
    if (isTrackingRef.current && salesperson && currentCoords) {
      dataService.recordLocationPing({
        salespersonId: salesperson.id,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        status: newStatus,
      });
    }
  };

  const setUpdateIntervalSec = (interval: number) => {
    setUpdateIntervalSecState(interval);
  };

  const setBatteryOptimized = (enabled: boolean) => {
    setBatteryOptimizedState(enabled);
  };

  const permissionDenied = permissionStatus === Location.PermissionStatus.DENIED;

  return (
    <LocationTrackerContext.Provider
      value={{
        isTracking,
        permissionStatus,
        permissionDenied,
        currentCoords,
        lastPingTime,
        trackingStatus,
        updateIntervalSec,
        batteryOptimized,
        startTracking,
        stopTracking,
        setTrackingStatus,
        setUpdateIntervalSec,
        setBatteryOptimized,
        requestPermissions,
        openAppSettings,
      }}
    >
      {children}
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
