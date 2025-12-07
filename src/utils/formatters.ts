// src/utils/formatters.ts

/**
 * Форматирует дату из ISO (YYYY-MM-DD) в русский формат (DD.MM.YYYY)
 * @example formatDateToDMY('2025-12-05') → '05.12.2025'
 */
export const formatDateToDMY = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}.${month}.${year}`;
  };
  
  /**
   * Форматирует длительность полёта (например, "2h 30m") в локализованный вид
   * @example formatFlightTime('2h 30m') → '2ч 30мин'
   */
  export const formatFlightTime = (duration?: string): string => {
    if (!duration) return '';
    return duration
      .replace(/h/g, 'ч')
      .replace(/m/g, 'мин')
      .replace(/\s+/g, ' ') // убирает лишние пробелы
      .trim();
  };
  
  /**
   * Форматирует класс обслуживания для отображения
   * @example formatClassLabel('business') → 'Бизнес'
   */
  export const formatClassLabel = (flightClass: string): string => {
    const labels: Record<string, string> = {
      economy: 'Эконом',
      premium_economy: 'Премиум эконом',
      business: 'Бизнес',
      first: 'Первый',
    };
    return labels[flightClass] || flightClass;
  };
  
  /**
   * Форматирует дистанцию с разделителями тысяч
   * @example formatDistance(12500) → '12 500'
   */
  export const formatDistance = (distance: number): string => {
    return distance.toLocaleString('ru-RU');
  };