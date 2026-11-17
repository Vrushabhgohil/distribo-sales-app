import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { SalesPersonProfile, DeliveryPersonProfile, UserRole } from '@/types';

interface AuthContextType {
  userRole: UserRole | null;
  salesperson: SalesPersonProfile | null;
  deliveryPerson: DeliveryPersonProfile | null;
  loading: boolean;
  signIn: (
    identifier: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  signUp: (params: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    assignedArea?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AUTH_STORAGE_KEY = '@distribo_auth_session';
const USER_ROLE_KEY = '@distribo_user_role';
const REMEMBER_ME_KEY = '@distribo_remember_me';

// Backward compatibility keys
const SALES_STORAGE_KEY = '@distribo_salesperson_session';
const DELIVERY_STORAGE_KEY = '@distribo_delivery_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [salesperson, setSalesperson] = useState<SalesPersonProfile | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPersonProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        const cachedSession = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

        if (cachedRole && cachedSession && isMounted) {
          const parsed = JSON.parse(cachedSession);
          if (cachedRole === 'sales_person') {
            setUserRole('sales_person');
            setSalesperson(parsed as SalesPersonProfile);
            setDeliveryPerson(null);
          } else if (cachedRole === 'delivery_person') {
            setUserRole('delivery_person');
            setDeliveryPerson(parsed as DeliveryPersonProfile);
            setSalesperson(null);
          }
        }

        // 2. Validate with Supabase session or latest DB state
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email?.toLowerCase().trim();

          // Check if sales_person
          const { data: salesProfile } = await supabase
            .from('sales_person_profiles')
            .select('*')
            .or(`user_id.eq.${session.user.id},email.ilike.${email}`)
            .maybeSingle();

          if (salesProfile && salesProfile.status === 'active') {
            if (isMounted) {
              setUserRole('sales_person');
              setSalesperson(salesProfile as SalesPersonProfile);
              setDeliveryPerson(null);
              await saveSessionData('sales_person', salesProfile);
            }
            return;
          } else if (salesProfile && salesProfile.status !== 'active') {
            await signOut();
            return;
          }

          // Check if delivery_person
          const { data: deliveryProfile } = await supabase
            .from('delivery_person_profiles')
            .select('*')
            .or(`user_id.eq.${session.user.id},email.ilike.${email}`)
            .maybeSingle();

          if (deliveryProfile && deliveryProfile.status === 'active') {
            if (isMounted) {
              setUserRole('delivery_person');
              setDeliveryPerson(deliveryProfile as DeliveryPersonProfile);
              setSalesperson(null);
              await saveSessionData('delivery_person', deliveryProfile);
            }
            return;
          } else if (deliveryProfile && deliveryProfile.status !== 'active') {
            await signOut();
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
      if (session?.user) {
        const email = session.user.email?.toLowerCase().trim();

        // Check Sales Person
        const { data: spProfile } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .or(`user_id.eq.${session.user.id},email.ilike.${email}`)
          .maybeSingle();

        if (spProfile && spProfile.status === 'active') {
          setUserRole('sales_person');
          setSalesperson(spProfile as SalesPersonProfile);
          setDeliveryPerson(null);
          await saveSessionData('sales_person', spProfile);
          return;
        }

        // Check Delivery Person
        const { data: dpProfile } = await supabase
          .from('delivery_person_profiles')
          .select('*')
          .or(`user_id.eq.${session.user.id},email.ilike.${email}`)
          .maybeSingle();

        if (dpProfile && dpProfile.status === 'active') {
          setUserRole('delivery_person');
          setDeliveryPerson(dpProfile as DeliveryPersonProfile);
          setSalesperson(null);
          await saveSessionData('delivery_person', dpProfile);
          return;
        }
      } else if (event === 'SIGNED_OUT') {
        await clearAllSessionData();
        setUserRole(null);
        setSalesperson(null);
        setDeliveryPerson(null);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const saveSessionData = async (role: UserRole, profile: any) => {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    if (role === 'sales_person') {
      await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(profile));
      await AsyncStorage.removeItem(DELIVERY_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(profile));
      await AsyncStorage.removeItem(SALES_STORAGE_KEY);
    }
  };

  const clearAllSessionData = async () => {
    await AsyncStorage.multiRemove([
      AUTH_STORAGE_KEY,
      USER_ROLE_KEY,
      SALES_STORAGE_KEY,
      DELIVERY_STORAGE_KEY,
      '@distribo_delivery_profile',
    ]);
  };

  // Unified Sign In with Automatic Role Detection
  const signIn = async (
    identifierInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    setLoading(true);
    const cleanId = identifierInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

      // 1. Look up profile in Sales Person table first
      const { data: salesMatch } = await supabase
        .from('sales_person_profiles')
        .select('*')
        .or(`email.ilike.${cleanId},employee_id.ilike.${cleanId}`)
        .maybeSingle();

      // 2. Look up profile in Delivery Person table
      const { data: deliveryMatch } = await supabase
        .from('delivery_person_profiles')
        .select('*')
        .or(`email.ilike.${cleanId},employee_id.ilike.${cleanId}`)
        .maybeSingle();

      const candidateTargetEmail = salesMatch
        ? salesMatch.email
        : deliveryMatch
        ? deliveryMatch.email
        : cleanId;

      // 3. Attempt Supabase Auth login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: candidateTargetEmail,
        password: cleanPass,
      });

      let authenticatedRole: UserRole | null = null;
      let authenticatedProfile: any = null;

      if (!authError && authData?.user) {
        // Authenticated via Supabase Auth
        const authUserId = authData.user.id;
        const authUserEmail = (authData.user.email || candidateTargetEmail).toLowerCase().trim();

        // Check sales profile
        const { data: spRow } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .or(`user_id.eq.${authUserId},email.ilike.${authUserEmail}`)
          .maybeSingle();

        if (spRow) {
          if (spRow.status !== 'active') {
            await supabase.auth.signOut();
            return {
              success: false,
              error: 'Your sales officer account is inactive. Please contact the administrator.',
            };
          }
          // Link user_id if needed
          if (!spRow.user_id) {
            await supabase
              .from('sales_person_profiles')
              .update({ user_id: authUserId, updated_at: new Date().toISOString() })
              .eq('id', spRow.id);
          }
          authenticatedRole = 'sales_person';
          authenticatedProfile = { ...spRow, user_id: authUserId };
        } else {
          // Check delivery profile
          const { data: dpRow } = await supabase
            .from('delivery_person_profiles')
            .select('*')
            .or(`user_id.eq.${authUserId},email.ilike.${authUserEmail}`)
            .maybeSingle();

          if (dpRow) {
            if (dpRow.status !== 'active') {
              await supabase.auth.signOut();
              return {
                success: false,
                error: 'Your delivery pilot account is inactive. Please contact the warehouse dispatcher.',
              };
            }
            // Link user_id if needed
            if (!dpRow.user_id) {
              await supabase
                .from('delivery_person_profiles')
                .update({ user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', dpRow.id);
            }
            authenticatedRole = 'delivery_person';
            authenticatedProfile = { ...dpRow, user_id: authUserId };
          }
        }
      } else {
        // Fallback: Direct password verification (if pre-provisioned in DB before Supabase Auth invitation)
        if (salesMatch && salesMatch.password === cleanPass) {
          if (salesMatch.status !== 'active') {
            return {
              success: false,
              error: 'Your sales officer account is inactive. Please contact the administrator.',
            };
          }
          authenticatedRole = 'sales_person';
          authenticatedProfile = salesMatch;
        } else if (deliveryMatch && deliveryMatch.password === cleanPass) {
          if (deliveryMatch.status !== 'active') {
            return {
              success: false,
              error: 'Your delivery pilot account is inactive. Please contact the warehouse dispatcher.',
            };
          }
          authenticatedRole = 'delivery_person';
          authenticatedProfile = deliveryMatch;
        } else {
          return {
            success: false,
            error: authError?.message || 'Invalid credentials. Please verify your email/ID and password.',
          };
        }
      }

      if (!authenticatedRole || !authenticatedProfile) {
        return {
          success: false,
          error: 'Access denied. No active Sales Person or Delivery Person role associated with this account.',
        };
      }

      // Successfully authenticated & role verified!
      if (authenticatedRole === 'sales_person') {
        setUserRole('sales_person');
        setSalesperson(authenticatedProfile as SalesPersonProfile);
        setDeliveryPerson(null);
      } else {
        setUserRole('delivery_person');
        setDeliveryPerson(authenticatedProfile as DeliveryPersonProfile);
        setSalesperson(null);
      }

      await saveSessionData(authenticatedRole, authenticatedProfile);
      return { success: true, role: authenticatedRole };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during authentication.',
      };
    } finally {
      setLoading(false);
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
  }): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanName = fullName.trim();
    const cleanPass = password.trim();

    try {
      // 1. Check duplicate mobile or email
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
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail && existingEmail.user_id) {
        return {
          success: false,
          error: `Email address ${cleanEmail} is already registered to ${existingEmail.name}.`,
        };
      }

      // 2. Register user through Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: cleanName,
            role: 'sales_rep',
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      const userId = authData.user?.id || null;
      const empId = `EMP-S${Math.floor(1000 + Math.random() * 9000)}`;

      let profileData: SalesPersonProfile | null = null;

      if (existingEmail && !existingEmail.user_id) {
        const { data, error } = await supabase
          .from('sales_person_profiles')
          .update({
            user_id: userId,
            password: cleanPass,
            status: 'active',
            name: cleanName,
            mobile: cleanMobile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEmail.id)
          .select()
          .single();

        if (error) {
          return { success: false, error: 'Failed to update pre-enrolled profile.' };
        }
        profileData = data as SalesPersonProfile;
      } else {
        const { data, error } = await supabase
          .from('sales_person_profiles')
          .insert([
            {
              user_id: userId,
              name: cleanName,
              employee_id: empId,
              email: cleanEmail,
              mobile: cleanMobile,
              password: cleanPass,
              assigned_area: assignedArea || 'Unassigned',
              status: 'active',
              joining_date: new Date().toISOString().split('T')[0],
            },
          ])
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        profileData = data as SalesPersonProfile;
      }

      if (profileData) {
        setUserRole('sales_person');
        setSalesperson(profileData);
        setDeliveryPerson(null);
        await saveSessionData('sales_person', profileData);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during signup.' };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return { success: false, error: error.message };
      }
      return {
        success: true,
        message: 'Password reset link sent! Check your inbox to set a new password.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send password reset email.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out error:', err);
    } finally {
      await clearAllSessionData();
      setUserRole(null);
      setSalesperson(null);
      setDeliveryPerson(null);
    }
  };

  const refreshProfile = async () => {
    try {
      if (userRole === 'sales_person' && salesperson?.id) {
        const { data } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .eq('id', salesperson.id)
          .maybeSingle();

        if (data) {
          if (data.status !== 'active') {
            await signOut();
            return;
          }
          setSalesperson(data as SalesPersonProfile);
          await saveSessionData('sales_person', data);
        }
      } else if (userRole === 'delivery_person' && deliveryPerson?.id) {
        const { data } = await supabase
          .from('delivery_person_profiles')
          .select('*')
          .eq('id', deliveryPerson.id)
          .maybeSingle();

        if (data) {
          if (data.status !== 'active') {
            await signOut();
            return;
          }
          setDeliveryPerson(data as DeliveryPersonProfile);
          await saveSessionData('delivery_person', data);
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
        salesperson,
        deliveryPerson,
        loading,
        signIn,
        signUp,
        resetPassword,
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
