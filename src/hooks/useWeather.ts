import { useCallback, useEffect, useReducer, useRef } from 'react';
import { WeatherError, type WeatherTarget, fetchReport, fetchUv } from '../services/weatherApi';
import type { UvIndex, WeatherReport } from '../types/weather';

interface State {
  /** The last successful report. Kept on screen while a new one loads or fails. */
  report: WeatherReport | null;
  isLoading: boolean;
  error: WeatherError | null;
}

type Action =
  | { type: 'request' }
  | { type: 'success'; report: WeatherReport }
  | { type: 'uv'; fetchedAt: number; uv: UvIndex | null }
  | { type: 'failure'; error: WeatherError }
  | { type: 'dismiss' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'request':
      return { ...state, isLoading: true, error: null };
    case 'success':
      return { report: action.report, isLoading: false, error: null };
    case 'uv':
      // Ignore a UV answer that belongs to a report we have since replaced.
      return state.report?.fetchedAt === action.fetchedAt
        ? { ...state, report: { ...state.report, uv: action.uv } }
        : state;
    case 'failure':
      return { ...state, isLoading: false, error: action.error };
    case 'dismiss':
      return { ...state, error: null };
  }
}

const STALE_AFTER_MS = 10 * 60 * 1000;

export interface UseWeather extends State {
  /** Loads a place. Resolves to the report, or null if the request failed or was superseded. */
  load: (target: WeatherTarget) => Promise<WeatherReport | null>;
  /** Reloads the place currently on screen. */
  refresh: () => void;
  dismissError: () => void;
}

/**
 * Owns the weather report: loading, errors, cancelling superseded requests,
 * and refreshing data that went stale while the tab was in the background.
 */
export function useWeather(initial: WeatherTarget): UseWeather {
  const [state, dispatch] = useReducer(reducer, { report: null, isLoading: true, error: null });
  const controller = useRef<AbortController | null>(null);
  const lastTarget = useRef<WeatherTarget>(initial);
  const loadedAt = useRef(0);

  const load = useCallback(async (target: WeatherTarget) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    dispatch({ type: 'request' });

    try {
      const proxy = await fetchReport(target, current.signal);
      const report: WeatherReport = { ...proxy, uv: null };
      const { lat, lon } = report.location;
      lastTarget.current = { kind: 'coords', lat, lon };
      loadedAt.current = Date.now();
      dispatch({ type: 'success', report });

      void fetchUv(lat, lon, current.signal).then((uv) => {
        if (!current.signal.aborted) dispatch({ type: 'uv', fetchedAt: report.fetchedAt, uv });
      });
      return report;
    } catch (error) {
      if (current.signal.aborted) return null;
      dispatch({
        type: 'failure',
        error: error instanceof WeatherError ? error : new WeatherError('server', 'Something went wrong.'),
      });
      return null;
    }
  }, []);

  const refresh = useCallback(() => void load(lastTarget.current), [load]);

  // The initial target is read once, on mount; lastTarget still holds it then.
  useEffect(() => {
    void load(lastTarget.current);
    return () => controller.current?.abort();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      const isStale = loadedAt.current > 0 && Date.now() - loadedAt.current > STALE_AFTER_MS;
      if (document.visibilityState === 'visible' && isStale) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const dismissError = useCallback(() => dispatch({ type: 'dismiss' }), []);

  return { ...state, load, refresh, dismissError };
}
