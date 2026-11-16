import { useCallback, useState } from 'react';
import { readStored, writeStored } from '../lib/storage';
import type { UnitSystem } from '../lib/units';

const KEY = 'overhead:units';
const isUnitSystem = (value: unknown): value is UnitSystem => value === 'metric' || value === 'imperial';

/** First visit follows the browser locale; after that, the user's choice. */
function initialUnits(): UnitSystem {
  const byLocale: UnitSystem = navigator.language === 'en-US' ? 'imperial' : 'metric';
  return readStored(KEY, isUnitSystem, byLocale);
}

export function useUnits(): [UnitSystem, (units: UnitSystem) => void] {
  const [units, setUnits] = useState(initialUnits);
  const update = useCallback((next: UnitSystem) => {
    writeStored(KEY, next);
    setUnits(next);
  }, []);
  return [units, update];
}
