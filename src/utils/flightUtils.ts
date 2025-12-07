// src/utils/flightUtils.ts
import { v4 as uuidv4 } from 'uuid';
import { Flight, FlightFormData, FlightClass } from '@/types';

/**
 * Генерирует уникальный идентификатор перелёта.
 * Использует UUID v4 для максимальной уникальности.
 */
export const generateFlightId = (): string => {
  return `flight_${uuidv4()}`;
};

/**
 * Валидация данных формы перелёта.
 * @returns массив сообщений об ошибках (пустой — если всё валидно)
 */
export const validateFlightData = (flightData: FlightFormData): string[] => {
  const errors: string[] = [];
  
  if (!flightData.origin?.trim()) errors.push('Город вылета обязателен');
  if (!flightData.destination?.trim()) errors.push('Город назначения обязателен');
  if (!flightData.date) errors.push('Дата перелета обязательна');
  if (!flightData.airline?.trim()) errors.push('Авиакомпания обязательна');
  if (!flightData.flightNumber?.trim()) errors.push('Номер рейса обязателен');
  
  // Валидация даты: не в будущем
  if (flightData.date) {
    const flightDate = new Date(flightData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (flightDate > today) {
      errors.push('Дата перелета не может быть в будущем');
    }
  }
  
  // Валидация дистанции
  if (flightData.distance) {
    const distanceNum = parseInt(flightData.distance, 10);
    if (isNaN(distanceNum) || distanceNum < 0) {
      errors.push('Дистанция должна быть положительным числом');
    }
  }
  
  return errors;
};

/**
 * Преобразует данные формы в формат Flight (без id и created_at).
 * Применяет нормализацию: trim, uppercase и т.д.
 */
export const convertFormToFlight = (flightData: FlightFormData): Omit<Flight, 'id' | 'created_at'> => {
  const now = new Date().toISOString();
  
  return {
    date: flightData.date,
    airline: flightData.airline.trim(),
    flightNumber: flightData.flightNumber.trim().toUpperCase(),
    origin: flightData.origin.trim(),
    destination: flightData.destination.trim(),
    aircraft: flightData.aircraft?.trim() || undefined,
    registration: flightData.registration?.trim()?.toUpperCase() || undefined,
    seat: flightData.seat?.trim()?.toUpperCase() || undefined,
    distance: flightData.distance ? parseInt(flightData.distance, 10) : undefined,
    duration: flightData.duration?.trim() || undefined,
    class: flightData.class as FlightClass,
    note: flightData.note?.trim() || undefined,
    updated_at: now,
  };
};