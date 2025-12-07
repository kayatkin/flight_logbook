// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { Logger } from './utils/helpers';

// Проверяем окружение — ЕДИНСТВЕННОЕ место валидации
const validateEnvironment = (): void => {
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
  
  // Базовая проверка URL
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL должен начинаться с https://');
  }
};

// Упрощённая страница ошибки
const renderError = (error: unknown) => {
  const root = document.getElementById('root');
  if (!root) return;
  
  let errorMessage = 'Ошибка конфигурации';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f8f9fa;">
      <div style="max-width: 600px; background: white; border-radius: 12px; padding: 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px; color: #dc3545;">❌</div>
        <h1 style="color: #212529; margin-bottom: 16px;">Ошибка конфигурации</h1>
        <div style="background: #fff5f5; border: 1px solid #ffc9c9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #c92a2a; margin: 0;">${errorMessage}</p>
        </div>
        <div style="background: #e7f5ff; border: 1px solid #a5d8ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #1971c2; margin: 0 0 12px 0;">🛠 Как исправить:</h3>
          <p>Создайте <code>.env.development</code> в корне проекта:</p>
          <pre style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-top: 12px;">
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_ключ</pre>
        </div>
        <button onclick="location.reload()" style="background: #339af0; color: white; border: none; padding: 10px 20px; border-radius: 6px;">
          ⟳ Перезагрузить
        </button>
      </div>
    </div>
  `;
};

const initializeApp = () => {
  try {
    validateEnvironment();
    Logger.info('Окружение проверено успешно');
    
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('Отсутствует #root');
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
  } catch (error) {
    Logger.error('Ошибка инициализации:', error);
    renderError(error);
  }
};

// Глобальные обработчики ошибок
window.addEventListener('error', (e) => Logger.error('Глобальная ошибка', e.error));
window.addEventListener('unhandledrejection', (e) => Logger.error('Unhandled promise', e.reason));

// Запуск
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}