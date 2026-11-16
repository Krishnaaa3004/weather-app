/**
 * Raw provider responses and the fetchers that return them. Only the fields
 * this app reads are typed; everything else in the payloads is ignored.
 */

const OWM = 'https://api.openweathermap.org';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000;

export interface OwmCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OwmGeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface OwmCurrent {
  weather: OwmCondition[];
  main: { temp: number; feels_like: number; pressure: number; humidity: number };
  visibility?: number;
  wind: { speed: number; deg?: number; gust?: number };
  clouds: { all: number };
  dt: number;
  sys: { country?: string; sunrise: number; sunset: number };
  timezone: number;
  name: string;
}

export interface OwmForecastEntry {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: OwmCondition[];
  pop?: number;
  sys: { pod: 'd' | 'n' };
}

export interface OwmForecast {
  list: OwmForecastEntry[];
}

export interface OwmAirPollution {
  list: Array<{
    main: { aqi: number };
    components: { pm2_5: number; pm10: number; o3: number; no2: number };
  }>;
}

export interface OpenMeteoUv {
  current?: { uv_index?: number };
  daily?: { uv_index_max?: number[] };
}

/** An upstream failure that carries the HTTP status the provider returned. */
export class ProviderError extends Error {
  constructor(
    readonly status: number,
    provider: string,
  ) {
    super(`${provider} responded with ${status}`);
  }
}

async function getJson<T>(url: URL, provider: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new ProviderError(response.status, provider);
  return (await response.json()) as T;
}

function owmUrl(path: string, key: string, params: Record<string, string | number>): URL {
  const url = new URL(path, OWM);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  url.searchParams.set('appid', key);
  return url;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export function geocodeCity(key: string, query: string) {
  return getJson<OwmGeoResult[]>(owmUrl('/geo/1.0/direct', key, { q: query, limit: 1 }), 'OpenWeatherMap');
}

export function reverseGeocode(key: string, { lat, lon }: Coordinates) {
  return getJson<OwmGeoResult[]>(owmUrl('/geo/1.0/reverse', key, { lat, lon, limit: 1 }), 'OpenWeatherMap');
}

export function fetchCurrent(key: string, { lat, lon }: Coordinates) {
  return getJson<OwmCurrent>(owmUrl('/data/2.5/weather', key, { lat, lon, units: 'metric' }), 'OpenWeatherMap');
}

export function fetchForecast(key: string, { lat, lon }: Coordinates) {
  return getJson<OwmForecast>(owmUrl('/data/2.5/forecast', key, { lat, lon, units: 'metric' }), 'OpenWeatherMap');
}

export function fetchAirPollution(key: string, { lat, lon }: Coordinates) {
  return getJson<OwmAirPollution>(owmUrl('/data/2.5/air_pollution', key, { lat, lon }), 'OpenWeatherMap');
}

/** The free OpenWeatherMap tier has no UV index, so that one value comes from Open-Meteo. */
export function fetchUv({ lat, lon }: Coordinates) {
  const url = new URL(OPEN_METEO);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'uv_index');
  url.searchParams.set('daily', 'uv_index_max');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');
  return getJson<OpenMeteoUv>(url, 'Open-Meteo');
}
