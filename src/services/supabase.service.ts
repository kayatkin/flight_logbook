// src/services/supabase.service.ts
import { supabase } from '../lib/supabaseClient';
import { Flight, SupabaseData, Database, FlightClass } from '../types';
import { Logger } from '../utils/helpers';

// Используем типы из Database
type FlightRow = Database['public']['Tables']['flights']['Row'];
type FlightInsert = Database['public']['Tables']['flights']['Insert'];
type FlightUpdate = Database['public']['Tables']['flights']['Update'];

// Тип для данных, которые мы будем отправлять в Supabase
type SupabaseFlightData = {
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
  class?: string | null;
  reason?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export class SupabaseService {
  private static readonly TABLE_NAME = 'flights';
  
  // Валидация UUID
  private static validateUUID(userId: string): void {
    // Проверяем базовый формат UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(userId)) {
      const error = new Error(`Invalid user ID format. Expected UUID, got: ${userId.substring(0, 20)}...`);
      Logger.error('Invalid UUID format', { userId, error });
      throw error;
    }
  }
  
  // Проверка соединения с Supabase
  static async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flights')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          Logger.warn('Flights table does not exist yet, but Supabase connection is OK');
          return true;
        }
        
        if (error.message?.includes('Failed to fetch') || error.code === 'PGRST301') {
          Logger.error('Cannot connect to Supabase. Check URL and API key.', error);
          return false;
        }
        
        Logger.warn('Supabase connection check warning', error);
        return true;
      }
      
      Logger.info('Supabase connection established successfully');
      return true;
    } catch (error) {
      Logger.error('Supabase connection check exception', error);
      return false;
    }
  }

  // Преобразование Flight в формат Supabase
  private static convertToSupabaseFormat(flight: Flight, userId: string): SupabaseFlightData {
    return {
      id: flight.id,
      user_id: userId,
      date: flight.date,
      airline: flight.airline,
      flight_number: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      aircraft: flight.aircraft || null,
      registration: flight.registration || null,
      seat: flight.seat || null,
      distance: flight.distance || null,
      duration: flight.duration || null,
      class: flight.class || null, // FlightClass автоматически преобразуется в string
      reason: flight.reason || null,
      note: flight.note || null,
      created_at: flight.created_at,
      updated_at: flight.updated_at || null
    };
  }

  // Преобразование из формата Supabase в Flight
  private static convertFromSupabaseFormat(row: FlightRow): Flight {
    // Преобразуем string в FlightClass с проверкой
    const convertClass = (value: string | null): FlightClass | undefined => {
      if (!value) return undefined;
      const validClasses: FlightClass[] = ['economy', 'premium_economy', 'business', 'first'];
      return validClasses.includes(value as FlightClass) ? value as FlightClass : undefined;
    };
    
    return {
      id: row.id,
      date: row.date,
      airline: row.airline,
      flightNumber: row.flight_number,
      origin: row.origin,
      destination: row.destination,
      aircraft: row.aircraft || undefined,
      registration: row.registration || undefined,
      seat: row.seat || undefined,
      distance: row.distance || undefined,
      duration: row.duration || undefined,
      class: convertClass(row.class),
      reason: row.reason || undefined,
      note: row.note || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at || undefined,
      supabase_created_at: row.created_at
    };
  }
  
  // Получение всех данных пользователя
  static async loadUserData(userId: string): Promise<SupabaseData> {
    try {
      // Валидация UUID
      this.validateUUID(userId);
      
      Logger.debug('Loading user data from Supabase', { userId });
      
      const { data, error, count } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        Logger.error('Failed to load user data from Supabase', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Явно указываем тип данных
      const flightRows = (data || []) as FlightRow[];
      
      const flights = flightRows.map(row => 
        this.convertFromSupabaseFormat(row)
      );
      
      // Извлекаем уникальные значения для автодополнения
      const airlines = [...new Set(flights
        .map(f => f.airline)
        .filter((airline): airline is string => !!airline)
        .map(airline => airline.trim()))];
      
      const originCities = [...new Set(flights
        .map(f => f.origin)
        .filter((city): city is string => !!city)
        .map(city => city.trim()))];
      
      const destinationCities = [...new Set(flights
        .map(f => f.destination)
        .filter((city): city is string => !!city)
        .map(city => city.trim()))];
      
      Logger.info('User data loaded successfully', {
        userId,
        flightsCount: count || 0,
        airlinesCount: airlines.length,
        originsCount: originCities.length,
        destinationsCount: destinationCities.length
      });
      
      return {
        flights,
        airlines,
        origin_cities: originCities,
        destination_cities: destinationCities
      };
    } catch (error) {
      Logger.error('Critical error loading user data', error);
      
      // Возвращаем пустые данные вместо ошибки для лучшего UX
      return {
        flights: [],
        airlines: [],
        origin_cities: [],
        destination_cities: []
      };
    }
  }
  
  // Сохранение всех данных пользователя
  static async saveUserData(
    userId: string,
    data: Omit<SupabaseData, 'user_id'>
  ): Promise<void> {
    try {
      this.validateUUID(userId);
      
      if (!data || !Array.isArray(data.flights)) {
        throw new Error('Invalid data format');
      }
      
      Logger.debug('Saving user data to Supabase', {
        userId,
        flightsCount: data.flights.length
      });
      
      // Удаляем существующие данные пользователя
      const { error: deleteError } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('user_id', userId);
      
      if (deleteError && deleteError.code !== 'PGRST116') {
        Logger.error('Failed to delete old data', deleteError);
      }
      
      // Если есть данные для сохранения
      if (data.flights.length > 0) {
        // Подготавливаем данные для вставки
        const flightInserts: SupabaseFlightData[] = data.flights.map(flight => 
          this.convertToSupabaseFormat(flight, userId)
        );
        
        // Вставляем данные пачками
        const batchSize = 100;
        for (let i = 0; i < flightInserts.length; i += batchSize) {
          const batch = flightInserts.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from(this.TABLE_NAME)
            .insert(batch);
            
          if (insertError) {
            Logger.error('Failed to insert batch', {
              batchIndex: i,
              error: insertError
            });
            throw insertError;
          }
        }
        
        Logger.info('User data saved successfully', {
          userId,
          flightsCount: data.flights.length,
          batches: Math.ceil(data.flights.length / batchSize)
        });
      } else {
        Logger.info('No flights to save', { userId });
      }
    } catch (error) {
      Logger.error('Critical error saving user data', error);
      throw error;
    }
  }
  
  // Добавление одного перелета
  static async addFlight(userId: string, flight: Flight): Promise<void> {
    try {
      this.validateUUID(userId);
      
      if (!flight.id) {
        flight.id = crypto.randomUUID();
      }
      
      if (!flight.created_at) {
        flight.created_at = new Date().toISOString();
      }
      
      Logger.debug('Adding flight to Supabase', {
        userId,
        flightId: flight.id,
        airline: flight.airline,
        origin: flight.origin,
        destination: flight.destination
      });
      
      const insertData = this.convertToSupabaseFormat(flight, userId);
      
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .insert(insertData);
      
      if (error) {
        Logger.error('Failed to add flight to Supabase', {
          error,
          flightId: flight.id,
          userId
        });
        throw new Error(`Failed to save flight: ${error.message}`);
      }
      
      Logger.info('Flight added successfully', {
        userId,
        flightId: flight.id,
        airline: flight.airline
      });
    } catch (error) {
      Logger.error('Failed to add flight', error);
      throw error;
    }
  }
  
  // Удаление перелета
  static async deleteFlight(userId: string, flightId: string): Promise<void> {
    try {
      this.validateUUID(userId);
      
      if (!flightId) {
        throw new Error('Flight ID is required');
      }
      
      Logger.debug('Deleting flight from Supabase', {
        userId,
        flightId
      });
      
      const { error, count } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('user_id', userId)
        .eq('id', flightId);
      
      if (error) {
        Logger.error('Failed to delete flight from Supabase', {
          error,
          flightId,
          userId
        });
        throw new Error(`Failed to delete flight: ${error.message}`);
      }
      
      Logger.info('Flight deleted successfully', {
        userId,
        flightId,
        deletedCount: count
      });
    } catch (error) {
      Logger.error('Failed to delete flight', error);
      throw error;
    }
  }
  
  // Обновление перелета
  static async updateFlight(
    userId: string,
    flightId: string,
    updates: Partial<Flight>
  ): Promise<void> {
    try {
      this.validateUUID(userId);
      
      if (!flightId) {
        throw new Error('Flight ID is required');
      }
      
      Logger.debug('Updating flight in Supabase', {
        userId,
        flightId,
        updates: Object.keys(updates)
      });
      
      // Преобразуем обновления в формат Supabase
      const updateData: Record<string, any> = {};
      
      // Мапим поля из Flight в формат Supabase
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.airline !== undefined) updateData.airline = updates.airline;
      if (updates.flightNumber !== undefined) updateData.flight_number = updates.flightNumber;
      if (updates.origin !== undefined) updateData.origin = updates.origin;
      if (updates.destination !== undefined) updateData.destination = updates.destination;
      if (updates.aircraft !== undefined) updateData.aircraft = updates.aircraft || null;
      if (updates.registration !== undefined) updateData.registration = updates.registration || null;
      if (updates.seat !== undefined) updateData.seat = updates.seat || null;
      if (updates.distance !== undefined) updateData.distance = updates.distance || null;
      if (updates.duration !== undefined) updateData.duration = updates.duration || null;
      if (updates.class !== undefined) updateData.class = updates.class || null;
      if (updates.reason !== undefined) updateData.reason = updates.reason || null;
      if (updates.note !== undefined) updateData.note = updates.note || null;
      
      // Всегда обновляем updated_at
      updateData.updated_at = new Date().toISOString();
      
      // Обновляем в базе
      const { error: updateError } = await supabase
        .from(this.TABLE_NAME)
        .update(updateData)
        .eq('user_id', userId)
        .eq('id', flightId);
      
      if (updateError) {
        Logger.error('Failed to update flight in Supabase', {
          error: updateError,
          flightId,
          userId
        });
        throw new Error(`Failed to update flight: ${updateError.message}`);
      }
      
      Logger.info('Flight updated successfully', {
        userId,
        flightId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      Logger.error('Failed to update flight', error);
      throw error;
    }
  }
  
  // Поиск перелетов
  static async searchFlights(
    userId: string,
    query: string
  ): Promise<Flight[]> {
    try {
      this.validateUUID(userId);
      
      if (!query.trim()) {
        const data = await this.loadUserData(userId);
        return data.flights;
      }
      
      Logger.debug('Searching flights in Supabase', {
        userId,
        query
      });
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .or(`origin.ilike.%${query}%,destination.ilike.%${query}%,airline.ilike.%${query}%,flight_number.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) {
        Logger.error('Failed to search flights', error);
        throw error;
      }
      
      const flightRows = (data || []) as FlightRow[];
      const flights = flightRows.map(row => 
        this.convertFromSupabaseFormat(row)
      );
      
      Logger.info('Flight search completed', {
        userId,
        query,
        resultsCount: flights.length
      });
      
      return flights;
    } catch (error) {
      Logger.error('Failed to search flights', error);
      return [];
    }
  }
  
  // Получение статистики
  static async getStats(userId: string): Promise<{
    totalFlights: number;
    totalDistance: number;
    uniqueAirlines: number;
    uniqueDestinations: number;
    firstFlight?: string;
    lastFlight?: string;
  }> {
    try {
      this.validateUUID(userId);
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        Logger.error('Failed to get stats', error);
        throw error;
      }
      
      const flightRows = (data || []) as FlightRow[];
      const flights = flightRows.map(row => 
        this.convertFromSupabaseFormat(row)
      );
      
      if (flights.length === 0) {
        return {
          totalFlights: 0,
          totalDistance: 0,
          uniqueAirlines: 0,
          uniqueDestinations: 0
        };
      }
      
      const totalDistance = flights.reduce((sum, flight) => 
        sum + (flight.distance || 0), 0
      );
      
      const uniqueAirlines = new Set(
        flights.map(f => f.airline).filter(Boolean)
      ).size;
      
      const uniqueDestinations = new Set(
        flights.map(f => f.destination).filter(Boolean)
      ).size;
      
      const sortedFlights = [...flights].sort((a, b) => 
        new Date(a.date || a.created_at).getTime() - 
        new Date(b.date || b.created_at).getTime()
      );
      
      return {
        totalFlights: flights.length,
        totalDistance,
        uniqueAirlines,
        uniqueDestinations,
        firstFlight: sortedFlights[0]?.date || sortedFlights[0]?.created_at,
        lastFlight: sortedFlights[sortedFlights.length - 1]?.date || 
                   sortedFlights[sortedFlights.length - 1]?.created_at
      };
    } catch (error) {
      Logger.error('Failed to get stats', error);
      throw error;
    }
  }
}