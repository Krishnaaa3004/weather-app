/**
 * The contract between the Netlify Function and the client. The function
 * normalises three OpenWeatherMap endpoints plus Open-Meteo into this one
 * shape, so the UI never sees a raw provider response.
 *
 * All values are metric (°C, m/s, hPa, metres); the client converts for display.
 * All timestamps are unix seconds, UTC.
 */

export interface WeatherCondition {
  /** OpenWeatherMap condition id, e.g. 711 for smoke. */
  id: number;
  /** Group name, e.g. "Smoke". */
  main: string;
  /** Human description, e.g. "light rain". */
  description: string;
}

export interface WeatherLocation {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  /** Offset from UTC in seconds, used to show the city's own local time. */
  timezoneOffset: number;
}

export interface CurrentWeather {
  time: number;
  temp: number;
  feelsLike: number;
  /** High and low across the next 24 hours, including now. */
  high: number;
  low: number;
  humidity: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windDeg: number;
  windGust?: number;
  /** Cloud cover, 0–100. */
  cloudCover: number;
  condition: WeatherCondition;
  sunrise: number;
  sunset: number;
}

export interface HourlyPoint {
  time: number;
  temp: number;
  /** Probability of precipitation, 0–1. */
  pop: number;
  condition: WeatherCondition;
  isDay: boolean;
}

export interface DailyForecast {
  /** Local calendar date at the location, YYYY-MM-DD. */
  date: string;
  high: number;
  low: number;
  pop: number;
  condition: WeatherCondition;
}

export interface AirQuality {
  /** OpenWeatherMap index: 1 good, 2 fair, 3 moderate, 4 poor, 5 very poor. */
  index: 1 | 2 | 3 | 4 | 5;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

export interface UvIndex {
  now: number;
  max: number;
}

export interface WeatherReport {
  location: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyForecast[];
  /** Null when the secondary request failed; the UI shows the row as unavailable. */
  air: AirQuality | null;
  uv: UvIndex | null;
  fetchedAt: number;
}

export type ApiErrorCode = 'bad_request' | 'not_found' | 'rate_limited' | 'upstream' | 'config';

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
}
