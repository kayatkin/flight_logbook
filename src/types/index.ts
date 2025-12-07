// === Основные сущности ===

/**
 * Представление перелёта в клиентском приложении.
 * Все опциональные поля используют `undefined`, а не пустые строки.
 */
export interface Flight {
  id: string;
  date: string; // YYYY-MM-DD
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft?: string;
  registration?: string;
  seat?: string;
  distance?: number; // км
  duration?: string; // напр.: "2h 30m"
  class: FlightClass;
  reason?: FlightReason;
  note?: string;
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601
}

export type FlightClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type FlightReason = 'business' | 'leisure' | 'personal' | 'connecting' | 'other';

/**
 * Данные формы добавления перелёта.
 * Опциональные поля могут быть undefined — форма отправляет только то, что ввёл пользователь.
 */
export interface FlightFormData {
  date: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft?: string;
  registration?: string;
  seat?: string;
  distance?: string; // строка из инпута, преобразуется в number
  duration?: string;
  class: FlightClass; // всегда задан (с дефолтом)
  note?: string;
}

// === Фильтрация и статистика ===

export interface FlightFilters {
  search?: string;
  airline?: string;
  dateFrom?: string;
  dateTo?: string;
  minDistance?: number;
  maxDistance?: number;
  class?: FlightClass;
  sortBy?: 'date' | 'distance' | 'airline' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface FlightStats {
  totalFlights: number;
  totalDistance: number;
  uniqueAirlines: number;
  uniqueDestinations: number;
  firstFlight?: string;
  lastFlight?: string;
  mostFrequentAirlines: Array<{ airline: string; count: number }>;
  longestFlight?: Flight;
  shortestFlight?: Flight;
}

// === Telegram интеграция ===

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface ThemeParams {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color?: string;
}

/**
 * Минимальный интерфейс Telegram WebApp, используемый в приложении.
 */
export interface TelegramWebApp {
  // Инициализационные данные
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: string;
    hash?: string;
  };
  
  // Метаданные
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  
  // Состояние
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;

  // Основные методы
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  openLink: (url: string) => void;
  
  // 🔥 ДОБАВЛЕНО: Методы для работы с событиями
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  
  // 🔥 ДОБАВЛЕНО: Метод отправки данных
  sendData: (data: { data: string }) => void;
  
  // 🔥 ДОБАВЛЕНО: Метод показа popup
  showPopup: (
    params: {
      title?: string;
      message: string;
      buttons: Array<{
        id?: string;
        type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
        text: string;
      }>;
    },
    callback?: (buttonId?: string) => void
  ) => void;

  // Компоненты
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };

  // 🔥 ДОБАВЛЕНО: BackButton (если используется)
  BackButton?: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };

  // 🔥 ДОБАВЛЕНО: SettingsButton (если используется)
  SettingsButton?: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };

  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

// === Данные пользователя и синхронизация ===

export interface UserData {
  id: string; // UUID
  name: string;
  isTelegram: boolean;
  telegramId?: string;
  avatarUrl?: string;
}

export interface SupabaseData {
  flights: Flight[];
  airlines: string[];
  origin_cities: string[];
  destination_cities: string[];
  _synced_at?: string;
}

export interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  pendingChanges: number;
  hasError: boolean;
  errorMessage?: string;
}

// === Типы для компонентов ===

export interface AddFlightFormProps {
  onAdd: (flight: FlightFormData) => Promise<void>;
  isLoading?: boolean;
  airlines?: string[];
  cities?: string[];
  className?: string;
}

export interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => Promise<void>;
  onEdit?: (flight: Flight) => void;
  isLoading?: boolean;
  filters?: FlightFilters;
  onFilterChange?: (filters: FlightFilters) => void;
  className?: string;
}

// === Глобальные декларации ===

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// === ВАЖНО: Тип Database рекомендуется генерировать автоматически ===
//
// Запустите в корне проекта:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/supabase.generated.ts
//
// Затем замените этот блок на:
// export type { Database } from './supabase.generated';

// Временный тип для совместимости (удалить после генерации)
export type Database = {
  public: {
    Tables: {
      flights: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          airline: string;
          flight_number: string;
          origin: string;
          destination: string;
          aircraft: string | null;
          registration: string | null;
          seat: string | null;
          distance: number | null;
          duration: string | null;
          class: string | null;
          reason: string | null;
          note: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          airline: string;
          flight_number: string;
          origin: string;
          destination: string;
          aircraft?: string | null;
          registration?: string | null;
          seat?: string | null;
          distance?: number | null;
          duration?: string | null;
          class?: string | null;
          reason?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          airline?: string;
          flight_number?: string;
          origin?: string;
          destination?: string;
          aircraft?: string | null;
          registration?: string | null;
          seat?: string | null;
          distance?: number | null;
          duration?: string | null;
          class?: string | null;
          reason?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
  };
};