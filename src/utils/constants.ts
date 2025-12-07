// src/utils/constants.ts
export const APP_CONSTANTS = {
  // УДАЛЕНО: SUPABASE_URL и SUPABASE_ANON_KEY
  // Они должны использоваться ТОЛЬКО в supabaseClient.ts
  
  DEBOUNCE_DELAY: 3000, // Увеличено до 3 сек для синхронизации
  TELEGRAM_INIT_DELAY: 100, // Но лучше 0
  
  LOCAL_STORAGE_KEYS: {
    DEV_USER_ID: 'flight_tracker_dev_user_id',
    THEME: 'flight_tracker_theme',
    LAST_SYNC: 'flight_tracker_last_sync'
  },
  
  DEFAULT_THEME: {
    LIGHT: {
      bgColor: '#ffffff',
      textColor: '#000000',
      hintColor: '#888888',
      linkColor: '#0088cc',
      borderColor: '#e0e0e0',
      cardBg: '#ffffff',
      // activeBg: ... ← УДАЛЕНО
    },
    DARK: {
      bgColor: '#0f0f0f',
      textColor: '#ffffff',
      hintColor: '#aaaaaa',
      linkColor: '#5db0ff',
      borderColor: '#333333',
      cardBg: '#1c1c1c',
      // activeBg: ... ← УДАЛЕНО
    }
  }
} as const;

// УДАЛЕНА функция validateEnvironment