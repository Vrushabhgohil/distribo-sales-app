import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { loginSchema, passwordSchema, signUpSchema, updatePasswordSchema } from '@/lib/validation/auth';
import { DeliveryPersonProfile, SalesPersonProfile, UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type AccountStatus = 'pending' | 'active' | 'inactive';

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
  signUp: (params: {
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

const AUTH_STORAGE_KEY = '@motiba_auth_session';
const USER_ROLE_KEY = '@motiba_user_role';
const ACCOUNT_STATUS_KEY = '@motiba_account_status';
const REMEMBER_ME_KEY = '@motiba_remember_me';

const SALES_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, joining_date, assigned_area, status, created_at, updated_at' as const;

const DELIVERY_PROFILE_COLUMNS =
  'id, user_id, name, employee_id, photo_url, mobile, email, address, vehicle_type, vehicle_number, status, created_at, updated_at' as const;

type AuthProfileResult =
  | { role: 'sales_person'; profile: SalesPersonProfile }
  | { role: 'delivery_person'; profile: DeliveryPersonProfile }
  | null;

/**
 * Deduplicated helper to fetch user profile strictly by user_id with explicit columns.
 */
async function fetchProfileByUserId(userId: string): Promise<AuthProfileResult> {
  const { data: salesProfile, error: salesError } = await supabase
    .from('sales_person_profiles')
    .select(SALES_PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (salesError) {
    console.warn('Error loading sales profile by user_id:', salesError);
  }

  if (salesProfile) {
    return {
      role: 'sales_person',
      profile: salesProfile as unknown as SalesPersonProfile,
    };
  }

  const { data: deliveryProfile, error: deliveryError } = await supabase
    .from('delivery_person_profiles')
    .select(DELIVERY_PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (deliveryError) {
    console.warn('Error loading delivery profile by user_id:', deliveryError);
  }

  if (deliveryProfile) {
    return {
      role: 'delivery_person',
      profile: deliveryProfile as unknown as DeliveryPersonProfile,
    };
  }

  return null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [salesperson, setSalesperson] = useState<SalesPersonProfile | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPersonProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const saveSessionData = async (
    role: UserRole,
    profile: SalesPersonProfile | DeliveryPersonProfile
  ) => {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
    await AsyncStorage.setItem(ACCOUNT_STATUS_KEY, profile.status);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
  };

  const clearAllSessionData = async () => {
    try {
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEY,
        USER_ROLE_KEY,
        ACCOUNT_STATUS_KEY,
        REMEMBER_ME_KEY,
      ]);
    } catch (e) {
      console.warn('Error clearing auth storage:', e);
    }
  };

  // Restore authenticated session & auto-detect role on app start
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        if (rememberMe === 'false') {
          await clearAllSessionData();
          if (isMounted) setLoading(false);
          return;
        }

        // 1. Check local session cache for instant startup
        const cachedRole = (await AsyncStorage.getItem(USER_ROLE_KEY)) as UserRole | null;
        const cachedStatus = (await AsyncStorage.getItem(ACCOUNT_STATUS_KEY)) as AccountStatus | null;
        const cachedSession = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

        if (cachedRole && cachedSession && isMounted) {
          try {
            const parsed = JSON.parse(cachedSession);
            setUserRole(cachedRole);
            setAccountStatus(cachedStatus || parsed.status || 'active');
            if (cachedRole === 'sales_person') {
              setSalesperson(parsed as SalesPersonProfile);
              setDeliveryPerson(null);
            } else if (cachedRole === 'delivery_person') {
              setDeliveryPerson(parsed as DeliveryPersonProfile);
              setSalesperson(null);
            }
          } catch {
            await clearAllSessionData();
          }
        }

        // 2. Validate with Supabase session strictly by user_id
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const result = await fetchProfileByUserId(session.user.id);
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
              await saveSessionData(result.role, result.profile);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Session restoration exception:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }

      if (session?.user) {
        const result = await fetchProfileByUserId(session.user.id);
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
          await saveSessionData(result.role, result.profile);
          return;
        }
      } else if (event === 'SIGNED_OUT') {
        await clearAllSessionData();
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

  // Unified Sign In with SECURITY DEFINER RPC and Supabase Auth
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
      const msg = validation.error.issues[0]?.message || 'Invalid credentials.';
      return { success: false, error: msg };
    }

    const cleanId = validation.data.identifier;
    const rawPassword = validation.data.password;

    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

      // 1. Resolve identifier to email via SECURITY DEFINER RPC
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
        'resolve_login_identifier',
        { p_identifier: cleanId }
      );

      if (rpcError || !resolvedEmail) {
        return {
          success: false,
          error: 'Incorrect email/ID or password. Please verify and try again.',
        };
      }

      // 2. Authenticate strictly via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: rawPassword,
      });

      if (authError || !authData?.user) {
        return {
          success: false,
          error: 'Incorrect email/ID or password. Please verify and try again.',
        };
      }

      // 3. Load profile strictly by user_id with explicit columns
      const result = await fetchProfileByUserId(authData.user.id);

      if (!result) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied. No active Sales Person or Delivery Person role associated with this account.',
        };
      }

      if (result.profile.status === 'inactive') {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Your account is inactive. Please contact the administrator.',
        };
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

      await saveSessionData(result.role, result.profile);
      return { success: true, role: result.role, accountStatus: result.profile.status };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during authentication.';
      return {
        success: false,
        error: message,
      };
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
    // Validate inputs
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
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid signup details.',
      };
    }

    const cleanEmail = validation.data.email;
    const cleanMobile = validation.data.mobile;
    const cleanName = validation.data.fullName;
    const rawPassword = validation.data.password;

    try {
      // 1. Check duplicate mobile or email in sales_person_profiles
      const { data: existingMobile } = await supabase
        .from('sales_person_profiles')
        .select('id, name')
        .eq('mobile', cleanMobile)
        .maybeSingle();

      if (existingMobile) {
        return {
          success: false,
          error: `Mobile number ${cleanMobile} is already registered (${existingMobile.name}).`,
        };
      }

      const { data: existingEmail } = await supabase
        .from('sales_person_profiles')
        .select('id, name, user_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingEmail && existingEmail.user_id) {
        return {
          success: false,
          error: `Email address ${cleanEmail} is already registered to ${existingEmail.name}.`,
        };
      }

      // 2. Register user through Supabase Auth without client role metadata.
      // Server-side auth.users trigger creates the pending profile and generates employee_id sequence.
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
        const result = await fetchProfileByUserId(authData.user.id);
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
          await saveSessionData(result.role, result.profile);
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
      return {
        success: true,
        message: 'Password reset link sent! Check your inbox to set a new password.',
      };
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
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Password must be at least 10 characters long.',
        };
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
      console.warn('Supabase sign-out error:', err);
    } finally {
      await clearAllSessionData();
      try {
        queryClient.clear();
      } catch (e) {
        console.warn('Error clearing query cache:', e);
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

      const result = await fetchProfileByUserId(session.user.id);
      if (result) {
        if (result.profile.status === 'inactive') {
          await signOut();
          return;
        }
        setAccountStatus(result.profile.status);
        if (result.role === 'sales_person') {
          setSalesperson(result.profile as SalesPersonProfile);
          await saveSessionData('sales_person', result.profile);
        } else {
          setDeliveryPerson(result.profile as DeliveryPersonProfile);
          await saveSessionData('delivery_person', result.profile);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
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
