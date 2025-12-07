import { supabase } from '../lib/supabaseClient';
import { Flight, SupabaseData, Database, FlightReason, FlightClass } from '../types';
import { Logger } from '../utils/helpers';

// Используем типы из Database
type FlightRow = Database['public']['Tables']['flights']['Row'];

// Тип для данных, отправляемых в Supabase
type SupabaseFlightData = {
  id: string;
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
        Logger.warn('Supabase connection warning', error);
        return true;
      }
      
      Logger.info('Supabase connection established successfully');
      return true;
    } catch (error) {
      Logger.error('Supabase connection check exception', error);
      return false;
    }
  }

  // Преобразование Flight → Supabase
  private static toSupabase(flight: Flight, userId: string): SupabaseFlightData {
    if (!flight.id) {
      throw new Error('Flight ID is required for synchronization');
    }
    
    const reason = flight.reason ? flight.reason.toString() : null;
    const flightClass = flight.class ? flight.class.toString() : null;
    
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
      class: flightClass,
      reason: reason,
      note: flight.note || null,
      created_at: flight.created_at,
      updated_at: flight.updated_at || null,
    };
  }

  // Преобразование Supabase → Flight
  private static fromSupabase(row: FlightRow): Flight {
    const validClasses: FlightClass[] = ['economy', 'premium_economy', 'business', 'first'];
    const validReasons: FlightReason[] = ['business', 'leisure', 'personal', 'connecting', 'other'];
    
    let flightClass: FlightClass = 'economy';
    if (row.class && validClasses.includes(row.class as FlightClass)) {
      flightClass = row.class as FlightClass;
    }
    
    let reason: FlightReason | undefined;
    if (row.reason && validReasons.includes(row.reason as FlightReason)) {
      reason = row.reason as FlightReason;
    }

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
      class: flightClass,
      reason: reason,
      note: row.note || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at || undefined,
    };
  }
  
  // Получение перелёта по ID
  private static async getFlightById(userId: string, flightId: string): Promise<Flight | null> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('id', flightId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.fromSupabase(data);
  }
  
  // Загрузка данных пользователя
  static async loadUserData(userId: string): Promise<SupabaseData> {
    this.validateUUID(userId);
    Logger.debug('Loading user data from Supabase', { userId });
    
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      Logger.error('Failed to load user data from Supabase', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    const flights = (data || []).map(row => this.fromSupabase(row));
    
    const airlines = [...new Set(flights.map(f => f.airline).filter(Boolean))];
    const originCities = [...new Set(flights.map(f => f.origin).filter(Boolean))];
    const destinationCities = [...new Set(flights.map(f => f.destination).filter(Boolean))];
    
    Logger.info('User data loaded successfully', {
      userId,
      flightsCount: flights.length,
    });
    
    return {
      flights,
      airlines,
      origin_cities: originCities,
      destination_cities: destinationCities,
    };
  }
  
  // СИНХРОНИЗАЦИЯ: безопасное обновление через UPSERT
  static async saveUserData(userId: string, data: Omit<SupabaseData, 'user_id'>): Promise<void> {
    this.validateUUID(userId);
    
    if (!Array.isArray(data.flights)) {
      throw new Error('Invalid data format: flights must be an array');
    }
    
    Logger.debug('Syncing user data to Supabase (upsert)', {
      userId,
      flightsCount: data.flights.length,
    });
    
    if (data.flights.length === 0) {
      Logger.info('No flights to sync', { userId });
      return;
    }
    
    const flightRecords: SupabaseFlightData[] = data.flights.map(flight => this.toSupabase(flight, userId));
    
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .upsert(flightRecords as any, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });
    
    if (error) {
      Logger.error('Failed to upsert user data', { error, userId });
      throw new Error(`Sync failed: ${error.message}`);
    }
    
    const localIds = new Set(data.flights.map(f => f.id));
    const { data: remoteRows, error: fetchError } = await supabase
      .from(this.TABLE_NAME)
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) {
      Logger.warn('Could not fetch remote IDs for cleanup', fetchError);
    } else if (remoteRows) {
      const typedRows = remoteRows as Array<{ id: string }>;
      const remoteIds = new Set(typedRows.map(r => r.id));
      const idsToDelete = [...remoteIds].filter(id => !localIds.has(id));
      
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(this.TABLE_NAME)
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          Logger.warn('Failed to delete stale records', deleteError);
        } else {
          Logger.debug('Deleted stale records', { count: idsToDelete.length });
        }
      }
    }
    
    Logger.info('User data synced successfully', {
      userId,
      upserted: flightRecords.length,
    });
  }
  
  // Добавление одного перелёта
  static async addFlight(userId: string, flight: Flight): Promise<void> {
    this.validateUUID(userId);
    if (!flight.id) {
      throw new Error('Flight ID is required');
    }
    if (!flight.created_at) {
      flight.created_at = new Date().toISOString();
    }
    
    Logger.debug('Adding flight to Supabase', {
      userId,
      flightId: flight.id,
    });
    
    const supabaseData = this.toSupabase(flight, userId);
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .insert(supabaseData as any);
    
    if (error) {
      Logger.error('Failed to add flight', { error, flightId: flight.id });
      throw new Error(`Failed to save flight: ${error.message}`);
    }
    
    Logger.info('Flight added successfully', { userId, flightId: flight.id });
  }
  
  // Удаление перелёта
  static async deleteFlight(userId: string, flightId: string): Promise<void> {
    this.validateUUID(userId);
    if (!flightId) throw new Error('Flight ID is required');
    
    Logger.debug('Deleting flight', { userId, flightId });
    
    const { error, count } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('user_id', userId)
      .eq('id', flightId);
    
    if (error) {
      Logger.error('Failed to delete flight', { error, flightId });
      throw error;
    }
    
    Logger.info('Flight deleted', { userId, flightId, count });
  }
  
  // Обновление перелёта - ИСПРАВЛЕННАЯ ВЕРСИЯ
  static async updateFlight(userId: string, flightId: string, updates: Partial<Flight>): Promise<void> {
    this.validateUUID(userId);
    if (!flightId) throw new Error('Flight ID is required');
    
    Logger.debug('Updating flight', { userId, flightId, fields: Object.keys(updates) });
    
    // Получаем текущий перелёт
    const currentFlight = await this.getFlightById(userId, flightId);
    if (!currentFlight) {
      throw new Error(`Flight ${flightId} not found for user ${userId}`);
    }
    
    // Создаем обновленный объект
    const updatedFlight: Flight = {
      ...currentFlight,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // Преобразуем в формат Supabase и используем upsert
    const updateData = this.toSupabase(updatedFlight, userId);
    
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .upsert(updateData as any, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });
    
    if (error) {
      Logger.error('Failed to update flight', { error, flightId });
      throw error;
    }
    
    Logger.info('Flight updated', { userId, flightId });
  }
  
  // Поиск перелётов
  static async searchFlights(userId: string, query: string): Promise<Flight[]> {
    this.validateUUID(userId);
    if (!query.trim()) {
      const data = await this.loadUserData(userId);
      return data.flights;
    }
    
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .or(`origin.ilike.%${query}%,destination.ilike.%${query}%,airline.ilike.%${query}%,flight_number.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      Logger.error('Search failed', error);
      throw error;
    }
    
    return (data || []).map(row => this.fromSupabase(row));
  }
  
  // Статистика
  static async getStats(userId: string) {
    this.validateUUID(userId);
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const flights = (data || []).map(row => this.fromSupabase(row));
    
    return {
      totalFlights: flights.length,
      totalDistance: flights.reduce((sum, f) => sum + (f.distance || 0), 0),
      uniqueAirlines: new Set(flights.map(f => f.airline).filter(Boolean)).size,
      uniqueDestinations: new Set(flights.map(f => f.destination).filter(Boolean)).size,
    };
  }
}