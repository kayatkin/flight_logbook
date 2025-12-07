import { useEffect } from 'react';
import { TelegramWebApp } from '../types';
import { ThemeService } from '../utils/theme';

export const useTheme = (webApp: TelegramWebApp | null) => {
  useEffect(() => {
    if (webApp) {
      // Применяем начальную тему
      ThemeService.applyTelegramTheme(webApp.themeParams);
      
      // Подписываемся на изменения темы
      const handleThemeChange = () => {
        ThemeService.applyTelegramTheme(webApp.themeParams);
      };
      
      webApp.onEvent('themeChanged', handleThemeChange);
      
      return () => {
        webApp.offEvent('themeChanged', handleThemeChange);
      };
    } else {
      // Вне Telegram — стандартная тема
      ThemeService.applyDefaultTheme();
    }
  }, [webApp]);
};