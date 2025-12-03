import React, { useState } from 'react';
import './AddFlightForm.module.css';
import { FlightFormData, FlightClass } from '@/types';

interface AddFlightFormProps {
  onAdd: (flight: FlightFormData) => void;
  isLoading?: boolean;
  airlines?: string[];
  cities?: string[];
}

const AddFlightForm: React.FC<AddFlightFormProps> = ({ 
  onAdd, 
  isLoading = false,
  airlines = [],
  cities = []
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FlightFormData>({
    origin: '',
    destination: '',
    date: today,
    airline: '',
    flightNumber: '',
    distance: '',
    duration: '',
    aircraft: '',
    registration: '',
    seat: '',
    class: 'economy',
    note: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Обязательные поля
    if (!formData.origin.trim()) {
      newErrors.origin = 'Город вылета обязателен';
    }
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'Город назначения обязателен';
    }
    
    if (!formData.date) {
      newErrors.date = 'Дата перелета обязательна';
    } else if (new Date(formData.date) > new Date()) {
      newErrors.date = 'Дата не может быть в будущем';
    }
    
    if (!formData.airline.trim()) {
      newErrors.airline = 'Авиакомпания обязательна';
    }
    
    if (!formData.flightNumber.trim()) {
      newErrors.flightNumber = 'Номер рейса обязателен';
    }

    // Валидация числовых полей
    if (formData.distance) {
      const distanceNum = parseInt(formData.distance);
      if (isNaN(distanceNum) || distanceNum < 0) {
        newErrors.distance = 'Дистанция должна быть положительным числом';
      }
    }

    // Валидация даты
    if (formData.date) {
      const flightDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (flightDate > today) {
        newErrors.date = 'Дата перелета не может быть в будущем';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onAdd(formData);
      
      // Сброс формы при успешном добавлении
      setFormData({
        origin: '',
        destination: '',
        date: today,
        airline: '',
        flightNumber: '',
        distance: '',
        duration: '',
        aircraft: '',
        registration: '',
        seat: '',
        class: 'economy',
        note: '',
      });
      
      setErrors({});
      
    } catch (error) {
      console.error('Failed to add flight:', error);
      // Ошибка обрабатывается в родительском компоненте
    }
  };

  const handleClear = () => {
    if (window.confirm('Очистить все поля формы?')) {
      setFormData({
        origin: '',
        destination: '',
        date: today,
        airline: '',
        flightNumber: '',
        distance: '',
        duration: '',
        aircraft: '',
        registration: '',
        seat: '',
        class: 'economy',
        note: '',
      });
      setErrors({});
    }
  };

  // Автодополнение для городов и авиакомпаний
  const filteredCities = cities.filter(city => 
    city.toLowerCase().includes(formData.origin.toLowerCase()) || 
    city.toLowerCase().includes(formData.destination.toLowerCase())
  ).slice(0, 5);

  const filteredAirlines = airlines.filter(airline =>
    airline.toLowerCase().includes(formData.airline.toLowerCase())
  ).slice(0, 5);

  return (
    <form onSubmit={handleSubmit} className="flight-form">
      <div className="form-section">
        <h4 className="section-title">📍 Маршрут</h4>
        
        <div className="form-group">
          <label className="form-label required">Город вылета</label>
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            placeholder="Москва (SVO)"
            required
            className={`form-input ${errors.origin ? 'error' : ''}`}
            list="cities-origin"
          />
          <datalist id="cities-origin">
            {filteredCities.map((city, index) => (
              <option key={`origin-${index}`} value={city} />
            ))}
          </datalist>
          {errors.origin && <span className="error-message">{errors.origin}</span>}
        </div>

        <div className="form-group">
          <label className="form-label required">Город назначения</label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="Стамбул (IST)"
            required
            className={`form-input ${errors.destination ? 'error' : ''}`}
            list="cities-destination"
          />
          <datalist id="cities-destination">
            {filteredCities.map((city, index) => (
              <option key={`dest-${index}`} value={city} />
            ))}
          </datalist>
          {errors.destination && <span className="error-message">{errors.destination}</span>}
        </div>

        <div className="form-group">
          <label className="form-label required">Дата перелета</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            max={today}
            required
            className={`form-input ${errors.date ? 'error' : ''}`}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-title">✈️ Авиакомпания и рейс</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Авиакомпания</label>
            <input
              type="text"
              name="airline"
              value={formData.airline}
              onChange={handleChange}
              placeholder="Turkish Airlines"
              required
              className={`form-input ${errors.airline ? 'error' : ''}`}
              list="airlines"
            />
            <datalist id="airlines">
              {filteredAirlines.map((airline, index) => (
                <option key={index} value={airline} />
              ))}
            </datalist>
            {errors.airline && <span className="error-message">{errors.airline}</span>}
          </div>

          <div className="form-group">
            <label className="form-label required">Номер рейса</label>
            <input
              type="text"
              name="flightNumber"
              value={formData.flightNumber}
              onChange={handleChange}
              placeholder="TK415"
              required
              className={`form-input ${errors.flightNumber ? 'error' : ''}`}
            />
            {errors.flightNumber && <span className="error-message">{errors.flightNumber}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Самолет (тип)</label>
            <input
              type="text"
              name="aircraft"
              value={formData.aircraft}
              onChange={handleChange}
              placeholder="Boeing 737-800"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Регистрация</label>
            <input
              type="text"
              name="registration"
              value={formData.registration}
              onChange={handleChange}
              placeholder="VP-BGD"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Место</label>
          <input
            type="text"
            name="seat"
            value={formData.seat}
            onChange={handleChange}
            placeholder="12A"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-title">📊 Детали перелета</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Дистанция (км)</label>
            <input
              type="number"
              name="distance"
              value={formData.distance}
              onChange={handleChange}
              placeholder="1000"
              className={`form-input ${errors.distance ? 'error' : ''}`}
              min="0"
              step="1"
            />
            {errors.distance && <span className="error-message">{errors.distance}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Длительность</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="2h 30m"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Класс обслуживания</label>
          <select
            name="class"
            value={formData.class}
            onChange={handleChange}
            className="form-input"
          >
            <option value="economy">Эконом</option>
            <option value="premium_economy">Премиум эконом</option>
            <option value="business">Бизнес</option>
            <option value="first">Первый</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-title">📝 Примечания</h4>
        <div className="form-group">
          <label className="form-label">Дополнительная информация</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Интересные моменты перелета, обслуживание, задержки и т.д."
            className="form-textarea"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Добавление...
            </>
          ) : (
            <>
              ✈️ Сохранить перелет
            </>
          )}
        </button>
        <button 
          type="button" 
          className="clear-button"
          onClick={handleClear}
          disabled={isLoading}
        >
          🗑️ Очистить форму
        </button>
      </div>
    </form>
  );
};

export default AddFlightForm;