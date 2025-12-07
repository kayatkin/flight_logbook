import React, { useState, useMemo } from 'react';
import { HistoryViewProps } from '@/types'; // ✅ Импортируем тип из types
import { formatDateToDMY, formatFlightTime } from '@/utils/formatters';
import './HistoryView.module.css';

// Удаляем локальный интерфейс - используем импортированный
// interface HistoryViewProps {
//   flights: Flight[];
//   onDelete: (id: string) => void;
// }

const HistoryView: React.FC<HistoryViewProps> = ({ 
  flights, 
  onDelete,
  isLoading = false,
  className 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFlights = useMemo(() => {
    if (!searchTerm.trim()) return flights;
    
    const term = searchTerm.toLowerCase();
    return flights.filter(flight => 
      flight.origin.toLowerCase().includes(term) ||
      flight.destination.toLowerCase().includes(term) ||
      flight.airline.toLowerCase().includes(term) ||
      flight.flightNumber.toLowerCase().includes(term) ||
      (flight.aircraft && flight.aircraft.toLowerCase().includes(term)) ||
      (flight.note && flight.note.toLowerCase().includes(term))
    );
  }, [flights, searchTerm]);

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  // Добавим индикатор загрузки
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  // Показываем пустое состояние, если данных нет
  if (flights.length === 0) {
    return (
      <div className="history-empty">
        <div className="empty-icon">✈️</div>
        <h3>Нет сохраненных перелетов</h3>
        <p>Добавьте первый перелет во вкладке «➕ Добавить»</p>
      </div>
    );
  }

  return (
    <div className={`history-container ${className || ''}`}>
      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Поиск по городу, авиакомпании, рейсу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="flight-count">
          Найдено: {filteredFlights.length} из {flights.length}
        </div>
      </div>

      {filteredFlights.length === 0 && searchTerm ? (
        <div className="no-results">
          <p>Ничего не найдено по запросу «{searchTerm}»</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="clear-search"
          >
            Очистить поиск
          </button>
        </div>
      ) : (
        <div className="flight-list">
          {filteredFlights.map((flight) => (
            <div key={flight.id} className="flight-card">
              <div className="card-header">
                <div className="route">
                  <span className="city-badge departure">{flight.origin}</span>
                  <div className="flight-line">
                    <div className="flight-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <div className="airplane">✈️</div>
                  </div>
                  <span className="city-badge arrival">{flight.destination}</span>
                </div>
                <button
                  onClick={() => handleDelete(flight.id)}
                  className="delete-btn"
                  aria-label={`Удалить перелет от ${formatDateToDMY(flight.date)}`}
                  disabled={isLoading}
                >
                  {isLoading ? '⏳' : '🗑️'}
                </button>
              </div>

              <div className="card-content">
                <div className="flight-main-info">
                  <div className="info-row">
                    <span className="info-label">Дата:</span>
                    <span className="info-value">{formatDateToDMY(flight.date)}</span>
                  </div>
                  
                  <div className="info-row highlight">
                    <span className="info-label">Рейс:</span>
                    <span className="info-value">
                      {flight.airline} {flight.flightNumber}
                    </span>
                  </div>

                  {flight.aircraft && (
                    <div className="info-row">
                      <span className="info-label">Самолет:</span>
                      <span className="info-value">{flight.aircraft}</span>
                    </div>
                  )}

                  {flight.duration && (
                    <div className="info-row">
                      <span className="info-label">Время полета:</span>
                      <span className="info-value">{formatFlightTime(flight.duration)}</span>
                    </div>
                  )}

                  {flight.distance && (
                    <div className="info-row">
                      <span className="info-label">Расстояние:</span>
                      <span className="info-value">{flight.distance.toLocaleString()} км</span>
                    </div>
                  )}

                  {flight.class && (
                    <div className="info-row">
                      <span className="info-label">Класс:</span>
                      <span className="info-value badge">
                        {formatClassLabel(flight.class)}
                      </span>
                    </div>
                  )}

                  {flight.note && (
                    <div className="info-row note">
                      <span className="info-label">Заметка:</span>
                      <span className="info-value">{flight.note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer">
                <div className="flight-meta">
                  {flight.registration && (
                    <span className="meta-item">Рег: {flight.registration}</span>
                  )}
                  {flight.seat && (
                    <span className="meta-item">Место: {flight.seat}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Утилита для локализации класса обслуживания
const formatClassLabel = (flightClass: string): string => {
  const labels: Record<string, string> = {
    economy: 'Эконом',
    premium_economy: 'Премиум эконом',
    business: 'Бизнес',
    first: 'Первый',
  };
  return labels[flightClass] || flightClass;
};

export default HistoryView;