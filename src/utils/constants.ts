// src/utils/constants.ts
export const APP_CONSTANTS = {
  // Используем переменные окружения
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // Остальные константы
  DEBOUNCE_DELAY: 2000,
  TELEGRAM_INIT_DELAY: 100,
  
  LOCAL_STORAGE_KEYS: {
    DEV_USER_ID: 'flight_tracker_dev_user_id',
    THEME: 'flight_tracker_theme',
    LAST_SYNC: 'flight_tracker_last_sync'
  },
  
  USER_PREFIXES: {
    TELEGRAM: 'tg_',
    TELEGRAM_ANON: 'telegram_anon_',
    DEV: 'dev_user_'
  },
  
  DEFAULT_THEME: {
    LIGHT: {
      bgColor: '#ffffff',
      textColor: '#000000',
      hintColor: '#888888',
      linkColor: '#0088cc',
      borderColor: '#e0e0e0',
      cardBg: '#ffffff',
      activeBg: '#f0f8ff'
    },
    DARK: {
      bgColor: '#0f0f0f',
      textColor: '#ffffff',
      hintColor: '#aaaaaa',
      linkColor: '#5db0ff',
      borderColor: '#333333',
      cardBg: '#1c1c1c',
      activeBg: 'rgba(93, 176, 255, 0.1)'
    }
  }
} as const;

// Проверка обязательных переменных окружения
export const validateEnvironment = (): void => {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};