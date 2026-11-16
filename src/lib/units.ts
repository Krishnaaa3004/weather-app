export type UnitSystem = 'metric' | 'imperial';

const MINUS = '−';

/** The API speaks metric; these convert at the edge of the UI. */
export function toDisplayTemp(celsius: number, units: UnitSystem): number {
  return Math.round(units === 'metric' ? celsius : (celsius * 9) / 5 + 32);
}

/** Rounded temperature with a typographic minus, without the degree sign. */
export function formatTemp(celsius: number, units: UnitSystem): string {
  const value = toDisplayTemp(celsius, units);
  // Math.round can produce -0, which would print as "−0".
  return value < 0 ? `${MINUS}${Math.abs(value)}` : String(Math.abs(value));
}

export function formatSpeed(metresPerSecond: number, units: UnitSystem): { value: string; unit: string } {
  return units === 'metric'
    ? { value: String(Math.round(metresPerSecond * 3.6)), unit: 'km/h' }
    : { value: String(Math.round(metresPerSecond * 2.23694)), unit: 'mph' };
}

export function formatDistance(metres: number, units: UnitSystem): { value: string; unit: string } {
  const amount = units === 'metric' ? metres / 1000 : metres / 1609.344;
  return { value: amount >= 10 ? String(Math.round(amount)) : amount.toFixed(1), unit: units === 'metric' ? 'km' : 'mi' };
}

export function formatPressure(hectopascals: number, units: UnitSystem): { value: string; unit: string } {
  return units === 'metric'
    ? { value: String(Math.round(hectopascals)), unit: 'hPa' }
    : { value: (hectopascals * 0.02953).toFixed(2), unit: 'inHg' };
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Eight-point compass direction for a bearing in degrees. */
export function compassPoint(degrees: number): (typeof COMPASS)[number] {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]!;
}
