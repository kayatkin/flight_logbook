// src/types/telegram.d.ts
declare global {
    interface TelegramWebApp {
      initData: string;
      initDataUnsafe: {
        user?: {
          id: number;
          first_name?: string;
          last_name?: string;
          username?: string;
          language_code?: string;
          is_premium?: boolean;
        };
        query_id?: string;
        auth_date?: string;
        hash?: string;
      };
      version: string;
      platform: string;
      colorScheme: string;
      themeParams: {
        bg_color: string;
        text_color: string;
        hint_color: string;
        link_color: string;
        button_color: string;
        button_text_color: string;
      };
      isExpanded: boolean;
      viewportHeight: number;
      viewportStableHeight: number;
      MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        setText: (text: string) => void;
        show: () => void;
        hide: () => void;
        enable: () => void;
        disable: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
      };
      BackButton: {
        isVisible: boolean;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
      };
      HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
      };
      ready: () => void;
      expand: () => void;
      close: () => void;
      showAlert: (message: string, callback?: () => void) => void;
      showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
      onEvent: (eventType: string, eventHandler: Function) => void;
      offEvent: (eventType: string, eventHandler: Function) => void;
    }
  
    interface Window {
      Telegram?: {
        WebApp: TelegramWebApp;
      };
    }
  }
  
  export {};