import { useCallback, useState } from 'react';

export type GeolocationProblem = 'denied' | 'unavailable' | 'unsupported';

interface Position {
  lat: number;
  lon: number;
}

/**
 * Asks for the device position only when the user presses the button, never
 * on page load. Resolves to null with a `problem` the UI can explain.
 */
export function useGeolocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [problem, setProblem] = useState<GeolocationProblem | null>(null);

  const locate = useCallback((): Promise<Position | null> => {
    if (!('geolocation' in navigator)) {
      setProblem('unsupported');
      return Promise.resolve(null);
    }
    setIsLocating(true);
    setProblem(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setIsLocating(false);
          resolve({ lat: coords.latitude, lon: coords.longitude });
        },
        (error) => {
          setIsLocating(false);
          setProblem(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
          resolve(null);
        },
        { timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  }, []);

  const clearProblem = useCallback(() => setProblem(null), []);

  return { locate, isLocating, problem, clearProblem };
}
