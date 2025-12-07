// src/utils/helpers.ts

export class Logger {
  static info(message: string, data?: any): void {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, data || '');
    }
    // В продакшене логгируем только сообщение
    if (!import.meta.env.DEV) {
      console.log(`[INFO] ${message}`);
    }
  }
  
  static debug(message: string, data?: any): void {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
  
  static error(message: string, error?: any): void {
    // Ошибки логгируем всегда, но без чувствительных данных
    if (import.meta.env.DEV && error) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
  
  static warn(message: string, data?: any): void {
    if (import.meta.env.DEV) {
      console.warn(`[WARN] ${message}`, data || '');
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }
}

export class UserHelper {
  // ВСЕГДА генерируем UUID v4
  static generateUserId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback для очень старых браузеров (теоретически)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  static getDevelopmentUserId(): string {
    const key = 'flight_tracker_dev_user_id';
    let userId = localStorage.getItem(key);
    
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem(key, userId);
    }
    
    return userId;
  }
}