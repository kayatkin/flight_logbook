import React, { useState, useEffect, useRef } from 'react';
import { TabButton } from './components/common/TabButton/TabButton';
import { LoadingSpinner } from './components/common/LoadingSpinner/LoadingSpinner';
import AddFlightForm from './components/AddFlightForm/AddFlightForm';
import HistoryView from './components/HistoryView/HistoryView';
import { useFlightStore, calculateStatistics, applyFilters } from './store/useFlightStore';
import { useTelegram } from './hooks/useTelegram';
import { useUser } from './hooks/useUser';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useTheme } from './hooks/useTheme';
import { FlightFormData, Flight } from './types';
import { Logger } from './utils/helpers';
import './App.module.css';

const App: React.FC = () => {
  // Состояния UI
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // Флаг принудительного завершения загрузки (на случай зависания)
  const [forceLoaded, setForceLoaded] = useState(false);

  // Хуки
  const { isTelegram, webApp, themeParams } = useTelegram();
  const { user: telegramUser, loading: telegramLoading } = useUser(isTelegram);
  const {
    flights,
    airlines,
    origin_cities: originCities,
    destination_cities: destinationCities,
    loading: syncLoading,
    error: syncError,
    syncStatus,
    addFlight: syncAddFlight,
    deleteFlight: syncDeleteFlight,
    forceSync,
    clearError: clearSyncError,
    isOnline,
    lastSync,
    pendingChanges
  } = useSupabaseSync(telegramUser?.id);

  const {
    flights: localFlights,
    filters,
    isLoading: storeLoading,
    error: storeError,
    clearError: clearStoreError
  } = useFlightStore();

  // Вычисляем статистику и отфильтрованные перелеты
  const statistics = calculateStatistics(localFlights);
  const filteredLocalFlights = applyFilters(localFlights, filters);

  // Применяем тему
  useTheme(isTelegram, themeParams);

  // Таймер для принудительного завершения загрузки (на случай зависания)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Принудительно завершаем загрузку через 5 секунд максимум
    loadTimeoutRef.current = setTimeout(() => {
      console.log('Force loading completion after timeout');
      setForceLoaded(true);
    }, 5000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, []);

  // Сбрасываем таймер, когда загрузка завершилась нормально
  useEffect(() => {
    if (!telegramLoading && !syncLoading && !storeLoading) {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      setForceLoaded(true);
      console.log('All loading completed normally');
    }
  }, [telegramLoading, syncLoading, storeLoading]);

  // Показываем уведомление
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Обработчик добавления перелета
  const handleAddFlight = async (flightData: FlightFormData) => {
    try {
      // Преобразуем FlightFormData в Flight
      const flight: Omit<Flight, 'id' | 'created_at'> = {
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
        class: flightData.class,
        note: flightData.note || undefined,
      };

      // Используем синхронизированный метод
      await syncAddFlight(flight);

      // Показываем уведомление
      showNotification('success', '✈️ Перелет успешно добавлен!');
      
      // Вибрация в Telegram
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('success');
      }

      // Переключаемся на историю
      setActiveTab('history');

      // Логируем
      Logger.info('Flight added successfully', {
        origin: flightData.origin,
        destination: flightData.destination,
        airline: flightData.airline
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showNotification('error', `Ошибка: ${errorMessage}`);
      
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('error');
      }

      Logger.error('Failed to add flight', error);
    }
  };

  // Обработчик удаления перелета
  const handleDeleteFlight = async (id: string) => {
    try {
      // Подтверждение в Telegram или браузере
      let confirmed = false;
      
      if (webApp) {
        confirmed = await new Promise<boolean>((resolve) => {
          webApp.showConfirm('Удалить этот перелет?', (result) => {
            resolve(result);
          });
        });
      } else {
        confirmed = window.confirm('Удалить этот перелет?');
      }

      if (!confirmed) return;

      // Удаляем через синхронизированный метод
      await syncDeleteFlight(id);

      // Уведомление
      showNotification('success', 'Перелет удален');
      
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('warning');
      }

      Logger.info('Flight deleted', { flightId: id });

    } catch (error) {
      showNotification('error', 'Не удалось удалить перелет');
      Logger.error('Failed to delete flight', error);
    }
  };

  // Принудительная синхронизация
  const handleForceSync = async () => {
    try {
      await forceSync();
      showNotification('success', 'Данные синхронизированы');
    } catch (error) {
      showNotification('error', 'Ошибка синхронизации');
    }
  };

  // Очистка всех ошибок
  const handleClearErrors = () => {
    clearSyncError();
    clearStoreError();
    setNotification(null);
  };

  // Форматирование времени последней синхронизации
  const formatLastSync = () => {
    if (!lastSync) return 'никогда';
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч назад`;
    
    return syncDate.toLocaleDateString('ru-RU');
  };

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.expand();
      
      // Настройка MainButton если нужно
      if (webApp.MainButton) {
        webApp.MainButton.setText('Синхронизировать');
        webApp.MainButton.onClick(handleForceSync);
        webApp.MainButton.show();
      }
      
      Logger.info('Telegram WebApp initialized');
    }
  }, [webApp]);

  // Показываем загрузку только если не принудительно завершено
  const isLoading = (telegramLoading || syncLoading || storeLoading) && !forceLoaded;
  
  if (isLoading) {
    console.log('Showing loading spinner');
    return (
      <LoadingSpinner 
        text={telegramLoading ? 'Загрузка Telegram...' : 
              syncLoading ? 'Синхронизация данных...' : 
              'Загрузка перелетов...'}
      />
    );
  }

  // Определяем приветствие
  const getGreeting = () => {
    if (isTelegram && webApp?.initDataUnsafe?.user) {
      const user = webApp.initDataUnsafe.user;
      return `Привет, ${user.first_name || 'путешественник'}! ✈️`;
    }
    return 'Добро пожаловать в бортовой журнал! ✈️';
  };

  // Определяем источник данных
  const getDataSource = () => {
    if (isTelegram && isOnline) {
      return '🔄 Данные синхронизируются с облаком';
    } else if (isTelegram && !isOnline) {
      return '⚡ Офлайн режим, данные локальные';
    }
    return '💾 Данные хранятся локально';
  };

  // Актуальные данные для отображения
  const displayFlights = flights.length > 0 ? flights : filteredLocalFlights;
  const totalFlights = displayFlights.length;

  console.log('Rendering main interface with', totalFlights, 'flights');

  return (
    <div className="app">
      {/* Шапка */}
      <header className="header">
        <h1 className="title">✈️ Flight Logbook</h1>
        <p className="greeting">
          {getGreeting()} <strong>Перелетов: {totalFlights}</strong>
        </p>
        
        <div className="stats-bar">
          {statistics.totalDistance > 0 && (
            <span className="stat-item">
              📏 {statistics.totalDistance.toLocaleString()} км
            </span>
          )}
          {statistics.uniqueAirlines > 0 && (
            <span className="stat-item">
              ✈️ {statistics.uniqueAirlines} авиакомпаний
            </span>
          )}
        </div>
        
        <div className="storage-info">
          <small>{getDataSource()}</small>
          {lastSync && (
            <small> • Синхронизировано: {formatLastSync()}</small>
          )}
          {pendingChanges > 0 && (
            <small> • Изменений: {pendingChanges}</small>
          )}
        </div>
      </header>

      {/* Уведомления */}
      {notification && (
        <div 
          className={`notification notification-${notification.type}`}
          onClick={() => setNotification(null)}
        >
          {notification.message}
          <button className="notification-close">×</button>
        </div>
      )}

      {/* Ошибки */}
      {(syncError || storeError) && (
        <div className="error-notification" onClick={handleClearErrors}>
          ⚠️ {syncError || storeError}
          <button className="close-error">×</button>
        </div>
      )}

      {/* Офлайн баннер */}
      {!isOnline && (
        <div className="offline-banner">
          ⚡ Офлайн режим. Данные сохраняются локально.
          <button 
            className="retry-button"
            onClick={handleForceSync}
            disabled={syncStatus.isSyncing}
          >
            {syncStatus.isSyncing ? 'Синхронизация...' : 'Повторить'}
          </button>
        </div>
      )}

      {/* Индикатор синхронизации */}
      {syncStatus.isSyncing && (
        <div className="sync-indicator">
          🔄 Синхронизация...
        </div>
      )}

      {/* Вкладки */}
      <nav className="tabs">
        <TabButton
          active={activeTab === 'add'}
          onClick={() => setActiveTab('add')}
        >
          ➕ Добавить перелет
        </TabButton>
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          📚 История ({totalFlights})
        </TabButton>
      </nav>

      {/* Основной контент */}
      <main className="main">
        {activeTab === 'add' && (
          <AddFlightForm
            onAdd={handleAddFlight}
            isLoading={syncStatus.isSyncing}
            airlines={airlines}
            cities={[...originCities, ...destinationCities]}
          />
        )}
        
        {activeTab === 'history' && (
          <HistoryView
            flights={displayFlights}
            onDelete={handleDeleteFlight}
            isLoading={syncLoading || storeLoading}
          />
        )}
      </main>

      {/* Кнопка синхронизации (для не-Telegram) */}
      {!isTelegram && (
        <div className="sync-footer">
          <button
            className="sync-button"
            onClick={handleForceSync}
            disabled={syncStatus.isSyncing}
          >
            {syncStatus.isSyncing ? '🔄 Синхронизация...' : '🔄 Синхронизировать'}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;