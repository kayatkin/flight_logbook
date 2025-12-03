// src/hooks/useUser.ts
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserData } from '../types';
import { TelegramService } from '../utils/telegram';
import { UserHelper } from '../utils/helpers';
import { Logger } from '../utils/helpers';

export const useUser = (isTelegram: boolean) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initializeUser = useCallback(async () => {
    try {
      setLoading(true);
      let userData: UserData;
      
      if (isTelegram) {
        const telegramUser = TelegramService.getUser();
        
        if (telegramUser) {
          // Генерируем UUID из Telegram ID
          const uuid = uuidv4();
          userData = {
            id: uuid, // Теперь UUID вместо tg_123
            name: telegramUser.name,
            isTelegram: true
          };
          Logger.debug('Telegram user initialized with UUID', userData);
        } else {
          const anonUuid = uuidv4();
          userData = {
            id: anonUuid,
            name: 'Аноним',
            isTelegram: true
          };
          Logger.debug('Anonymous Telegram user initialized with UUID', userData);
        }
      } else {
        const devUuid = UserHelper.getDevelopmentUserId();
        userData = {
          id: devUuid,
          name: 'Разработчик',
          isTelegram: false
        };
        Logger.debug('Development user initialized', userData);
      }
      
      setUser(userData);
    } catch (error) {
      Logger.error('Failed to initialize user', error);
      setUser({
        id: uuidv4(), // Всегда UUID даже при ошибке
        name: 'Гость',
        isTelegram: false
      });
    } finally {
      setLoading(false);
    }
  }, [isTelegram]);
  
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);
  
  return { user, loading };
};