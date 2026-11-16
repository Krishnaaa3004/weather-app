import type { ApiErrorBody, ProxyReport, UvIndex } from '../types/weather';

/** The name a place was found under, kept so reopening it shows the same name. */
export interface KnownPlace {
  name: string;
  country: string;
  state?: string;
}

/**
 * Where to get weather for: a typed city name, or coordinates. Coordinates
 * of a place the user searched before carry its name, because reverse
 * geocoding the same point returns the district ("Chiyoda"), not the city ("Tokyo").
 */
export type WeatherTarget =
  | { kind: 'city'; query: string }
  | { kind: 'coords'; lat: number; lon: number; place?: KnownPlace };

export type WeatherErrorKind = 'not_found' | 'network' | 'rate_limited' | 'server';

/** A failed request, classified so the UI can say something specific. */
export class WeatherError extends Error {
  constructor(
    readonly kind: WeatherErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'WeatherError';
  }
}

function proxyUrl(target: WeatherTarget): string {
  const params =
    target.kind === 'city'
      ? new URLSearchParams({ q: target.query })
      : new URLSearchParams({ lat: target.lat.toFixed(4), lon: target.lon.toFixed(4) });
  return `/api/weather?${params}`;
}

/** Loads the report from our own proxy, which holds the API key. */
export async function fetchReport(target: WeatherTarget, signal?: AbortSignal): Promise<ProxyReport> {
  let response: Response;
  try {
    response = await fetch(proxyUrl(target), { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new WeatherError('network', 'Could not reach the weather service.');
  }

  if (response.ok) return (await response.json()) as ProxyReport;

  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const message = body?.message ?? 'The weather service returned an error.';
  if (response.status === 404) throw new WeatherError('not_found', message);
  if (response.status === 429) throw new WeatherError('rate_limited', message);
  throw new WeatherError('server', message);
}

interface OpenMeteoUv {
  current?: { uv_index?: number };
  daily?: { uv_index_max?: number[] };
}

/**
 * UV index from Open-Meteo, which needs no key. It is a nice-to-have, so any
 * failure resolves to null and the UI marks the value as unavailable.
 */
export async function fetchUv(lat: number, lon: number, signal?: AbortSignal): Promise<UvIndex | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'uv_index',
    daily: 'uv_index_max',
    timezone: 'auto',
    forecast_days: '1',
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
    if (!response.ok) return null;
    const data = (await response.json()) as OpenMeteoUv;
    const now = data.current?.uv_index;
    if (typeof now !== 'number') return null;
    return { now, max: data.daily?.uv_index_max?.[0] ?? now };
  } catch {
    return null;
  }
}
