// src/hooks/useUser.ts
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserData } from '../types';
import { TelegramService } from '../utils/telegram';
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
        
        if (telegramUser && telegramUser.id) {
          const storageKey = `flightlog_user_id_${telegramUser.id}`;
          let persistentId = localStorage.getItem(storageKey);
          
          if (!persistentId) {
            persistentId = uuidv4();
            localStorage.setItem(storageKey, persistentId);
            Logger.debug('Generated new persistent user ID', { telegramId: telegramUser.id, userId: persistentId });
          }
          
          userData = {
            id: persistentId,
            name: telegramUser.name,
            isTelegram: true,
            telegramId: telegramUser.id.toString()
          };
        } else {
          // Fallback для анонимного Telegram-пользователя
          const anonId = 'anon_' + uuidv4();
          userData = {
            id: anonId,
            name: 'Аноним',
            isTelegram: true
          };
        }
      } else {
        // Режим разработки
        const devId = 'dev_' + uuidv4();
        userData = {
          id: devId,
          name: 'Разработчик',
          isTelegram: false
        };
      }
      
      setUser(userData);
      Logger.info('User initialized', { userId: userData.id, isTelegram: userData.isTelegram });
    } catch (error) {
      Logger.error('Failed to initialize user', error);
      const fallbackId = 'fallback_' + uuidv4();
      setUser({
        id: fallbackId,
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