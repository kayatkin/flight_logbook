import React from 'react';
import styles from './TabButton.module.css';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ 
  active, 
  onClick, 
  children 
}) => {
  return (
    <button
      onClick={onClick}
      className={`${styles.button} ${active ? styles.active : ''}`}
    >
      {children}
    </button>
  );
};
