import { ThemeParams } from '../types';
import { APP_CONSTANTS } from './constants';

export class ThemeService {
  static applyTelegramTheme(themeParams: ThemeParams): void {
    try {
      // Основные переменные Telegram
      this.setCssVariable('--tg-theme-bg-color', themeParams.bg_color);
      this.setCssVariable('--tg-theme-text-color', themeParams.text_color);
      this.setCssVariable('--tg-theme-hint-color', themeParams.hint_color);
      this.setCssVariable('--tg-theme-link-color', themeParams.link_color);
      this.setCssVariable('--tg-theme-button-color', themeParams.button_color);
      this.setCssVariable('--tg-theme-button-text-color', themeParams.button_text_color);
      
      // Производные переменные
      this.setCssVariable('--tg-bg-color', `var(--tg-theme-bg-color)`);
      this.setCssVariable('--tg-text-color', `var(--tg-theme-text-color)`);
      this.setCssVariable('--tg-hint-color', `var(--tg-theme-hint-color)`);
      this.setCssVariable('--tg-link-color', `var(--tg-theme-button-color)`);
      this.setCssVariable('--tg-border-color', `var(--tg-theme-hint-color)`);
      this.setCssVariable('--tg-card-bg', `var(--tg-theme-bg-color)`);
      this.setCssVariable('--tg-active-bg', 
        `rgba(${this.hexToRgb(themeParams.button_color)}, 0.1)`);
      
      document.documentElement.setAttribute('data-tg-theme', 'loaded');
      console.debug('[ThemeService] Telegram theme applied');
    } catch (error) {
      console.error('[ThemeService] Failed to apply Telegram theme:', error);
      throw error;
    }
  }
  
  static applyDefaultTheme(): void {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = isDarkMode 
      ? APP_CONSTANTS.DEFAULT_THEME.DARK 
      : APP_CONSTANTS.DEFAULT_THEME.LIGHT;
    
    this.setCssVariable('--tg-bg-color', theme.bgColor);
    this.setCssVariable('--tg-text-color', theme.textColor);
    this.setCssVariable('--tg-hint-color', theme.hintColor);
    this.setCssVariable('--tg-link-color', theme.linkColor);
    this.setCssVariable('--tg-border-color', theme.borderColor);
    this.setCssVariable('--tg-card-bg', theme.cardBg);
    this.setCssVariable('--tg-active-bg', theme.activeBg);
    
    document.documentElement.removeAttribute('data-tg-theme');
    console.debug('[ThemeService] Default theme applied');
  }
  
  static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 136, 204';
  }
  
  private static setCssVariable(name: string, value: string): void {
    document.documentElement.style.setProperty(name, value);
  }
}
