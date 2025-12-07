import React, { useState, useEffect } from 'react';
import { TabButton } from './components/common/TabButton/TabButton';
import { LoadingSpinner } from './components/common/LoadingSpinner/LoadingSpinner';
import AddFlightForm from './components/AddFlightForm/AddFlightForm';
import HistoryView from './components/HistoryView/HistoryView';
import { useFlightStore, calculateStatistics, applyFilters } from './store/useFlightStore'; // ✅ Добавили useFlightStore
import { useTelegram } from './hooks/useTelegram';
import { useUser } from './hooks/useUser';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useTheme } from './hooks/useTheme';
import { FlightFormData } from './types';
import { Logger } from './utils/helpers';
import './App.module.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Telegram integration
  const { isTelegram, webApp } = useTelegram();
  const { user: telegramUser, loading: telegramLoading } = useUser(isTelegram);

  // Используем хук useFlightStore
  const { addFlight, deleteFlight, clearError } = useFlightStore();

  // Синхронизация с Supabase
  const {
    flights,
    airlines,
    origin_cities: originCities,
    destination_cities: destinationCities,
    loading: syncLoading,
    error: syncError,
    syncStatus,
    forceSync,
    clearError: clearSyncError,
    isOnline,
    lastSync,
    pendingChanges,
  } = useSupabaseSync(telegramUser?.id);

  // Тема
  useTheme(webApp);

  // Фильтрация и статистика (локальные вычисления)
  const [filters, _setFilters] = useState({ search: '' }); // ✅ setFilters пока оставляем, может понадобиться позже
  const filteredFlights = applyFilters(flights, filters);
  const statistics = calculateStatistics(filteredFlights);

  // Уведомления
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  };

  // Обработчик добавления перелёта
  const handleAddFlight = async (flightData: FlightFormData) => {
    try {
      await addFlight(flightData);
      
      showNotification('success', '✈️ Перелет успешно добавлен!');
      
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('success');
      }
      
      Logger.info('Flight added', {
        origin: flightData.origin,
        destination: flightData.destination,
      });
      
      setActiveTab('history');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showNotification('error', `Ошибка: ${errorMessage}`);
      
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('error');
      }
      
      Logger.error('Failed to add flight', error);
    }
  };

  // Обработчик удаления
  const handleDeleteFlight = async (id: string) => {
    let confirmed = false;
    if (webApp) {
      confirmed = await new Promise(res => webApp.showConfirm('Удалить этот перелет?', res));
    } else {
      confirmed = window.confirm('Удалить этот перелет?');
    }
    
    if (!confirmed) return;
    
    try {
      await deleteFlight(id);
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

  // Очистка ошибок
  const handleClearErrors = () => {
    clearSyncError();
    setNotification(null);
    clearError();
  };

  // Telegram WebApp инициализация
  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.expand();
      if (webApp.MainButton) {
        webApp.MainButton.setText('Синхронизировать');
        webApp.MainButton.onClick(forceSync);
        webApp.MainButton.show();
      }
      Logger.info('Telegram WebApp initialized');
    }
  }, [webApp, forceSync]);

  // Определяем, показывать ли загрузку
  const isLoading = telegramLoading || syncLoading;

  if (isLoading) {
    return (
      <LoadingSpinner 
        text={
          telegramLoading 
            ? 'Загрузка Telegram...' 
            : 'Синхронизация данных...'
        }
      />
    );
  }

  // Приветствие
  const getGreeting = () => {
    if (isTelegram && webApp?.initDataUnsafe?.user) {
      return `Привет, ${webApp.initDataUnsafe.user.first_name || 'путешественник'}! ✈️`;
    }
    return 'Добро пожаловать в бортовой журнал! ✈️';
  };

  // Информация о хранилище
  const getDataSource = () => {
    if (isTelegram && isOnline) {
      return '🔄 Данные синхронизируются с облаком';
    } else if (isTelegram && !isOnline) {
      return '⚡ Офлайн режим, данные локальные';
    }
    return '💾 Данные хранятся локально';
  };

  const totalFlights = flights.length;

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
            <small> • Синхронизировано: {formatLastSync(lastSync)}</small>
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
      {syncError && (
        <div className="error-notification" onClick={handleClearErrors}>
          ⚠️ {syncError}
          <button className="close-error">×</button>
        </div>
      )}

      {/* Офлайн баннер */}
      {!isOnline && (
        <div className="offline-banner">
          ⚡ Офлайн режим. Данные сохраняются локально.
          <button 
            className="retry-button"
            onClick={forceSync}
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
        <TabButton active={activeTab === 'add'} onClick={() => setActiveTab('add')}>
          ➕ Добавить перелет
        </TabButton>
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
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
            flights={filteredFlights}
            onDelete={handleDeleteFlight}
            isLoading={syncLoading}
          />
        )}
      </main>

      {/* Кнопка синхронизации (для не-Telegram) */}
      {!isTelegram && (
        <div className="sync-footer">
          <button
            className="sync-button"
            onClick={forceSync}
            disabled={syncStatus.isSyncing}
          >
            {syncStatus.isSyncing ? '🔄 Синхронизация...' : '🔄 Синхронизировать'}
          </button>
        </div>
      )}
    </div>
  );
};

// Вспомогательная функция форматирования времени
const formatLastSync = (lastSync: string): string => {
  const syncDate = new Date(lastSync);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) return 'только что';
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч назад`;
  return syncDate.toLocaleDateString('ru-RU');
};

export default App;