import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { Logger } from './utils/helpers'

// Проверяем окружение перед запуском приложения
const validateEnvironment = (): void => {
  // Используем process.env для Vite переменных окружения
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const missingVars: string[] = [];
  
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    throw new Error(
      `Отсутствуют обязательные переменные окружения: ${missingVars.join(', ')}`
    );
  }
  
  // Дополнительная проверка формата
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL должен начинаться с https://');
  }
  
  if (supabaseKey && supabaseKey.length < 20) {
    throw new Error('VITE_SUPABASE_ANON_KEY имеет неверный формат');
  }
};

// Функция для отображения ошибки
const renderError = (error: unknown) => {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Не найден элемент с id="root"');
    return;
  }
  
  let errorMessage = 'Неизвестная ошибка конфигурации';
  let errorDetails = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Создаем красивую страницу ошибки
  root.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background-color: #f8f9fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    ">
      <div style="
        max-width: 600px;
        width: 100%;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        padding: 30px;
        text-align: center;
      ">
        <div style="
          font-size: 48px;
          margin-bottom: 20px;
          color: #dc3545;
        ">
          ❌
        </div>
        
        <h1 style="
          color: #212529;
          margin-bottom: 16px;
          font-size: 24px;
          font-weight: 600;
        ">
          Ошибка конфигурации
        </h1>
        
        <div style="
          background-color: #fff5f5;
          border: 1px solid #ffc9c9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        ">
          <p style="
            color: #c92a2a;
            margin: 0 0 10px 0;
            font-weight: 500;
          ">
            ${errorMessage}
          </p>
          
          ${errorDetails ? `
            <details style="margin-top: 10px;">
              <summary style="
                color: #868e96;
                font-size: 14px;
                cursor: pointer;
              ">
                Подробности ошибки
              </summary>
              <pre style="
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                color: #495057;
                margin-top: 8px;
                overflow-x: auto;
                white-space: pre-wrap;
              ">
                ${errorDetails}
              </pre>
            </details>
          ` : ''}
        </div>
        
        <div style="
          background-color: #e7f5ff;
          border: 1px solid #a5d8ff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: left;
        ">
          <h3 style="
            color: #1971c2;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
          ">
            🛠 Как исправить:
          </h3>
          
          <ol style="
            color: #495057;
            margin: 0;
            padding-left: 20px;
            font-size: 14px;
            line-height: 1.6;
          ">
            <li style="margin-bottom: 8px;">Создайте файл <code style="background: #f1f3f5; padding: 2px 6px; border-radius: 4px;">.env.development</code> в корне проекта</li>
            <li style="margin-bottom: 8px;">Добавьте туда переменные:</li>
          </ol>
          
          <pre style="
            background-color: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            color: #495057;
            margin-top: 12px;
            overflow-x: auto;
            border: 1px solid #e9ecef;
          ">
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_ключ
VITE_APP_ENV=development
VITE_PORT=3800</pre>
          
          <p style="
            color: #868e96;
            font-size: 13px;
            margin-top: 12px;
            margin-bottom: 0;
          ">
            Получите ключи в <a href="https://app.supabase.com" target="_blank" style="color: #339af0; text-decoration: none;">Supabase Dashboard</a> → Project Settings → API
          </p>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        ">
          <button onclick="location.reload()" style="
            background-color: #339af0;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#228be6'" 
            onmouseout="this.style.backgroundColor='#339af0'">
            ⟳ Обновить страницу
          </button>
          
          <button onclick="console.clear(); location.reload()" style="
            background-color: #e9ecef;
            color: #495057;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#dee2e6'" 
            onmouseout="this.style.backgroundColor='#e9ecef'">
            🧹 Очистить и обновить
          </button>
        </div>
        
        <div style="
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
          color: #868e96;
          font-size: 13px;
        ">
          <p style="margin: 0;">
            Flight Logbook ✈️ | Версия: 1.0.0
          </p>
        </div>
      </div>
    </div>
  `;
};

// Инициализация приложения
const initializeApp = () => {
  try {
    // Проверяем окружение
    validateEnvironment();
    Logger.info('Проверка окружения прошла успешно');
    
    // Инициализируем Telegram WebApp если доступен
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      Logger.info('Telegram WebApp инициализирован');
    }
    
    // Рендерим приложение
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Не найден элемент с id="root"');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Отслеживаем ошибки React
    rootElement.addEventListener('error', (event) => {
      Logger.error('React ошибка:', event);
    });
    
  } catch (error) {
    Logger.error('Ошибка инициализации приложения:', error);
    renderError(error);
    
    // Также логируем в консоль для отладки
    console.error('🚨 Ошибка запуска приложения:');
    console.error(error);
    console.info('🔧 Для исправления создайте файл .env.development с переменными:');
    console.info('VITE_SUPABASE_URL=https://ваш-проект.supabase.co');
    console.info('VITE_SUPABASE_ANON_KEY=ваш_ключ');
  }
};

// Отслеживаем глобальные ошибки
window.addEventListener('error', (event) => {
  Logger.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Необработанное Promise отклонение:', event.reason);
});

// Запускаем приложение когда DOM готов
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}