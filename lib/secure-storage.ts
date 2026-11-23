import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800; // Well below Expo SecureStore's 2048-byte limit per key

/**
 * Custom Storage Adapter for Supabase Auth with automatic chunking.
 * - Handles Android/iOS 2048-byte limit by splitting large tokens across chunk keys.
 * - Gracefully falls back to AsyncStorage on Web platforms.
 */
class SecureStorageAdapter {
  private isWeb = Platform.OS === 'web';

  async getItem(key: string): Promise<string | null> {
    if (this.isWeb) {
      return await AsyncStorage.getItem(key);
    }

    try {
      // Check if chunk count exists
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        const chunkPromises: Promise<string | null>[] = [];
        for (let i = 0; i < count; i++) {
          chunkPromises.push(SecureStore.getItemAsync(`${key}_chunk_${i}`));
        }
        const chunks = await Promise.all(chunkPromises);
        return chunks.join('');
      }

      // Single item fallback
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[SecureStore] Error reading key "${key}":`, e);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      // First clean up any prior chunks
      await this.removeItem(key);

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
      } else {
        const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, totalChunks.toString());

        const chunkPromises: Promise<void>[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          chunkPromises.push(SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk));
        }
        await Promise.all(chunkPromises);
      }
    } catch (e) {
      console.warn(`[SecureStore] Error writing key "${key}":`, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }

    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        const deletePromises: Promise<void>[] = [];
        for (let i = 0; i < count; i++) {
          deletePromises.push(SecureStore.deleteItemAsync(`${key}_chunk_${i}`));
        }
        deletePromises.push(SecureStore.deleteItemAsync(`${key}_chunks`));
        await Promise.all(deletePromises);
      }

      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[SecureStore] Error deleting key "${key}":`, e);
    }
  }

  async wipeAllAuthTokens(): Promise<void> {
    // Delete known Supabase session keys
    const supabaseKeys = [
      'supabase.auth.token',
      'sb-qdadspfomzgtvqgbzzri-auth-token',
    ];

    for (const k of supabaseKeys) {
      await this.removeItem(k);
    }
  }
}

export const secureStorageAdapter = new SecureStorageAdapter();
