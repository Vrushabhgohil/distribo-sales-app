import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { locationService } from '@/services/location-service';

export const BACKGROUND_LOCATION_TASK = 'MOTIBA_BACKGROUND_LOCATION_TASK';

interface LocationTrackerContextType {
  isTracking: boolean;
  permissionStatus: Location.PermissionStatus | null;
  permissionDenied: boolean;
  permissionGranted: boolean;
  currentCoords: { latitude: number; longitude: number; accuracy?: number | null } | null;
  location: { latitude: number; longitude: number } | null;
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
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
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
        const userRole = await AsyncStorage.getItem('@motiba_user_role');
        const sessionStr = await AsyncStorage.getItem('@motiba_auth_session');

        if (sessionStr) {
          const profile = JSON.parse(sessionStr);
          if (userRole === 'sales_person' && profile.id) {
            await dataService.recordLocationPing({
              salespersonId: profile.id,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              status: 'travelling',
            });
          } else if (userRole === 'delivery_person' && profile.id) {
            await locationService.recordDeliveryLocationPing({
              deliveryPersonId: profile.id,
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
  const { userRole, salesperson, deliveryPerson } = useAuth();
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

      if (userRole === 'sales_person' && salesperson?.id) {
        await dataService.recordLocationPing({
          salespersonId: salesperson.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: trackingStatusRef.current,
        });
      } else if (userRole === 'delivery_person' && deliveryPerson?.id) {
        await locationService.recordDeliveryLocationPing({
          deliveryPersonId: deliveryPerson.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: trackingStatusRef.current,
        });
      }
    } catch (err) {
      console.warn('Location refresh error:', err);
    }
  };

  const startTracking = async (): Promise<{ success: boolean; error?: string }> => {
    if (isTrackingRef.current || isStartingRef.current) {
      return { success: true };
    }

    isStartingRef.current = true;

    try {
      const hasPermission = await requestPermissions();
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

          const now = Date.now();
          if (now - lastUploadedAtRef.current >= updateIntervalSec * 1000) {
            lastUploadedAtRef.current = now;
            setLastPingTime(new Date().toLocaleTimeString());

            if (userRole === 'sales_person' && salesperson?.id) {
              await dataService.recordLocationPing({
                salespersonId: salesperson.id,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                status: trackingStatusRef.current,
              });
            } else if (userRole === 'delivery_person' && deliveryPerson?.id) {
              await locationService.recordDeliveryLocationPing({
                deliveryPersonId: deliveryPerson.id,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                status: trackingStatusRef.current,
              });
            }
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
                notificationTitle: 'Motiba Active Service',
                notificationBody: 'Recording route and visit coordinates during work hours.',
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
    } catch (err: any) {
      isStartingRef.current = false;
      return { success: false, error: err.message || 'Failed to start location tracker.' };
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
    requestPermissions();

    return () => {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
      }
    };
  }, []);

  const permissionDenied =
    permissionStatus === Location.PermissionStatus.DENIED;
  const permissionGranted =
    permissionStatus === Location.PermissionStatus.GRANTED;

  return (
    <LocationTrackerContext.Provider
      value={{
        isTracking,
        permissionStatus,
        permissionDenied,
        permissionGranted,
        currentCoords,
        location: currentCoords ? { latitude: currentCoords.latitude, longitude: currentCoords.longitude } : null,
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
        requestPermission: requestPermissions,
        refreshLocation,
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
