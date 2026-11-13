import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { SalesPersonProfile } from '@/types';

interface AuthContextType {
  salesperson: SalesPersonProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
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

const AUTH_STORAGE_KEY = '@distribo_salesperson_session';
const REMEMBER_ME_KEY = '@distribo_remember_me';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [salesperson, setSalesperson] = useState<SalesPersonProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        // If user unchecked remember me, session is not automatically restored on app restart
        if (rememberMe === 'false') {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          if (isMounted) setLoading(false);
          return;
        }

        // 1. Check local storage cache first for instant render
        const cached = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached) as SalesPersonProfile;
          setSalesperson(parsed);
        }

        // 2. Check active Supabase Auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUserEmail = session.user.email?.toLowerCase().trim();
          const { data: profile } = await supabase
            .from('sales_person_profiles')
            .select('*')
            .or(`user_id.eq.${session.user.id},email.ilike.${authUserEmail}`)
            .maybeSingle();

          if (profile && profile.status === 'active') {
            if (isMounted) {
              setSalesperson(profile as SalesPersonProfile);
              await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
            }
          } else if (profile && profile.status !== 'active') {
            await signOut();
          }
        }
      } catch (err) {
        console.warn('Session restoration error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase().trim();
        const { data: profile } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .or(`user_id.eq.${session.user.id},email.ilike.${email}`)
          .maybeSingle();

        if (profile && profile.status === 'active') {
          setSalesperson(profile as SalesPersonProfile);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        }
      } else if (event === 'SIGNED_OUT') {
        setSalesperson(null);
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    emailInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

      // 1. Try standard Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      let spRow: SalesPersonProfile | null = null;

      if (!authError && authData.user) {
        const { data, error: profileErr } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .or(`user_id.eq.${authData.user.id},email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (profileErr) {
          return { success: false, error: 'Database error fetching salesperson profile.' };
        }
        spRow = data as SalesPersonProfile | null;
      } else {
        // 2. Direct password fallback (if created in Admin CRM before Supabase Auth invitation)
        const { data: directSp, error: directErr } = await supabase
          .from('sales_person_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!directErr && directSp && directSp.password === cleanPassword) {
          spRow = directSp as SalesPersonProfile;
        } else {
          return {
            success: false,
            error: authError?.message || 'Invalid email or password. Please verify your credentials.',
          };
        }
      }

      if (!spRow) {
        return {
          success: false,
          error: 'Access denied. Only registered Sales Persons can sign in to this application.',
        };
      }

      if (spRow.status !== 'active') {
        return {
          success: false,
          error: 'Your salesperson account is currently inactive. Please contact the administrator.',
        };
      }

      setSalesperson(spRow);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(spRow));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during sign-in.' };
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
      // 1. Check duplicate mobile or email in sales_person_profiles
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
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail && existingEmail.user_id) {
        return { success: false, error: `Email address ${cleanEmail} is already registered to ${existingEmail.name}.` };
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

      // 3. Create or link profile in sales_person_profiles
      let profileData: SalesPersonProfile | null = null;

      if (existingEmail && !existingEmail.user_id) {
        // Pre-enrolled by Admin: update user_id and password
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

        if (error) throw error;
        profileData = data as SalesPersonProfile;
      } else {
        // Fresh registration
        const { data, error } = await supabase
          .from('sales_person_profiles')
          .insert([
            {
              user_id: userId,
              name: cleanName,
              employee_id: empId,
              mobile: cleanMobile,
              email: cleanEmail,
              password: cleanPass,
              assigned_area: assignedArea || 'General Beat',
              status: 'active',
              joining_date: new Date().toISOString().split('T')[0],
            },
          ])
          .select()
          .single();

        if (error) throw error;
        profileData = data as SalesPersonProfile;
      }

      if (profileData) {
        setSalesperson(profileData);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profileData));
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed. Please check details.' };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return { success: false, error: error.message };
      }
      return {
        success: true,
        message: `Password reset instructions have been sent to ${cleanEmail}. Check your inbox.`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to request password reset.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out error:', err);
    }
    setSalesperson(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const refreshProfile = async () => {
    if (!salesperson) return;
    try {
      const { data, error } = await supabase
        .from('sales_person_profiles')
        .select('*')
        .eq('id', salesperson.id)
        .maybeSingle();

      if (!error && data) {
        setSalesperson(data as SalesPersonProfile);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        salesperson,
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
