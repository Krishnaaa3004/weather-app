import { formatClock } from '../../lib/time';
import styles from './Footer.module.css';

interface FooterProps {
  /** Unix seconds of the last successful fetch, if any. */
  fetchedAt: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

/** Offset of the viewer's own clock, since "last updated" is about them, not the city. */
const viewerOffset = () => -new Date().getTimezoneOffset() * 60;

export function Footer({ fetchedAt, isLoading, onRefresh }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div>
        <p className="label">Sources</p>
        <p>
          Weather and air quality from <a href="https://openweathermap.org/" rel="noreferrer">OpenWeatherMap</a>.
          UV index from <a href="https://open-meteo.com/" rel="noreferrer">Open-Meteo</a>.
          Icons are <a href="https://github.com/basmilius/weather-icons" rel="noreferrer">Meteocons</a> by Bas Milius.
        </p>
      </div>

      <div>
        <p className="label">Updated</p>
        <p>
          {fetchedAt ? <time dateTime={new Date(fetchedAt * 1000).toISOString()}>{formatClock(fetchedAt, viewerOffset())} your time</time> : 'Not yet'}
          {' · '}
          <button type="button" className={styles.refresh} onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </p>
      </div>

      <div>
        <p className="label">Source code</p>
        <p>
          <a href="https://github.com/Krishnaaa3004/weather-app" rel="noreferrer">github.com/Krishnaaa3004/weather-app</a>
        </p>
      </div>
    </footer>
  );
}
