// src/utils/telegram.ts
import { TelegramWebApp } from '../types';

export class TelegramService {
  static getWebApp(): TelegramWebApp | null {
    if (typeof window === 'undefined') return null;
    
    const webApp = window.Telegram?.WebApp;
    
    if (webApp) {
      // УДАЛЕНО логгирование initDataUnsafe
      console.debug('[TelegramService] WebApp found', {
        platform: webApp.platform,
        version: webApp.version,
        // hasUser: ... ← НЕ ЛОГГИРУЕМ
      });
    }
    
    return webApp || null;
  }
  
  static getUser(): { id: string; name: string } | null {
    const webApp = this.getWebApp();
    
    if (!webApp?.initDataUnsafe?.user) {
      return null;
    }
    
    const user = webApp.initDataUnsafe.user;
    return {
      id: user.id.toString(),
      name: user.first_name || user.username || 'Пользователь'
    };
  }
  
  static initialize(webApp: TelegramWebApp): void {
    try {
      webApp.ready();
      webApp.expand();
      console.debug('[TelegramService] WebApp initialized');
    } catch (error) {
      console.error('[TelegramService] Initialization failed', error);
      throw error;
    }
  }
  
  static isTelegramAvailable(): boolean {
    return !!this.getWebApp();
  }
}