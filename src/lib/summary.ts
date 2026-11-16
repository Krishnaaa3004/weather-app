import type { HourlyPoint } from '../types/weather';
import { formatClock } from './time';
import { type UnitSystem, formatTemp, toDisplayTemp } from './units';

/**
 * One sentence that says what the next 24 hours will do, so the hourly
 * section has a headline worth reading instead of a generic title.
 */
export function summariseHours(hours: readonly HourlyPoint[], offset: number, units: UnitSystem): string {
  const now = hours[0];
  if (!now || hours.length < 2) return 'No forecast for the coming hours.';

  let coolest = now;
  let warmest = now;
  for (const hour of hours) {
    if (hour.temp < coolest.temp) coolest = hour;
    if (hour.temp > warmest.temp) warmest = hour;
  }

  const degrees = (point: HourlyPoint) => `${formatTemp(point.temp, units)}°`;
  const at = (point: HourlyPoint) => formatClock(point.time, offset);
  const spread = toDisplayTemp(warmest.temp, units) - toDisplayTemp(coolest.temp, units);

  let sentence: string;
  if (spread < 2) {
    sentence = `Holding steady around ${degrees(now)}.`;
  } else if (coolest === now) {
    sentence = `Warming to ${degrees(warmest)} by ${at(warmest)}.`;
  } else if (warmest === now) {
    sentence = `Cooling to ${degrees(coolest)} by ${at(coolest)}.`;
  } else if (coolest.time < warmest.time) {
    sentence = `Cooling to ${degrees(coolest)} by ${at(coolest)}, then warming to ${degrees(warmest)}.`;
  } else {
    sentence = `Warming to ${degrees(warmest)} by ${at(warmest)}, then cooling to ${degrees(coolest)}.`;
  }

  const wettest = hours.reduce((a, b) => (b.pop > a.pop ? b : a));
  if (wettest.pop >= 0.3) {
    const kind = wettest.condition.id >= 600 && wettest.condition.id < 700 ? 'Snow' : 'Rain';
    sentence += ` ${kind} most likely around ${at(wettest)}.`;
  }
  return sentence;
}
