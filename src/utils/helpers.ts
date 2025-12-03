// src/utils/helpers.ts
export class Logger {
  static info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data || '');
  }
  
  static debug(message: string, data?: any): void {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
  
  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error || '');
  }
  
  static warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data || '');
  }
}

export class UserHelper {
  static generateUserId(prefix: string = 'dev_'): string {
    // Для совместимости с UUID в Supabase
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback для старых браузеров
    return prefix + Math.random().toString(36).substring(2, 11);
  }
  
  static getDevelopmentUserId(): string {
    const key = 'flight_tracker_dev_user_id';
    let userId = localStorage.getItem(key);
    
    if (!userId) {
      userId = this.generateUserId('dev_');
      localStorage.setItem(key, userId);
    }
    
    return userId;
  }
}