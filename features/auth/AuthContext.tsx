import { logger } from '@/lib/logger';
import { offlineStorage } from '@/lib/offline-storage';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { loginSchema, passwordSchema, signUpSchema } from '@/lib/validation/auth';
import { DeliveryPersonProfile, SalesPersonProfile, UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authService } from './auth-service';
import { AccountStatus, authStorage, REMEMBER_ME_KEY } from './auth-storage';

export type { AccountStatus };

interface AuthContextType {
  userRole: UserRole | null;
  accountStatus: AccountStatus | null;
  salesperson: SalesPersonProfile | null;
  deliveryPerson: DeliveryPersonProfile | null;
  loading: boolean;
  signIn: (
    identifier: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; role?: UserRole; accountStatus?: AccountStatus; error?: string }>;
  signUp: (data: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    assignedArea?: string;
  }) => Promise<{ success: boolean; accountStatus?: AccountStatus; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [salesperson, setSalesperson] = useState<SalesPersonProfile | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPersonProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore authenticated session & auto-detect role on app start
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const cached = await authStorage.getCachedSession();
        if (cached.role && cached.profile && isMounted) {
          setUserRole(cached.role);
          setAccountStatus(cached.status || cached.profile.status || 'active');
          if (cached.role === 'sales_person') {
            setSalesperson(cached.profile as SalesPersonProfile);
            setDeliveryPerson(null);
          } else {
            setDeliveryPerson(cached.profile as DeliveryPersonProfile);
            setSalesperson(null);
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const result = await authService.fetchProfileByUserId(session.user.id);
          if (result) {
            if (result.profile.status === 'inactive') {
              await signOut();
              return;
            }

            if (isMounted) {
              setAccountStatus(result.profile.status);
              if (result.role === 'sales_person') {
                setUserRole('sales_person');
                setSalesperson(result.profile as SalesPersonProfile);
                setDeliveryPerson(null);
              } else {
                setUserRole('delivery_person');
                setDeliveryPerson(result.profile as DeliveryPersonProfile);
                setSalesperson(null);
              }
              await authStorage.saveSessionData(result.role, result.profile);
            }
          }
        } else if (!cached.role) {
          await authStorage.clearAllSessionData();
        }
      } catch (err) {
        logger.warn('Session restoration note:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }

      if (session?.user) {
        const result = await authService.fetchProfileByUserId(session.user.id);
        if (result) {
          if (result.profile.status === 'inactive') {
            await signOut();
            return;
          }
          setAccountStatus(result.profile.status);
          if (result.role === 'sales_person') {
            setUserRole('sales_person');
            setSalesperson(result.profile as SalesPersonProfile);
            setDeliveryPerson(null);
          } else {
            setUserRole('delivery_person');
            setDeliveryPerson(result.profile as DeliveryPersonProfile);
            setSalesperson(null);
          }
          await authStorage.saveSessionData(result.role, result.profile);
          return;
        }
      } else if (event === 'SIGNED_OUT') {
        await authStorage.clearAllSessionData();
        setUserRole(null);
        setAccountStatus(null);
        setSalesperson(null);
        setDeliveryPerson(null);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    identifierInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; role?: UserRole; accountStatus?: AccountStatus; error?: string }> => {
    const validation = loginSchema.safeParse({
      identifier: identifierInput,
      password: passwordInput,
      rememberMe,
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid credentials.' };
    }

    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      const resolvedEmail = await authService.resolveLoginIdentifier(validation.data.identifier);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: validation.data.password,
      });

      if (authError || !authData?.user) {
        return { success: false, error: 'Incorrect email/ID or password. Please verify and try again.' };
      }

      const result = await authService.fetchProfileByUserId(authData.user.id);
      if (!result) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied. No active Sales Person or Delivery Person role associated with this account.',
        };
      }

      if (result.profile.status === 'inactive') {
        await supabase.auth.signOut();
        return { success: false, error: 'Your account is inactive. Please contact the administrator.' };
      }

      setAccountStatus(result.profile.status);
      if (result.role === 'sales_person') {
        setUserRole('sales_person');
        setSalesperson(result.profile as SalesPersonProfile);
        setDeliveryPerson(null);
      } else {
        setUserRole('delivery_person');
        setDeliveryPerson(result.profile as DeliveryPersonProfile);
        setSalesperson(null);
      }

      await authStorage.saveSessionData(result.role, result.profile);
      return { success: true, role: result.role, accountStatus: result.profile.status };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during authentication.';
      return { success: false, error: message };
    }
  };

  const signUp = async ({
    fullName,
    email,
    mobile,
    password,
    assignedArea,
  }: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    assignedArea?: string;
  }): Promise<{ success: boolean; accountStatus?: AccountStatus; error?: string }> => {
    const validation = signUpSchema.safeParse({
      fullName,
      email,
      mobile,
      password,
      confirmPassword: password,
      assignedArea,
      agreeTerms: true,
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid signup details.' };
    }

    const { email: cleanEmail, mobile: cleanMobile, fullName: cleanName, password: rawPassword } = validation.data;

    try {
      const { data: existingMobile } = await supabase
        .from('sales_person_profiles')
        .select('id, name')
        .eq('mobile', cleanMobile)
        .maybeSingle();

      if (existingMobile) {
        return { success: false, error: `Mobile number ${cleanMobile} is already registered (${existingMobile.name}).` };
      }

      const { data: existingEmail } = await supabase
        .from('sales_person_profiles')
        .select('id, name, user_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingEmail && existingEmail.user_id) {
        return { success: false, error: `Email address ${cleanEmail} is already registered to ${existingEmail.name}.` };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPassword,
        options: {
          data: {
            full_name: cleanName,
            mobile: cleanMobile,
            assigned_area: assignedArea || 'Unassigned',
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData?.user) {
        const result = await authService.fetchProfileByUserId(authData.user.id);
        if (result) {
          setUserRole(result.role);
          setAccountStatus(result.profile.status);
          if (result.role === 'sales_person') {
            setSalesperson(result.profile as SalesPersonProfile);
            setDeliveryPerson(null);
          } else {
            setDeliveryPerson(result.profile as DeliveryPersonProfile);
            setSalesperson(null);
          }
          await authStorage.saveSessionData(result.role, result.profile);
        } else {
          setUserRole('sales_person');
          setAccountStatus('pending');
        }
      }

      return { success: true, accountStatus: 'pending' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during signup.';
      return { success: false, error: message };
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const redirectUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/(auth)/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Password reset link sent! Check your inbox to set a new password.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.';
      return { success: false, error: message };
    }
  };

  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const validation = passwordSchema.safeParse(newPassword);
      if (!validation.success) {
        return { success: false, error: validation.error.issues[0]?.message || 'Password must be at least 10 characters long.' };
      }

      const { error } = await supabase.auth.updateUser({
        password: validation.data,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('Supabase sign-out error:', err);
    } finally {
      try {
        if (Platform.OS !== 'web') {
          const isRegistered = await TaskManager.isTaskRegisteredAsync('MOTIBA_BACKGROUND_LOCATION_TASK');
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync('MOTIBA_BACKGROUND_LOCATION_TASK');
          }
        }
        await AsyncStorage.removeItem('@motiba_shift_active');
      } catch (locErr) {
        logger.warn('Error unregistering background location on sign out:', locErr);
      }

      await authStorage.clearAllSessionData();
      try {
        await offlineStorage.wipeAllData();
      } catch (e) {
        logger.warn('Error wiping offline storage on sign out:', e);
      }
      try {
        queryClient.clear();
      } catch (e) {
        logger.warn('Error clearing query cache:', e);
      }
      setUserRole(null);
      setAccountStatus(null);
      setSalesperson(null);
      setDeliveryPerson(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const result = await authService.fetchProfileByUserId(session.user.id);
      if (result) {
        if (result.profile.status === 'inactive') {
          await signOut();
          return;
        }
        setAccountStatus(result.profile.status);
        if (result.role === 'sales_person') {
          setSalesperson(result.profile as SalesPersonProfile);
          await authStorage.saveSessionData('sales_person', result.profile);
        } else {
          setDeliveryPerson(result.profile as DeliveryPersonProfile);
          await authStorage.saveSessionData('delivery_person', result.profile);
        }
      }
    } catch (err) {
      logger.warn('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userRole,
        accountStatus,
        salesperson,
        deliveryPerson,
        loading,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
