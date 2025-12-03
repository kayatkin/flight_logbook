import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Flight, FlightFormData, FlightClass, FlightFilters, FlightStats } from '@/types';

interface FlightStoreState {
  // Состояние
  flights: Flight[];
  isLoading: boolean;
  error: string | null;
  filters: FlightFilters;
  selectedFlight: Flight | null;
  
  // Действия
  addFlight: (flightData: FlightFormData) => Promise<void>;
  updateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  deleteFlight: (id: string) => Promise<void>;
  clearFlights: () => void;
  setFilters: (filters: Partial<FlightFilters>) => void;
  selectFlight: (flight: Flight | null) => void;
  clearError: () => void;
}

// Вспомогательные функции
const generateFlightId = (): string => {
  return `flight_${uuidv4()}`;
};

const validateFlightData = (flightData: FlightFormData): string[] => {
  const errors: string[] = [];
  
  if (!flightData.origin?.trim()) errors.push('Город вылета обязателен');
  if (!flightData.destination?.trim()) errors.push('Город назначения обязателен');
  if (!flightData.date) errors.push('Дата перелета обязательна');
  if (!flightData.airline?.trim()) errors.push('Авиакомпания обязательна');
  if (!flightData.flightNumber?.trim()) errors.push('Номер рейса обязателен');
  
  // Валидация даты
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
    const distanceNum = parseInt(flightData.distance);
    if (isNaN(distanceNum) || distanceNum < 0) {
      errors.push('Дистанция должна быть положительным числом');
    }
  }
  
  return errors;
};

const convertFormToFlight = (flightData: FlightFormData): Omit<Flight, 'id' | 'created_at'> => {
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
    distance: flightData.distance ? parseInt(flightData.distance) : undefined,
    duration: flightData.duration?.trim() || undefined,
    class: flightData.class as FlightClass,
    note: flightData.note?.trim() || undefined,
    updated_at: now
  };
};

export const calculateStatistics = (flights: Flight[]): FlightStats => {
  if (flights.length === 0) {
    return {
      totalFlights: 0,
      totalDistance: 0,
      uniqueAirlines: 0,
      uniqueDestinations: 0,
      mostFrequentAirlines: [],
      firstFlight: undefined,
      lastFlight: undefined,
      longestFlight: undefined,
      shortestFlight: undefined
    };
  }
  
  // Общая дистанция
  const totalDistance = flights.reduce((sum, flight) => 
    sum + (flight.distance || 0), 0
  );
  
  // Уникальные авиакомпании
  const airlineCounts = flights.reduce((acc, flight) => {
    if (flight.airline) {
      acc[flight.airline] = (acc[flight.airline] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const uniqueAirlines = Object.keys(airlineCounts).length;
  const mostFrequentAirlines = Object.entries(airlineCounts)
    .map(([airline, count]) => ({ airline, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Уникальные направления
  const uniqueDestinations = new Set(
    flights.map(f => f.destination).filter(Boolean)
  ).size;
  
  // Сортировка по дате для первого/последнего перелета
  const sortedByDate = [...flights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const firstFlight = sortedByDate[0];
  const lastFlight = sortedByDate[sortedByDate.length - 1];
  
  // Самый длинный и короткий перелет
  const flightsWithDistance = flights.filter(f => f.distance && f.distance > 0);
  let longestFlight: Flight | undefined;
  let shortestFlight: Flight | undefined;
  
  if (flightsWithDistance.length > 0) {
    longestFlight = flightsWithDistance.reduce((max, flight) => 
      (flight.distance || 0) > (max.distance || 0) ? flight : max
    );
    
    shortestFlight = flightsWithDistance.reduce((min, flight) => 
      (flight.distance || 0) < (min.distance || 0) ? flight : min
    );
  }
  
  return {
    totalFlights: flights.length,
    totalDistance,
    uniqueAirlines,
    uniqueDestinations,
    mostFrequentAirlines,
    firstFlight: firstFlight?.date,
    lastFlight: lastFlight?.date,
    longestFlight,
    shortestFlight
  };
};

export const applyFilters = (flights: Flight[], filters: FlightFilters): Flight[] => {
  let filtered = [...flights];
  
  // Поиск по тексту
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(flight => 
      flight.origin.toLowerCase().includes(searchLower) ||
      flight.destination.toLowerCase().includes(searchLower) ||
      flight.airline.toLowerCase().includes(searchLower) ||
      flight.flightNumber.toLowerCase().includes(searchLower) ||
      flight.aircraft?.toLowerCase().includes(searchLower) ||
      flight.note?.toLowerCase().includes(searchLower)
    );
  }
  
  // Фильтр по авиакомпании
  if (filters.airline) {
    filtered = filtered.filter(flight => 
      flight.airline === filters.airline
    );
  }
  
  // Фильтр по дате
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(flight => 
      new Date(flight.date) >= dateFrom
    );
  }
  
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    filtered = filtered.filter(flight => 
      new Date(flight.date) <= dateTo
    );
  }
  
  // Фильтр по дистанции
  if (filters.minDistance !== undefined) {
    filtered = filtered.filter(flight => 
      (flight.distance || 0) >= filters.minDistance!
    );
  }
  
  if (filters.maxDistance !== undefined) {
    filtered = filtered.filter(flight => 
      (flight.distance || 0) <= filters.maxDistance!
    );
  }
  
  // Фильтр по классу
  if (filters.class) {
    filtered = filtered.filter(flight => 
      flight.class === filters.class
    );
  }
  
  // Сортировка
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'date':
          return order * (new Date(a.date).getTime() - new Date(b.date).getTime());
        
        case 'distance':
          return order * ((a.distance || 0) - (b.distance || 0));
        
        case 'airline':
          return order * a.airline.localeCompare(b.airline);
        
        case 'created_at':
          return order * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        default:
          return 0;
      }
    });
  } else {
    // Сортировка по умолчанию: последние перелеты сначала
    filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  
  return filtered;
};

export const useFlightStore = create<FlightStoreState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      flights: [],
      isLoading: false,
      error: null,
      filters: {
        sortBy: 'date',
        sortOrder: 'desc'
      },
      selectedFlight: null,
      
      // Действия
      addFlight: async (flightData) => {
        try {
          set({ isLoading: true, error: null });
          
          // Валидация данных
          const validationErrors = validateFlightData(flightData);
          if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(', '));
          }
          
          // Конвертация формы в Flight
          const flightWithoutId = convertFormToFlight(flightData);
          const newFlight: Flight = {
            ...flightWithoutId,
            id: generateFlightId(),
            created_at: new Date().toISOString()
          };
          
          // Оптимистичное обновление UI
          set((state) => ({
            flights: [...state.flights, newFlight],
            isLoading: false
          }));
          
          console.log('Flight added successfully:', newFlight);
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Не удалось добавить перелет';
          
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          
          console.error('Failed to add flight:', error);
          throw error;
        }
      },
      
      updateFlight: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          
          const now = new Date().toISOString();
          const flightUpdates = {
            ...updates,
            updated_at: now
          };
          
          set((state) => ({
            flights: state.flights.map((flight) =>
              flight.id === id 
                ? { ...flight, ...flightUpdates }
                : flight
            ),
            isLoading: false
          }));
          
          // Обновляем выбранный перелет если он редактируется
          const { selectedFlight } = get();
          if (selectedFlight && selectedFlight.id === id) {
            set({ 
              selectedFlight: { ...selectedFlight, ...flightUpdates }
            });
          }
          
          console.log('Flight updated successfully:', { id, updates });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Не удалось обновить перелет';
          
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          
          console.error('Failed to update flight:', error);
          throw error;
        }
      },
      
      deleteFlight: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          set((state) => ({
            flights: state.flights.filter((flight) => flight.id !== id),
            isLoading: false
          }));
          
          // Сбрасываем выбранный перелет если он удаляется
          const { selectedFlight } = get();
          if (selectedFlight && selectedFlight.id === id) {
            set({ selectedFlight: null });
          }
          
          console.log('Flight deleted successfully:', { id });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Не удалось удалить перелет';
          
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          
          console.error('Failed to delete flight:', error);
          throw error;
        }
      },
      
      clearFlights: () => {
        if (window.confirm('Вы уверены? Это удалит все ваши перелеты.')) {
          set({ 
            flights: [],
            selectedFlight: null,
            error: null
          });
        }
      },
      
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },
      
      selectFlight: (flight) => {
        set({ selectedFlight: flight });
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'flight-logbook-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Миграция состояния при изменении версии
        if (version === 0) {
          return {
            ...persistedState,
            flights: persistedState.flights || [],
            isLoading: false,
            error: null,
            filters: {
              sortBy: 'date',
              sortOrder: 'desc'
            },
            selectedFlight: null
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        // Сохраняем только нужные данные в localStorage
        flights: state.flights,
        filters: state.filters
      })
    }
  )
);

// Селекторы для удобного использования
export const flightSelectors = {
  // Базовые селекторы
  flightCount: (state: FlightStoreState) => state.flights.length,
  
  // Поиск перелета по ID
  getFlightById: (id: string) => (state: FlightStoreState) => 
    state.flights.find(flight => flight.id === id),
  
  // Уникальные значения для фильтров
  uniqueAirlines: (state: FlightStoreState) => 
    [...new Set(state.flights.map(f => f.airline).filter(Boolean))],
  
  uniqueOrigins: (state: FlightStoreState) => 
    [...new Set(state.flights.map(f => f.origin).filter(Boolean))],
  
  uniqueDestinations: (state: FlightStoreState) => 
    [...new Set(state.flights.map(f => f.destination).filter(Boolean))],
  
  uniqueClasses: (state: FlightStoreState) => 
    [...new Set(state.flights.map(f => f.class).filter(Boolean))] as FlightClass[],
  
  // Последние перелеты
  recentFlights: (count: number) => (state: FlightStoreState) => 
    [...state.flights]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count),
  
  // Перелеты по месяцу/году
  flightsByMonth: (month: number, year: number) => (state: FlightStoreState) =>
    state.flights.filter(flight => {
      const date = new Date(flight.date);
      return date.getMonth() === month && date.getFullYear() === year;
    }),
  
  flightsByYear: (year: number) => (state: FlightStoreState) =>
    state.flights.filter(flight => {
      const date = new Date(flight.date);
      return date.getFullYear() === year;
    }),
  
  // Вспомогательные селекторы
  hasFlights: (state: FlightStoreState) => state.flights.length > 0,
  isLoading: (state: FlightStoreState) => state.isLoading,
  hasError: (state: FlightStoreState) => state.error !== null,
  getError: (state: FlightStoreState) => state.error,
  getFilters: (state: FlightStoreState) => state.filters,
  getSelectedFlight: (state: FlightStoreState) => state.selectedFlight
};