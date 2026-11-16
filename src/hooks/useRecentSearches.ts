import { useCallback, useState } from 'react';
import { readStored, writeStored } from '../lib/storage';

export interface RecentPlace {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

/** "Tokyo, JP" */
export const placeLabel = (place: RecentPlace) => (place.country ? `${place.name}, ${place.country}` : place.name);

const KEY = 'overhead:places';
const LIMIT = 5;

function isRecentList(value: unknown): value is RecentPlace[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        typeof item === 'object' && item !== null &&
        typeof (item as RecentPlace).name === 'string' &&
        typeof (item as RecentPlace).country === 'string' &&
        Number.isFinite((item as RecentPlace).lat) &&
        Number.isFinite((item as RecentPlace).lon),
    )
  );
}

export function readRecentPlaces(): RecentPlace[] {
  return readStored(KEY, isRecentList, []).slice(0, LIMIT);
}

/** The last few places viewed, newest first, persisted in localStorage. */
export function useRecentSearches() {
  const [recent, setRecent] = useState(readRecentPlaces);

  const remember = useCallback((place: RecentPlace) => {
    setRecent((previous) => {
      const next = [place, ...previous.filter((item) => placeLabel(item) !== placeLabel(place))].slice(0, LIMIT);
      writeStored(KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStored(KEY, []);
    setRecent([]);
  }, []);

  return { recent, remember, clear };
}
