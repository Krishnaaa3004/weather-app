import { buildReport } from '../../server/normalize';
import {
  type Coordinates,
  type OwmGeoResult,
  ProviderError,
  fetchAirPollution,
  fetchCurrent,
  fetchForecast,
  geocodeCity,
  reverseGeocode,
} from '../../server/providers';
import type { ApiErrorBody, ApiErrorCode } from '../../src/types/weather';

/**
 * GET /api/weather?q=<city>  or  /api/weather?lat=<lat>&lon=<lon>
 *
 * The browser only ever talks to this endpoint. It keeps the OpenWeatherMap
 * key on the server and collapses four upstream requests into one response.
 */
export const config = { path: '/api/weather' };

const MAX_QUERY_LENGTH = 80;

function json(body: unknown, status: number, cacheSeconds = 0): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
  };
  if (cacheSeconds > 0) {
    // Let Netlify's CDN answer repeat requests for the same place without
    // running the function, and serve a slightly old report while it refreshes.
    headers['netlify-cdn-cache-control'] =
      `public, durable, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 6}`;
    headers['netlify-vary'] = 'query';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function fail(status: number, error: ApiErrorCode, message: string): Response {
  return json({ error, message } satisfies ApiErrorBody, status);
}

function parseCoordinates(params: URLSearchParams): Coordinates | null {
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  const valid =
    params.has('lat') && params.has('lon') &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return valid ? { lat, lon } : null;
}

/** Secondary data is optional: a failed request becomes null, not a failed page. */
async function optional<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return fail(405, 'bad_request', 'Only GET is supported.');

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return fail(500, 'config', 'The weather service is not configured.');

  const params = new URL(request.url).searchParams;
  const query = params.get('q')?.trim() ?? '';
  let coordinates = parseCoordinates(params);

  if (!coordinates && (query.length === 0 || query.length > MAX_QUERY_LENGTH)) {
    return fail(400, 'bad_request', 'Provide a city name, or a latitude and longitude.');
  }

  try {
    let place: OwmGeoResult | null;
    if (coordinates) {
      place = (await optional(reverseGeocode(key, coordinates)))?.[0] ?? null;
    } else {
      place = (await geocodeCity(key, query))[0] ?? null;
      if (!place) return fail(404, 'not_found', `No place called "${query}" was found.`);
      coordinates = { lat: place.lat, lon: place.lon };
    }

    const [current, forecast, air] = await Promise.all([
      fetchCurrent(key, coordinates),
      fetchForecast(key, coordinates),
      optional(fetchAirPollution(key, coordinates)),
    ]);

    const report = buildReport({
      place: place ?? { name: current.name, country: current.sys.country ?? '', ...coordinates },
      current,
      forecast,
      air,
    });
    // Conditions update roughly every ten minutes upstream; five is a safe cache.
    return json(report, 200, 300);
  } catch (error) {
    if (error instanceof ProviderError && error.status === 429) {
      return fail(429, 'rate_limited', 'Too many requests right now. Try again in a minute.');
    }
    if (error instanceof ProviderError && error.status === 401) {
      return fail(500, 'config', 'The weather service rejected its API key.');
    }
    return fail(502, 'upstream', 'The weather service did not respond.');
  }
}
