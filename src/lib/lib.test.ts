import { describe, expect, it } from 'vitest';
import type { HourlyPoint } from '../types/weather';
import { monotonePath } from './curve';
import { summariseHours } from './summary';
import { formatClock, formatDuration } from './time';
import { compassPoint, formatTemp } from './units';

const hour = (time: number, temp: number, pop = 0): HourlyPoint => ({
  time,
  temp,
  pop,
  isDay: true,
  condition: { id: 500, main: 'Rain', description: 'light rain' },
});

describe('monotonePath', () => {
  it('never overshoots the data', () => {
    const path = monotonePath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 10 }]);
    const ys = [...path.matchAll(/,(-?[\d.]+)/g)].map((match) => Number(match[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(10);
  });

  it('handles empty and single-point input', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 1, y: 2 }])).toBe('M1,2');
  });
});

describe('summariseHours', () => {
  it('describes a fall then a rise', () => {
    const hours = [hour(0, 20), hour(3 * 3600, 14), hour(6 * 3600, 24)];
    expect(summariseHours(hours, 0, 'metric')).toBe('Cooling to 14° by 03:00, then warming to 24°.');
  });

  it('mentions likely rain and flat temperatures', () => {
    const hours = [hour(0, 20), hour(3 * 3600, 20.4, 0.6)];
    expect(summariseHours(hours, 0, 'metric')).toBe('Holding steady around 20°. Rain most likely around 03:00.');
  });
});

describe('formatting', () => {
  it('uses a real minus sign and never prints negative zero', () => {
    expect(formatTemp(-4.6, 'metric')).toBe('−5');
    expect(formatTemp(-0.2, 'metric')).toBe('0');
    expect(formatTemp(0, 'imperial')).toBe('32');
  });

  it('shows time at the city, not the viewer', () => {
    expect(formatClock(0, 19800)).toBe('05:30');
  });

  it('formats durations and compass points', () => {
    expect(formatDuration(38580)).toBe('10h 43m');
    expect(compassPoint(270)).toBe('W');
    expect(compassPoint(350)).toBe('N');
  });
});
