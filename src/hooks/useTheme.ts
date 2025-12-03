import { useEffect } from 'react';
import { ThemeParams } from '../types';
import { ThemeService } from '../utils/theme';

export const useTheme = (isTelegram: boolean, themeParams: ThemeParams | null) => {
  useEffect(() => {
    if (isTelegram && themeParams) {
      ThemeService.applyTelegramTheme(themeParams);
    } else {
      ThemeService.applyDefaultTheme();
    }
  }, [isTelegram, themeParams]);
};
