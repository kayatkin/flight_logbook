// src/hooks/useSupabaseSync.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncState } from '@/types';
import { SupabaseService } from '@/services/supabase.service';
import { useDebounce } from './useDebounce';
import { Logger } from '@/utils/helpers';
import { useFlightStore } from '@/store/useFlightStore';

export const useSupabaseSync = (userId?: string) => {
  const [syncStatus, setSyncStatus] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    hasError: false,
    errorMessage: undefined,
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const isMounted = useRef(true);
  const pendingChangesRef = useRef(0);
  
  // Получаем данные ТОЛЬКО из локального store
  const { 
    flights: localFlights,
    isLoading: localStoreLoading,
    error: localStoreError,
    clearError: clearLocalStoreError,
  } = useFlightStore();

  // Проверка подключения к интернету (не к Supabase!)
  const updateConnectionStatus = useCallback(() => {
    const online = navigator.onLine;
    setConnectionStatus(online ? 'online' : 'offline');
    Logger.debug('Connection status updated', { online });
  }, []);

  // Проверка подключения к Supabase (только если онлайн)
  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    if (connectionStatus !== 'online') return false;
    return await SupabaseService.checkConnection();
  }, [connectionStatus]);

  // Проверка окружения
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = 'Отсутствуют переменные окружения Supabase. Проверьте .env файл.';
      Logger.error('Environment validation failed', { missing: !supabaseUrl ? 'URL' : 'KEY' });
      setSyncStatus(prev => ({ ...prev, hasError: true, errorMessage: errorMsg }));
      return;
    }
    
    Logger.debug('Environment validation passed');
  }, []);

  // Настройка слушателей онлайн/офлайн
  useEffect(() => {
    updateConnectionStatus();
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      isMounted.current = false;
    };
  }, [updateConnectionStatus]);

  // Инициализация: загрузка из Supabase при старте (только если онлайн)
  useEffect(() => {
    if (!userId || initialLoadComplete || connectionStatus !== 'online') return;
    
    const initialize = async () => {
      try {
        const supabaseOnline = await checkSupabaseConnection();
        if (!supabaseOnline) {
          setSyncStatus(prev => ({
            ...prev,
            hasError: true,
            errorMessage: 'Нет подключения к серверу. Используются локальные данные.',
          }));
          setInitialLoadComplete(true);
          return;
        }
        
        Logger.info('Загрузка данных из Supabase при старте', { userId });
        const userData = await SupabaseService.loadUserData(userId);
        
        // Применяем данные к локальному store
        // ⚠️ ВАЖНО: здесь должна быть логика merge, если вы поддерживаете мультидевайс
        // Для простоты — просто заменяем (если данных в store нет)
        const { flights: currentFlights } = useFlightStore.getState();
        if (currentFlights.length === 0 && userData.flights.length > 0) {
          // Здесь вы можете использовать batch-операции в store, если реализованы
          // Сейчас просто игнорируем — store остаётся первичным
          Logger.info('Данные из облака проигнорированы: локальный store имеет приоритет');
        }
        
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date().toISOString(),
          hasError: false,
          errorMessage: undefined,
        }));
        setInitialLoadComplete(true);
        Logger.info('Инициализация синхронизации завершена');
      } catch (error) {
        Logger.error('Ошибка инициализации синхронизации', error);
        setSyncStatus(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Не удалось загрузить данные из облака',
        }));
        setInitialLoadComplete(true);
      }
    };
    
    initialize();
  }, [userId, connectionStatus, checkSupabaseConnection, initialLoadComplete]);

  // Дебаунсированная синхронизация при изменении локальных данных
  const debouncedSync = useDebounce(async () => {
    if (!userId || !isMounted.current || connectionStatus !== 'online') return;
    
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      await SupabaseService.saveUserData(userId, {
        flights: localFlights,
        airlines: [],
        origin_cities: [],
        destination_cities: [],
      });
      
      pendingChangesRef.current = 0;
      if (isMounted.current) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          pendingChanges: 0,
          hasError: false,
          errorMessage: undefined,
        }));
        Logger.debug('Синхронизация завершена успешно');
      }
    } catch (error) {
      if (isMounted.current) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          hasError: true,
          errorMessage: 'Ошибка синхронизации с сервером',
        }));
        Logger.error('Ошибка синхронизации', error);
      }
    }
  }, 3000);

  // Отслеживаем изменения в локальных данных
  useEffect(() => {
    if (!userId || !initialLoadComplete) return;
    
    if (connectionStatus === 'online') {
      pendingChangesRef.current += 1;
      setSyncStatus(prev => ({ ...prev, pendingChanges: pendingChangesRef.current }));
      debouncedSync();
    }
  }, [userId, localFlights, connectionStatus, initialLoadComplete, debouncedSync]);

  // Принудительная синхронизация
  const forceSync = useCallback(async () => {
    if (!userId || connectionStatus !== 'online') {
      Logger.warn('Принудительная синхронизация отменена: нет подключения');
      return;
    }
    
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      await SupabaseService.saveUserData(userId, {
        flights: localFlights,
        airlines: [],
        origin_cities: [],
        destination_cities: [],
      });
      
      pendingChangesRef.current = 0;
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
        hasError: false,
      }));
      Logger.info('Принудительная синхронизация выполнена');
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        hasError: true,
        errorMessage: 'Ошибка принудительной синхронизации',
      }));
      Logger.error('Ошибка принудительной синхронизации', error);
      throw error;
    }
  }, [userId, localFlights, connectionStatus]);

  // Очистка ошибок
  const clearError = useCallback(() => {
    setSyncStatus(prev => ({ ...prev, hasError: false, errorMessage: undefined }));
    clearLocalStoreError();
  }, [clearLocalStoreError]);

  // Экспорт данных (только локальные!)
  const airlines = [...new Set(localFlights.map(f => f.airline).filter(Boolean))];
  const originCities = [...new Set(localFlights.map(f => f.origin).filter(Boolean))];
  const destinationCities = [...new Set(localFlights.map(f => f.destination).filter(Boolean))];

  return {
    // Данные (все из локального store)
    flights: localFlights,
    airlines,
    origin_cities: originCities,
    destination_cities: destinationCities,
    
    // Состояние
    loading: localStoreLoading || !initialLoadComplete,
    error: syncStatus.errorMessage || localStoreError,
    syncStatus,
    connectionStatus,
    isOnline: connectionStatus === 'online',
    lastSync: syncStatus.lastSync,
    pendingChanges: syncStatus.pendingChanges,
    
    // Действия
    forceSync,
    clearError,
    
    // Утилиты (для App)
    retrySync: forceSync,
    checkConnection: checkSupabaseConnection,
  };
};

// Тип возвращаемого значения
export type UseSupabaseSyncReturn = ReturnType<typeof useSupabaseSync>;