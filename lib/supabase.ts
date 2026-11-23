import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { config } from './config';
import { secureStorageAdapter } from './secure-storage';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const isSupabaseConfigured = true;
