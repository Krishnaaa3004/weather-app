import { useCallback, useEffect, useMemo, useState } from 'react';
import { Details } from './components/Details/Details';
import { Footer } from './components/Footer/Footer';
import { Forecast } from './components/Forecast/Forecast';
import { Hero } from './components/Hero/Hero';
import { Hourly } from './components/Hourly/Hourly';
import { SkyBackdrop } from './components/Sky/SkyBackdrop';
import { ErrorState, errorCopy } from './components/Status/ErrorState';
import { Notice } from './components/Status/Notice';
import { Skeleton } from './components/Status/Skeleton';
import { TopBar } from './components/TopBar/TopBar';
import { type GeolocationProblem, useGeolocation } from './hooks/useGeolocation';
import { useReducedMotion } from './hooks/useMediaQuery';
import { useNow } from './hooks/useNow';
import { type RecentPlace, readRecentPlaces, useRecentSearches } from './hooks/useRecentSearches';
import { useScrollMotion } from './hooks/useScrollMotion';
import { useSkyTheme } from './hooks/useSkyTheme';
import { useUnits } from './hooks/useUnits';
import { useWeather } from './hooks/useWeather';
import { type SkyState, paletteFor, skyOverrideFrom, skyStateFor } from './lib/sky';
import { formatTemp } from './lib/units';
import type { WeatherTarget } from './services/weatherApi';

const DEFAULT_CITY = 'New Delhi';
const RESTING_SKY: SkyState = { condition: 'clear', phase: 'night', cover: 0 };

const LOCATION_COPY: Record<GeolocationProblem, { title: string; body: string }> = {
  denied: {
    title: 'Location is switched off.',
    body: 'Allow it in your browser’s site settings, or search for a city instead.',
  },
  unavailable: {
    title: 'We couldn’t get your position.',
    body: 'Try again in a moment, or search for a city instead.',
  },
  unsupported: {
    title: 'This browser can’t share a location.',
    body: 'Search for a city instead.',
  },
};

const targetFor = ({ lat, lon, ...place }: RecentPlace): WeatherTarget => ({ kind: 'coords', lat, lon, place });

/** Reopen the last place viewed; first-time visitors get a default city, never a permission prompt. */
function initialTarget(): WeatherTarget {
  const last = readRecentPlaces()[0];
  return last ? targetFor(last) : { kind: 'city', query: DEFAULT_CITY };
}

export function App() {
  const [initial] = useState(initialTarget);
  const { report, isLoading, error, load, refresh, dismissError } = useWeather(initial);
  const { recent, remember, clear } = useRecentSearches();
  const [units, setUnits] = useUnits();
  const geolocation = useGeolocation();
  const reducedMotion = useReducedMotion();
  const now = useNow();

  // ?sky=rain-dusk forces a sky, for reviewing all 24 states without waiting for the weather.
  const override = useMemo(() => skyOverrideFrom(window.location.search), []);
  const current = report?.current;
  const sky = useMemo<SkyState>(() => {
    if (override) return override;
    if (!current) return RESTING_SKY;
    return skyStateFor(current.condition.id, current.cloudCover, now, current.sunrise, current.sunset);
  }, [override, current, now]);
  const palette = useMemo(() => paletteFor(sky), [sky.condition, sky.phase]);

  useSkyTheme(palette);
  useScrollMotion(!reducedMotion && report !== null);

  /** Loads a place the user chose and, if it worked, files it under recent searches. */
  const open = useCallback(
    async (target: WeatherTarget) => {
      const loaded = await load(target);
      if (!loaded) return;
      const { name, country, state, lat, lon } = loaded.location;
      remember({ name, country, state, lat, lon });
      window.scrollTo({ top: 0 });
    },
    [load, remember],
  );

  const onLocate = useCallback(async () => {
    const position = await geolocation.locate();
    if (position) void open({ kind: 'coords', ...position });
  }, [geolocation, open]);

  const onPickRecent = useCallback(
    (place: RecentPlace) => void open(targetFor(place)),
    [open],
  );

  useEffect(() => {
    document.title = report
      ? `${formatTemp(report.current.temp, units)}° ${report.location.name} — Overhead`
      : 'Overhead — the sky, right now';
  }, [report, units]);

  const notice = geolocation.problem
    ? { ...LOCATION_COPY[geolocation.problem], dismiss: geolocation.clearProblem }
    : error && report
      ? { ...errorCopy(error), dismiss: dismissError }
      : null;

  return (
    <>
      <SkyBackdrop state={sky} />
      <a className="skip-link" href="#main">
        Skip to the forecast
      </a>

      <TopBar
        recent={recent}
        units={units}
        isLoading={isLoading}
        isLocating={geolocation.isLocating}
        onSearch={(query) => void open({ kind: 'city', query })}
        onPickRecent={onPickRecent}
        onClearRecent={clear}
        onLocate={() => void onLocate()}
        onUnitsChange={setUnits}
      />

      <main id="main" aria-busy={isLoading}>
        {report ? (
          <>
            <Hero report={report} units={units} now={now} />
            <Hourly report={report} units={units} />
            <Forecast report={report} units={units} />
            <Details report={report} units={units} now={now} />
          </>
        ) : error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : (
          <Skeleton />
        )}
      </main>

      <Footer fetchedAt={report?.fetchedAt ?? null} isLoading={isLoading} onRefresh={refresh} />

      {notice && <Notice title={notice.title} body={notice.body} onDismiss={notice.dismiss} />}
    </>
  );
}
