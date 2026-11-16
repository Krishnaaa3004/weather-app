import type { WeatherCondition } from '../types/weather';

export type IconName =
  | 'clear-day' | 'clear-night' | 'partly-cloudy-day' | 'partly-cloudy-night' | 'cloudy' | 'overcast'
  | 'drizzle' | 'rain' | 'thunderstorms' | 'thunderstorms-rain' | 'snow' | 'sleet'
  | 'mist' | 'fog' | 'haze' | 'smoke' | 'dust' | 'tornado' | 'wind';

const ATMOSPHERE: Record<number, IconName> = {
  701: 'mist',
  711: 'smoke',
  721: 'haze',
  731: 'dust',
  741: 'fog',
  751: 'dust',
  761: 'dust',
  762: 'dust',
  771: 'wind',
  781: 'tornado',
};

/** Picks the Meteocon for an OpenWeatherMap condition id. */
export function iconFor(id: number, isDay: boolean): IconName {
  if (id >= 200 && id < 300) return id >= 210 && id <= 221 ? 'thunderstorms' : 'thunderstorms-rain';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id === 511 || (id >= 611 && id <= 616)) return 'sleet';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return ATMOSPHERE[id] ?? 'haze';
  if (id === 800) return isDay ? 'clear-day' : 'clear-night';
  if (id === 801 || id === 802) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
  return id === 803 ? 'cloudy' : 'overcast';
}

/** "light rain" → "Light rain" */
export function describe(condition: WeatherCondition): string {
  const text = condition.description || condition.main;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** True for conditions that bring precipitation, used to word forecasts. */
export function isWet(id: number): boolean {
  return id >= 200 && id < 700;
}
