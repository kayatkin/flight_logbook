// Типы для перелетов
export interface Flight {
  id: string;
  date: string; // Формат: YYYY-MM-DD
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft?: string; // Опционально
  registration?: string; // Опционально
  seat?: string; // Опционально
  distance?: number; // Опционально (в км)
  duration?: string; // Опционально (например: "2h 30m")
  class?: FlightClass; // Опционально
  reason?: string; // Опционально
  note?: string; // Опционально
  created_at: string; // ISO строка
  updated_at?: string; // ISO строка (опционально)
  supabase_created_at?: string; // Метаданные из Supabase
}

// Тип для класса обслуживания
export type FlightClass = 
  | 'economy' 
  | 'premium_economy' 
  | 'business' 
  | 'first';

// Тип для причины полета
export type FlightReason = 
  | 'business' 
  | 'leisure' 
  | 'personal' 
  | 'connecting' 
  | 'other';

// Данные из формы для создания перелета
export interface FlightFormData {
  date: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft: string;
  registration: string;
  seat: string;
  distance: string; // Строка в форме, преобразуется в number
  duration: string;
  class: FlightClass;
  note: string;
}

// Фильтры для поиска перелетов
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

// Статистика по перелетам
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

// Telegram типы
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

export interface TelegramWebApp {
  // Основные свойства
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: string;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  
  // Состояние
  isExpanded: boolean;
  isClosingConfirmationEnabled: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  
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
  
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  
  SettingsButton: {
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
  
  // Методы
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  
  // События
  onEvent: (eventType: TelegramEventType, eventHandler: Function) => void;
  offEvent: (eventType: TelegramEventType, eventHandler: Function) => void;
  
  // Дополнительные методы
  sendData: (data: any) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  
  // Биллинг
  openInvoice: (url: string, callback?: (status: string) => void) => void;
}

// Типы событий Telegram WebApp
export type TelegramEventType = 
  | 'themeChanged'
  | 'viewportChanged'
  | 'mainButtonClicked'
  | 'backButtonClicked'
  | 'settingsButtonClicked'
  | 'invoiceClosed'
  | 'qrTextReceived'
  | 'clipboardTextReceived'
  | 'writeAccessRequested'
  | 'contactRequested';

// Данные пользователя приложения
export interface UserData {
  id: string; // UUID
  name: string;
  isTelegram: boolean;
  telegramId?: number; // ID пользователя Telegram (если есть)
  avatarUrl?: string;
}

// Данные из Supabase
export interface SupabaseData {
  flights: Flight[];
  airlines: string[];
  origin_cities: string[];
  destination_cities: string[];
  _synced_at?: string; // Время последней синхронизации
}

// Состояние синхронизации
export interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  pendingChanges: number;
  hasError: boolean;
  errorMessage?: string;
}

// Настройки приложения
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  measurementUnits: 'metric' | 'imperial';
  autoSync: boolean;
  notifications: boolean;
  analytics: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  language: string;
}

// Тип для ответа Supabase
export type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
  status: number;
  statusText: string;
  count?: number | null;
};

// Типы для хуков
export interface UseFlightStoreReturn {
  flights: Flight[];
  addFlight: (flight: FlightFormData) => Promise<void>;
  updateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  deleteFlight: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  filters: FlightFilters;
  setFilters: (filters: Partial<FlightFilters>) => void;
  filteredFlights: Flight[];
  stats: FlightStats;
}

export interface UseSupabaseSyncReturn {
  data: SupabaseData;
  loading: boolean;
  error: string | null;
  syncStatus: SyncState;
  addFlight: (flight: Flight) => Promise<void>;
  deleteFlight: (flightId: string) => Promise<void>;
  updateFlight: (flightId: string, updates: Partial<Flight>) => Promise<void>;
  forceSync: () => Promise<void>;
  retrySync: () => Promise<void>;
}

// Утилитарные типы
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Enum для статусов
export enum FlightStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed'
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// Типы для компонентов
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

// Типы для Supabase Database - УПРОЩЕННАЯ ВЕРСИЯ
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
          class: string | null; // Supabase хранит как string
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
          class?: string | null; // Supabase хранит как string
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
          class?: string | null; // Supabase хранит как string
          reason?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
  };
};

// Global declarations
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}