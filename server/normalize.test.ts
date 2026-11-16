import { describe, expect, it } from 'vitest';
import { buildDaily, buildHourly, localDateKey } from './normalize';
import type { OwmCurrent, OwmForecast, OwmForecastEntry } from './providers';

const HOUR = 3600;
const T0 = Date.UTC(2026, 10, 16, 12) / 1000;

const entry = (hoursAhead: number, temp: number, id = 800): OwmForecastEntry => ({
  dt: T0 + hoursAhead * HOUR,
  main: { temp, temp_min: temp - 1, temp_max: temp + 1 },
  weather: [{ id, main: '', description: '', icon: '' }],
  pop: 0,
  sys: { pod: 'd' },
});

const current: OwmCurrent = {
  weather: [{ id: 711, main: 'Smoke', description: 'smoke', icon: '50d' }],
  main: { temp: 30, feels_like: 31, pressure: 1012, humidity: 50 },
  wind: { speed: 2 },
  clouds: { all: 0 },
  dt: T0,
  sys: { sunrise: T0 - 6 * HOUR, sunset: T0 + 6 * HOUR },
  timezone: 0,
  name: 'Test',
};

describe('normalize', () => {
  it('groups by the calendar date at the location', () => {
    // 23:00 UTC is already tomorrow in a UTC+5:30 city.
    expect(localDateKey(Date.UTC(2026, 10, 16, 23) / 1000, 19800)).toBe('2026-11-17');
  });

  it('folds the live reading into today and lets severe weather name the day', () => {
    const forecast: OwmForecast = { list: [entry(3, 24), entry(6, 20), entry(24, 18), entry(27, 19, 211)] };
    const [today, tomorrow] = buildDaily(forecast, current);
    expect(today?.high).toBe(30);
    expect(today?.condition.id).toBe(711);
    expect(tomorrow?.condition.id).toBe(211);
  });

  it('starts the hourly series at now and stops after 24 hours', () => {
    const forecast: OwmForecast = { list: [entry(3, 24), entry(24, 18), entry(27, 19)] };
    const hours = buildHourly(forecast, current);
    expect(hours.map((point) => point.temp)).toEqual([30, 24, 18]);
  });
});
