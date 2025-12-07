// src/store/useFlightStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flight, FlightFormData, FlightFilters, FlightStats } from '@/types';
import { validateFlightData, convertFormToFlight, generateFlightId } from '@/utils/flightUtils';
import { Logger } from '@/utils/helpers';

interface FlightStoreState {
  flights: Flight[];
  isLoading: boolean;
  error: string | null;
  filters: FlightFilters;
  selectedFlight: Flight | null;
  
  // Actions
  addFlight: (flightData: FlightFormData) => Promise<void>;
  updateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  deleteFlight: (id: string) => Promise<void>;
  clearFlights: () => void;
  setFilters: (filters: Partial<FlightFilters>) => void;
  selectFlight: (flight: Flight | null) => void;
  clearError: () => void;
}

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
      shortestFlight: undefined,
    };
  }
  
  const totalDistance = flights.reduce((sum, f) => sum + (f.distance || 0), 0);
  
  const airlineCounts = flights.reduce((acc, f) => {
    if (f.airline) acc[f.airline] = (acc[f.airline] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const uniqueAirlines = Object.keys(airlineCounts).length;
  const mostFrequentAirlines = Object.entries(airlineCounts)
    .map(([airline, count]) => ({ airline, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const uniqueDestinations = new Set(flights.map(f => f.destination).filter(Boolean)).size;
  
  const sortedByDate = [...flights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstFlight = sortedByDate[0];
  const lastFlight = sortedByDate[sortedByDate.length - 1];
  
  const flightsWithDistance = flights.filter(f => f.distance && f.distance > 0);
  let longestFlight: Flight | undefined;
  let shortestFlight: Flight | undefined;
  
  if (flightsWithDistance.length > 0) {
    longestFlight = flightsWithDistance.reduce((max, f) => (f.distance || 0) > (max.distance || 0) ? f : max);
    shortestFlight = flightsWithDistance.reduce((min, f) => (f.distance || 0) < (min.distance || 0) ? f : min);
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
    shortestFlight,
  };
};

export const applyFilters = (flights: Flight[], filters: FlightFilters): Flight[] => {
  let filtered = [...flights];
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(f =>
      f.origin.toLowerCase().includes(searchLower) ||
      f.destination.toLowerCase().includes(searchLower) ||
      f.airline.toLowerCase().includes(searchLower) ||
      f.flightNumber.toLowerCase().includes(searchLower) ||
      f.aircraft?.toLowerCase().includes(searchLower) ||
      f.note?.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.airline) {
    filtered = filtered.filter(f => f.airline === filters.airline);
  }
  
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(f => new Date(f.date) >= dateFrom);
  }
  
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    filtered = filtered.filter(f => new Date(f.date) <= dateTo);
  }
  
  if (filters.minDistance !== undefined) {
    filtered = filtered.filter(f => (f.distance || 0) >= filters.minDistance!);
  }
  
  if (filters.maxDistance !== undefined) {
    filtered = filtered.filter(f => (f.distance || 0) <= filters.maxDistance!);
  }
  
  if (filters.class) {
    filtered = filtered.filter(f => f.class === filters.class);
  }
  
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
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  return filtered;
};

export const useFlightStore = create<FlightStoreState>()(
  persist(
    (set, get) => ({
      flights: [],
      isLoading: false,
      error: null,
      filters: { sortBy: 'date', sortOrder: 'desc' },
      selectedFlight: null,
      
      addFlight: async (flightData) => {
        try {
          set({ isLoading: true, error: null });
          
          const validationErrors = validateFlightData(flightData);
          if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(', '));
          }
          
          const flightWithoutId = convertFormToFlight(flightData);
          const newFlight: Flight = {
            ...flightWithoutId,
            id: generateFlightId(),
            created_at: new Date().toISOString(),
          };
          
          set(state => ({
            flights: [...state.flights, newFlight],
            isLoading: false,
          }));
          
          Logger.debug('Flight added successfully', { flightId: newFlight.id });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить перелет';
          set({ error: errorMessage, isLoading: false });
          Logger.error('Failed to add flight', error);
          throw error;
        }
      },
      
      updateFlight: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const now = new Date().toISOString();
          
          set(state => ({
            flights: state.flights.map(f => f.id === id ? { ...f, ...updates, updated_at: now } : f),
            isLoading: false,
          }));
          
          const { selectedFlight } = get();
          if (selectedFlight?.id === id) {
            set({ selectedFlight: { ...selectedFlight, ...updates, updated_at: now } });
          }
          
          Logger.debug('Flight updated successfully', { id, updates: Object.keys(updates) });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить перелет';
          set({ error: errorMessage, isLoading: false });
          Logger.error('Failed to update flight', error);
          throw error;
        }
      },
      
      deleteFlight: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          set(state => ({
            flights: state.flights.filter(f => f.id !== id),
            isLoading: false,
          }));
          
          const { selectedFlight } = get();
          if (selectedFlight?.id === id) {
            set({ selectedFlight: null });
          }
          
          Logger.debug('Flight deleted successfully', { id });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить перелет';
          set({ error: errorMessage, isLoading: false });
          Logger.error('Failed to delete flight', error);
          throw error;
        }
      },
      
      clearFlights: () => {
        // В продакшене эта функция должна быть либо удалена, либо защищена
        // Для разработки оставим, но с явным подтверждением
        if (import.meta.env.DEV || window.confirm('⚠️ Это удалит ВСЕ перелёты безвозвратно. Продолжить?')) {
          set({ flights: [], selectedFlight: null, error: null });
          Logger.warn('All flights cleared');
        }
      },
      
      setFilters: (newFilters) => {
        set(state => ({ filters: { ...state.filters, ...newFilters } }));
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
      partialize: (state) => ({
        flights: state.flights,
        filters: state.filters,
      }),
      // Миграции можно оставить, но для краткости опущены — они у вас уже есть
    }
  )
);

// Селекторы остаются без изменений
export const flightSelectors = {
  flightCount: (state: FlightStoreState) => state.flights.length,
  getFlightById: (id: string) => (state: FlightStoreState) => state.flights.find(f => f.id === id),
  uniqueAirlines: (state: FlightStoreState) => [...new Set(state.flights.map(f => f.airline).filter(Boolean))],
  uniqueOrigins: (state: FlightStoreState) => [...new Set(state.flights.map(f => f.origin).filter(Boolean))],
  uniqueDestinations: (state: FlightStoreState) => [...new Set(state.flights.map(f => f.destination).filter(Boolean))],
  uniqueClasses: (state: FlightStoreState) => [...new Set(state.flights.map(f => f.class).filter(Boolean))] as any[],
  recentFlights: (count: number) => (state: FlightStoreState) =>
    [...state.flights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, count),
  hasFlights: (state: FlightStoreState) => state.flights.length > 0,
  isLoading: (state: FlightStoreState) => state.isLoading,
  hasError: (state: FlightStoreState) => state.error !== null,
  getError: (state: FlightStoreState) => state.error,
  getFilters: (state: FlightStoreState) => state.filters,
  getSelectedFlight: (state: FlightStoreState) => state.selectedFlight,
};