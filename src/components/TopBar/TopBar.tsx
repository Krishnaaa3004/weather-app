import { type FormEvent, useId, useRef, useState } from 'react';
import { type RecentPlace, placeLabel } from '../../hooks/useRecentSearches';
import type { UnitSystem } from '../../lib/units';
import styles from './TopBar.module.css';

interface TopBarProps {
  recent: RecentPlace[];
  units: UnitSystem;
  isLoading: boolean;
  isLocating: boolean;
  onSearch: (query: string) => void;
  onPickRecent: (place: RecentPlace) => void;
  onClearRecent: () => void;
  onLocate: () => void;
  onUnitsChange: (units: UnitSystem) => void;
}

export function TopBar({
  recent,
  units,
  isLoading,
  isLocating,
  onSearch,
  onPickRecent,
  onClearRecent,
  onLocate,
  onUnitsChange,
}: TopBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
    setQuery('');
    setIsOpen(false);
    input.current?.blur();
  };

  const showRecent = isOpen && recent.length > 0;

  return (
    <header className={styles.bar}>
      <a className={styles.wordmark} href="/" aria-label="Overhead, home">
        Overhead
      </a>

      <form
        className={styles.search}
        role="search"
        onSubmit={submit}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          // Close only when focus leaves the form entirely, not when it moves to a recent place.
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
            input.current?.blur();
          }
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Search for a city
        </label>
        <svg className={styles.glass} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3.5 3.5" />
        </svg>
        <input
          ref={input}
          id={inputId}
          className={styles.input}
          type="search"
          name="city"
          placeholder="Search a city"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={80}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {showRecent && (
          <div className={styles.recent}>
            <p className="label">Recent</p>
            <ul>
              {recent.map((place) => (
                <li key={placeLabel(place)}>
                  <button
                    type="button"
                    className={styles.recentItem}
                    onClick={() => {
                      onPickRecent(place);
                      setIsOpen(false);
                    }}
                  >
                    {placeLabel(place)}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.clear} onClick={onClearRecent}>
              Clear history
            </button>
          </div>
        )}
      </form>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.locate}
          onClick={onLocate}
          disabled={isLocating}
          aria-label="Use my location"
          title="Use my location"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" data-busy={isLocating || undefined}>
            <circle cx="8" cy="8" r="4" />
            <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
          </svg>
        </button>

        <div className={styles.units} role="group" aria-label="Units">
          {(['metric', 'imperial'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={units === option}
              onClick={() => onUnitsChange(option)}
            >
              <span aria-hidden="true">{option === 'metric' ? '°C' : '°F'}</span>
              <span className="sr-only">{option === 'metric' ? 'Celsius' : 'Fahrenheit'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.progress} data-active={isLoading || undefined} aria-hidden="true" />
    </header>
  );
}
