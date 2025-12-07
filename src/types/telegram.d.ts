// src/types/telegram.d.ts

type TelegramEventType = 
  | 'themeChanged'
  | 'viewportChanged'
  | 'mainButtonClicked'
  | 'backButtonClicked'
  | 'settingsButtonClicked'
  | 'invoiceClosed'
  | 'popupClosed'
  | 'clipboardTextReceived'
  | 'writeAccessRequested'
  | 'contactRequested';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: true;
  allows_write_to_pm?: true;
  photo_url?: string;
}

interface WebAppInitData {
  user?: TelegramUser;
  query_id?: string;
  auth_date: number;
  hash: string;
  receiver?: TelegramUser;
  start_param?: string;
}

interface ThemeParams {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color?: string;
}

interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  
  setText(text: string): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }): void;
}

interface BackButton {
  isVisible: boolean;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
}

interface SettingsButton {
  isVisible: boolean;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
}

interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

interface TelegramWebApp {
  // Инициализационные данные
  initData: string;
  initDataUnsafe: WebAppInitData;
  
  // Метаданные
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  
  // Состояние
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  
  // Компоненты
  MainButton: MainButton;
  BackButton: BackButton;
  SettingsButton: SettingsButton;
  HapticFeedback: HapticFeedback;
  
  // Методы
  ready(): void;
  expand(): void;
  close(): void;
  
  // 🔥 ИСПРАВЛЕНО: sendData принимает объект с полем data
  sendData(data: { data: string }): void;
  
  showPopup(params: {
    title?: string;
    message: string;
    buttons: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId?: string) => void): void;
  
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  openLink(url: string): void;
  
  // События
  onEvent(eventType: TelegramEventType, eventHandler: (event?: any) => void): void;
  offEvent(eventType: TelegramEventType, eventHandler: (event?: any) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};