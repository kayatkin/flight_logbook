import { useEffect, useState, useCallback } from 'react';
import { TelegramWebApp, ThemeParams } from '../types';
import { TelegramService } from '../utils/telegram';
import { Logger } from '../utils/helpers';

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [themeParams, setThemeParams] = useState<ThemeParams | null>(null);
  
  const initializeTelegram = useCallback(() => {
    // УДАЛЕНА искусственная задержка
    const telegramWebApp = TelegramService.getWebApp();
    
    if (telegramWebApp) {
      try {
        TelegramService.initialize(telegramWebApp);
        setWebApp(telegramWebApp);
        setIsTelegram(true);
        setThemeParams(telegramWebApp.themeParams);
        Logger.info('Telegram WebApp initialized successfully');
      } catch (error) {
        Logger.error('Failed to initialize Telegram WebApp', error);
      }
    } else {
      Logger.debug('Running outside Telegram environment');
    }
  }, []);
  
  useEffect(() => {
    initializeTelegram();
  }, [initializeTelegram]);
  
  return {
    webApp,
    isTelegram,
    themeParams,
  };
};