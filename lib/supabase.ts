import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://nuhdurfhzesserazozaw.supabase.co';
const supabaseAnonKey = 'sb_publishable__gsd_IBV0FtTomG4m4SuIA_3W_LAagG';

// Создаём storage только для клиента (не SSR)
const getStorage = () => {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    // SSR - возвращаем пустой storage
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }
  // Клиент - используем AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
