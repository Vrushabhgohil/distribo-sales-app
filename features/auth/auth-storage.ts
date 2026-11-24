import AsyncStorage from '@react-native-async-storage/async-storage';
import { SalesPersonProfile, DeliveryPersonProfile, UserRole } from '@/types';
import { logger } from '@/lib/logger';

export const AUTH_STORAGE_KEY = '@motiba_auth_session';
export const USER_ROLE_KEY = '@motiba_user_role';
export const ACCOUNT_STATUS_KEY = '@motiba_account_status';
export const REMEMBER_ME_KEY = '@motiba_remember_me';

export type AccountStatus = 'pending' | 'active' | 'inactive';

export const authStorage = {
  async saveSessionData(role: UserRole, profile: SalesPersonProfile | DeliveryPersonProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_ROLE_KEY, role);
      await AsyncStorage.setItem(ACCOUNT_STATUS_KEY, profile.status);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      logger.warn('Error saving session data:', e);
    }
  },

  async clearAllSessionData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEY,
        USER_ROLE_KEY,
        ACCOUNT_STATUS_KEY,
        REMEMBER_ME_KEY,
      ]);
    } catch (e) {
      logger.warn('Error clearing auth storage:', e);
    }
  },

  async getCachedSession(): Promise<{
    role: UserRole | null;
    status: AccountStatus | null;
    profile: SalesPersonProfile | DeliveryPersonProfile | null;
    rememberMe: boolean;
  }> {
    try {
      const rememberMeStr = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      const rememberMe = rememberMeStr !== 'false';
      if (!rememberMe) {
        await this.clearAllSessionData();
        return { role: null, status: null, profile: null, rememberMe: false };
      }

      const role = (await AsyncStorage.getItem(USER_ROLE_KEY)) as UserRole | null;
      const status = (await AsyncStorage.getItem(ACCOUNT_STATUS_KEY)) as AccountStatus | null;
      const sessionStr = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const profile = sessionStr ? JSON.parse(sessionStr) : null;

      return { role, status, profile, rememberMe: true };
    } catch {
      return { role: null, status: null, profile: null, rememberMe: true };
    }
  },
};
