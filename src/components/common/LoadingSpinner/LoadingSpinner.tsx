import React from 'react';
import './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  text?: string; // Добавьте этот пропс
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Загрузка данных...' }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">{text}</p>
    </div>
  );
};