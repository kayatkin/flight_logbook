import { useEffect, useState, useCallback } from 'react';
import { TelegramWebApp, ThemeParams } from '../types';
import { TelegramService } from '../utils/telegram';
import { Logger } from '../utils/helpers';
import { APP_CONSTANTS } from '../utils/constants';

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [themeParams, setThemeParams] = useState<ThemeParams | null>(null);
  
  const initializeTelegram = useCallback(async () => {
    await new Promise(resolve => 
      setTimeout(resolve, APP_CONSTANTS.TELEGRAM_INIT_DELAY)
    );
    
    const telegramWebApp = TelegramService.getWebApp();
    
    if (telegramWebApp) {
      try {
        TelegramService.initialize(telegramWebApp);
        setWebApp(telegramWebApp);
        setIsTelegram(true);
        setThemeParams(telegramWebApp.themeParams);
        Logger.info('Telegram WebApp initialized');
      } catch (error) {
        Logger.error('Failed to initialize Telegram', error);
      }
    }
  }, []);
  
  useEffect(() => {
    initializeTelegram();
  }, [initializeTelegram]);
  
  const user = webApp?.initDataUnsafe?.user;
  
  return {
    webApp,
    isTelegram,
    themeParams,
    user: user ? {
      id: user.id.toString(),
      name: user.first_name || user.username || 'Пользователь'
    } : null
  };
};
