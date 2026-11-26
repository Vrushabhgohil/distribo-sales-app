import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const PUSH_TOKEN_STORAGE_KEY = '@motiba_fcm_device_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  async registerForPushNotificationsAsync(userId: string): Promise<string | null> {
    if (!userId) return null;

    if (!Device.isDevice) {
      logger.info('Push notifications require a physical device.');
      return null;
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('motiba_default', {
          name: 'Motiba Sales & Order Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#970F18',
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Notification permission not granted.');
        return null;
      }

      const tokenResponse = await Notifications.getDevicePushTokenAsync();
      const token =
        typeof tokenResponse.data === 'string'
          ? tokenResponse.data
          : String(tokenResponse.data);

      if (!token) return null;

      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      if (isSupabaseConfigured) {
        const provider = Platform.OS === 'android' ? 'fcm' : 'apns';
        const { error } = await supabase
          .from('user_push_tokens')
          .upsert(
            {
              user_id: userId,
              token,
              platform: Platform.OS,
              provider,
              device_name: Device.modelName || Device.deviceName || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' }
          );

        if (error) {
          logger.warn('Failed to save push token to Supabase:', error.message);
        }
      }

      return token;
    } catch (err) {
      logger.warn('Push notification registration note:', err);
      return null;
    }
  },

  async unregisterPushTokenAsync(userId?: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (token && userId && isSupabaseConfigured) {
        await supabase
          .from('user_push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('token', token);
      }
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    } catch (err) {
      logger.warn('Failed to unregister push token:', err);
    }
  },

  subscribeToNotifications(
    onReceived: () => void,
    onTapped: (data: Record<string, any> | undefined) => void
  ): () => void {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      onReceived();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      onTapped(data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  },
};
