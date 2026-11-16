/**
 * localStorage that cannot throw. Private windows and blocked site data make
 * every access a possible exception, and stored values may be stale or edited.
 */
export function readStored<T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience; the app works without it.
  }
}
