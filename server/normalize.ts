import type {
  AirQuality,
  DailyForecast,
  HourlyPoint,
  WeatherCondition,
  ProxyReport,
} from '../src/types/weather';
import type {
  OwmAirPollution,
  OwmCondition,
  OwmCurrent,
  OwmForecast,
  OwmForecastEntry,
  OwmGeoResult,
} from './providers';

const HOURS_AHEAD = 24;
const FORECAST_DAYS = 5;
const FALLBACK_CONDITION: WeatherCondition = { id: 800, main: 'Clear', description: 'clear sky' };

function toCondition(raw: OwmCondition | undefined): WeatherCondition {
  return raw ? { id: raw.id, main: raw.main, description: raw.description } : FALLBACK_CONDITION;
}

/** Calendar date at the location (not the server, not the viewer) for a UTC timestamp. */
export function localDateKey(unixSeconds: number, timezoneOffset: number): string {
  return new Date((unixSeconds + timezoneOffset) * 1000).toISOString().slice(0, 10);
}

function localHour(unixSeconds: number, timezoneOffset: number): number {
  return new Date((unixSeconds + timezoneOffset) * 1000).getUTCHours();
}

/**
 * How much a condition should dominate a day's summary. One thunderstorm at
 * 15:00 describes the day better than five "few clouds" readings around it.
 */
function severity(id: number): number {
  if (id >= 200 && id < 300) return 5;
  if (id >= 600 && id < 700) return 4;
  if (id >= 500 && id < 600) return 3;
  if (id >= 300 && id < 400) return 2;
  if (id >= 700 && id < 800) return 2;
  return id > 802 ? 1 : 0;
}

/**
 * Picks the condition that represents a whole day: the most severe one, and
 * between equals the reading closest to early afternoon.
 */
function representative(
  entries: Array<Pick<OwmForecastEntry, 'dt' | 'weather'>>,
  timezoneOffset: number,
): WeatherCondition {
  let best: Pick<OwmForecastEntry, 'dt' | 'weather'> | undefined;
  let bestScore = -Infinity;
  for (const entry of entries) {
    const id = entry.weather[0]?.id ?? 800;
    const distanceFromAfternoon = Math.abs(localHour(entry.dt, timezoneOffset) - 14);
    const score = severity(id) * 100 - distanceFromAfternoon;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return toCondition(best?.weather[0]);
}

export function buildDaily(forecast: OwmForecast, current: OwmCurrent): DailyForecast[] {
  const offset = current.timezone;
  const byDate = new Map<string, OwmForecastEntry[]>();
  for (const entry of forecast.list) {
    const key = localDateKey(entry.dt, offset);
    const bucket = byDate.get(key);
    if (bucket) bucket.push(entry);
    else byDate.set(key, [entry]);
  }

  const today = localDateKey(current.dt, offset);
  const days: DailyForecast[] = [];

  for (const [date, entries] of byDate) {
    const temps = entries.flatMap((entry) => [entry.main.temp_min, entry.main.temp_max]);
    // The forecast only covers what is left of today, so fold in the live reading.
    const isToday = date === today;
    if (isToday) temps.push(current.main.temp);
    days.push({
      date,
      high: Math.max(...temps),
      low: Math.min(...temps),
      pop: Math.max(...entries.map((entry) => entry.pop ?? 0)),
      condition: representative(isToday ? [current, ...entries] : entries, offset),
    });
  }

  return days.sort((a, b) => a.date.localeCompare(b.date)).slice(0, FORECAST_DAYS);
}

export function buildHourly(forecast: OwmForecast, current: OwmCurrent): HourlyPoint[] {
  const horizon = current.dt + HOURS_AHEAD * 3600;
  const now: HourlyPoint = {
    time: current.dt,
    temp: current.main.temp,
    pop: 0,
    condition: toCondition(current.weather[0]),
    isDay: current.dt >= current.sys.sunrise && current.dt < current.sys.sunset,
  };
  const upcoming = forecast.list
    .filter((entry) => entry.dt > current.dt && entry.dt <= horizon)
    .map<HourlyPoint>((entry) => ({
      time: entry.dt,
      temp: entry.main.temp,
      pop: entry.pop ?? 0,
      condition: toCondition(entry.weather[0]),
      isDay: entry.sys.pod === 'd',
    }));
  return [now, ...upcoming];
}

function buildAir(raw: OwmAirPollution | null): AirQuality | null {
  const reading = raw?.list[0];
  if (!reading) return null;
  const index = Math.min(5, Math.max(1, Math.round(reading.main.aqi))) as AirQuality['index'];
  const { pm2_5, pm10, o3, no2 } = reading.components;
  return { index, pm25: pm2_5, pm10, o3, no2 };
}

export interface ProviderData {
  place: OwmGeoResult | null;
  current: OwmCurrent;
  forecast: OwmForecast;
  air: OwmAirPollution | null;
}

export function buildReport({ place, current, forecast, air }: ProviderData, now = Date.now()): ProxyReport {
  const hourly = buildHourly(forecast, current);
  const temps = hourly.map((point) => point.temp);

  return {
    location: {
      // The geocoder returns the name people search for ("New Delhi"); the
      // weather endpoint returns its nearest station ("Parliament House").
      name: place?.name ?? current.name,
      country: place?.country ?? current.sys.country ?? '',
      state: place?.state,
      lat: place?.lat ?? 0,
      lon: place?.lon ?? 0,
      timezoneOffset: current.timezone,
    },
    current: {
      time: current.dt,
      temp: current.main.temp,
      feelsLike: current.main.feels_like,
      high: Math.max(...temps),
      low: Math.min(...temps),
      humidity: current.main.humidity,
      pressure: current.main.pressure,
      visibility: current.visibility ?? 10000,
      windSpeed: current.wind.speed,
      windDeg: current.wind.deg ?? 0,
      windGust: current.wind.gust,
      cloudCover: current.clouds.all,
      condition: toCondition(current.weather[0]),
      sunrise: current.sys.sunrise,
      sunset: current.sys.sunset,
    },
    hourly,
    daily: buildDaily(forecast, current),
    air: buildAir(air),
    fetchedAt: Math.floor(now / 1000),
  };
}
