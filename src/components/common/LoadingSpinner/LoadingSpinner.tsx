import React from 'react';
import './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Загрузка данных...' 
}) => {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p className="loading-text">{text}</p>
    </div>
  );
};