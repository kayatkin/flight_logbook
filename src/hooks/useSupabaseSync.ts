import { useState, useEffect, useCallback, useRef } from 'react';
import { Flight, FlightFormData, FlightClass, SupabaseData, SyncStatus, SyncState } from '@/types';
import { SupabaseService } from '@/services/supabase.service';
import { useDebounce } from './useDebounce';
import { Logger } from '@/utils/helpers';
import { useFlightStore } from '@/store/useFlightStore';

export const useSupabaseSync = (userId?: string) => {
  // Состояние синхронизации
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    hasError: false,
    errorMessage: undefined
  });
  
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Рефы для управления состоянием
  const isMounted = useRef(true);
  const syncInProgress = useRef(false);
  const pendingChangesRef = useRef<number>(0);
  const lastSyncRef = useRef<string | null>(null);
  
  // Локальный store для офлайн работы
  const { 
    flights: localFlights, 
    addFlight: addToLocalStore, 
    deleteFlight: deleteFromLocalStore,
    updateFlight: updateInLocalStore,
    isLoading: localStoreLoading,
    error: localStoreError,
    clearError: clearLocalStoreError
  } = useFlightStore();

  // Проверка соединения с Supabase
  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      const isConnected = await SupabaseService.checkConnection();
      setConnectionStatus(isConnected ? 'online' : 'offline');
      return isConnected;
    } catch (error) {
      setConnectionStatus('offline');
      Logger.error('Failed to check Supabase connection', error);
      return false;
    }
  }, []);

  // Проверка переменных окружения
  useEffect(() => {
    const checkEnvironment = () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        const missingVars = [];
        if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
        if (!supabaseKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
        
        const errorMsg = `Отсутствуют переменные окружения: ${missingVars.join(', ')}. Проверьте файл .env`;
        Logger.error('Environment validation failed', { missingVars });
        setSyncState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: errorMsg
        }));
        throw new Error(errorMsg);
      }
      
      Logger.debug('Environment validation passed', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    };

    try {
      checkEnvironment();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка окружения';
      setSyncState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: message
      }));
      setLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Загрузка данных из Supabase
  const loadFromSupabase = useCallback(async (id: string) => {
    if (!id || syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      setLoading(true);
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      
      Logger.info('Загрузка данных из Supabase', { userId: id });
      
      const userData = await SupabaseService.loadUserData(id);
      
      if (isMounted.current) {
        lastSyncRef.current = new Date().toISOString();
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: lastSyncRef.current,
          hasError: false,
          errorMessage: undefined
        }));
        
        Logger.info('Данные загружены успешно', { 
          flightsCount: userData.flights.length,
          airlinesCount: userData.airlines.length
        });
      }
      
      return userData;
    } catch (err) {
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки данных';
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          hasError: true,
          errorMessage
        }));
        Logger.error('Ошибка загрузки данных', err);
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
        syncInProgress.current = false;
      }
    }
  }, []);

  // Сохранение данных в Supabase
  const saveToSupabase = useCallback(async (id: string, flights: Flight[]) => {
    if (!id || syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      
      const supabaseData: SupabaseData = {
        flights,
        airlines: [...new Set(flights.map(f => f.airline).filter(Boolean))],
        origin_cities: [...new Set(flights.map(f => f.origin).filter(Boolean))],
        destination_cities: [...new Set(flights.map(f => f.destination).filter(Boolean))],
        _synced_at: new Date().toISOString()
      };
      
      await SupabaseService.saveUserData(id, supabaseData);
      
      if (isMounted.current) {
        lastSyncRef.current = new Date().toISOString();
        pendingChangesRef.current = 0;
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: lastSyncRef.current,
          pendingChanges: 0,
          hasError: false,
          errorMessage: undefined
        }));
        
        Logger.debug('Данные сохранены в Supabase', {
          userId: id,
          flightsCount: flights.length
        });
      }
    } catch (err) {
      if (isMounted.current) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          hasError: true,
          errorMessage: 'Ошибка синхронизации с сервером'
        }));
        Logger.error('Ошибка сохранения данных в Supabase', err);
      }
      throw err;
    } finally {
      if (isMounted.current) {
        syncInProgress.current = false;
      }
    }
  }, []);

  // Дебаунсированное сохранение
  const debouncedSave = useDebounce(saveToSupabase, 3000);

  // Инициализация: загрузка данных при появлении userId
  useEffect(() => {
    if (!userId) return;
    
    const initialize = async () => {
      try {
        // Проверяем соединение
        const isConnected = await checkConnection();
        
        if (isConnected) {
          // Загружаем данные из Supabase
          await loadFromSupabase(userId);
        } else {
          // Офлайн режим: используем локальные данные
          setSyncState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: 'Режим офлайн. Используются локальные данные.'
          }));
        }
      } catch (error) {
        Logger.error('Ошибка инициализации', error);
      }
    };
    
    initialize();
  }, [userId, checkConnection, loadFromSupabase]);

  // Автосохранение при изменении локальных данных
  useEffect(() => {
    if (!userId || syncState.isSyncing || connectionStatus !== 'online') return;
    
    // Увеличиваем счетчик изменений
    pendingChangesRef.current += 1;
    setSyncState(prev => ({
      ...prev,
      pendingChanges: pendingChangesRef.current
    }));
    
    // Дебаунсированное сохранение
    debouncedSave(userId, localFlights);
  }, [userId, localFlights, syncState.isSyncing, connectionStatus, debouncedSave]);

  // Преобразование FlightFormData в Flight
  const convertFormToFlight = useCallback((flightData: FlightFormData): Flight => {
    const now = new Date().toISOString();
    
    // Значение по умолчанию для класса
    const flightClass: FlightClass = flightData.class || 'economy';
    
    return {
      id: `flight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: flightData.date,
      airline: flightData.airline,
      flightNumber: flightData.flightNumber,
      origin: flightData.origin,
      destination: flightData.destination,
      aircraft: flightData.aircraft || undefined,
      registration: flightData.registration || undefined,
      seat: flightData.seat || undefined,
      distance: flightData.distance ? parseInt(flightData.distance) : undefined,
      duration: flightData.duration || undefined,
      class: flightClass,
      note: flightData.note || undefined,
      created_at: now,
      updated_at: undefined
    };
  }, []);

  // Обработчики для интеграции с локальным store
  const addFlight = useCallback(async (flightData: Omit<Flight, 'id' | 'created_at'>) => {
    try {
      // Значение по умолчанию для класса
      const flightClass: FlightClass = flightData.class || 'economy';
      
      // Преобразуем в FlightFormData для локального store
      const formData: FlightFormData = {
        date: flightData.date,
        airline: flightData.airline,
        flightNumber: flightData.flightNumber,
        origin: flightData.origin,
        destination: flightData.destination,
        aircraft: flightData.aircraft || '',
        registration: flightData.registration || '',
        seat: flightData.seat || '',
        distance: flightData.distance?.toString() || '',
        duration: flightData.duration || '',
        class: flightClass,
        note: flightData.note || ''
      };
      
      // Добавляем в локальный store
      await addToLocalStore(formData);
      
      // Если онлайн, сразу пытаемся сохранить в Supabase
      if (userId && connectionStatus === 'online') {
        try {
          const flight: Flight = {
            ...flightData,
            id: `flight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            // Убедимся, что class есть
            class: flightClass
          };
          await SupabaseService.addFlight(userId, flight);
          Logger.debug('Перелет добавлен в Supabase', { flightId: flight.id });
        } catch (supabaseError) {
          Logger.warn('Ошибка добавления в Supabase, данные сохранены локально', supabaseError);
        }
      }
    } catch (error) {
      Logger.error('Ошибка добавления перелета', error);
      throw error;
    }
  }, [userId, connectionStatus, addToLocalStore]);

  const deleteFlight = useCallback(async (flightId: string) => {
    try {
      // Сначала удаляем из локального store
      await deleteFromLocalStore(flightId);
      
      // Если онлайн, пытаемся удалить из Supabase
      if (userId && connectionStatus === 'online') {
        try {
          await SupabaseService.deleteFlight(userId, flightId);
          Logger.debug('Перелет удален из Supabase', { flightId });
        } catch (supabaseError) {
          Logger.warn('Ошибка удаления из Supabase, данные удалены локально', supabaseError);
        }
      }
    } catch (error) {
      Logger.error('Ошибка удаления перелета', error);
      throw error;
    }
  }, [userId, connectionStatus, deleteFromLocalStore]);

  const updateFlight = useCallback(async (flightId: string, updates: Partial<Flight>) => {
    try {
      // Сначала обновляем в локальном store
      await updateInLocalStore(flightId, updates);
      
      // Если онлайн, пытаемся обновить в Supabase
      if (userId && connectionStatus === 'online') {
        try {
          await SupabaseService.updateFlight(userId, flightId, updates);
          Logger.debug('Перелет обновлен в Supabase', { flightId });
        } catch (supabaseError) {
          Logger.warn('Ошибка обновления в Supabase, данные обновлены локально', supabaseError);
        }
      }
    } catch (error) {
      Logger.error('Ошибка обновления перелета', error);
      throw error;
    }
  }, [userId, connectionStatus, updateInLocalStore]);

  // Принудительная синхронизация
  const forceSync = useCallback(async () => {
    if (!userId || syncInProgress.current) return;
    
    try {
      await saveToSupabase(userId, localFlights);
      Logger.info('Принудительная синхронизация выполнена');
    } catch (error) {
      Logger.error('Ошибка принудительной синхронизации', error);
      throw error;
    }
  }, [userId, localFlights, saveToSupabase]);

  // Повторная попытка синхронизации
  const retrySync = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Проверяем соединение
      const isConnected = await checkConnection();
      
      if (isConnected) {
        await forceSync();
      } else {
        setSyncState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Нет соединения с интернетом'
        }));
      }
    } catch (error) {
      Logger.error('Ошибка повторной синхронизации', error);
    }
  }, [userId, checkConnection, forceSync]);

  // Сброс ошибок
  const clearError = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      hasError: false,
      errorMessage: undefined
    }));
    clearLocalStoreError();
  }, [clearLocalStoreError]);

  // Экспорт уникальных значений для автодополнения
  const airlines = [...new Set(localFlights.map(f => f.airline).filter(Boolean))];
  const originCities = [...new Set(localFlights.map(f => f.origin).filter(Boolean))];
  const destinationCities = [...new Set(localFlights.map(f => f.destination).filter(Boolean))];

  return {
    // Данные из локального store
    flights: localFlights,
    airlines,
    origin_cities: originCities,
    destination_cities: destinationCities,
    
    // Состояние
    loading: loading || localStoreLoading,
    error: syncState.errorMessage || localStoreError,
    syncStatus: syncState,
    connectionStatus,
    
    // Действия
    addFlight,
    deleteFlight,
    updateFlight,
    forceSync,
    retrySync,
    clearError,
    
    // Вспомогательные
    isSyncing: syncState.isSyncing,
    hasError: syncState.hasError || !!localStoreError,
    isOnline: connectionStatus === 'online',
    lastSync: syncState.lastSync,
    pendingChanges: syncState.pendingChanges,
    
    // Для проверки соединения
    checkConnection
  };
};

// Тип возвращаемого значения хука
export type UseSupabaseSyncReturn = ReturnType<typeof useSupabaseSync>;