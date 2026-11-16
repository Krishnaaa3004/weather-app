import { describe, iconFor } from '../../lib/conditions';
import { formatClock, formatLongDate, isoLocal } from '../../lib/time';
import { type UnitSystem, formatTemp } from '../../lib/units';
import type { WeatherReport } from '../../types/weather';
import { Icon } from '../Icon/Icon';
import styles from './Hero.module.css';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

interface HeroProps {
  report: WeatherReport;
  units: UnitSystem;
  /** Current unix time, so the clock keeps running between fetches. */
  now: number;
}

export function Hero({ report, units, now }: HeroProps) {
  const { location, current } = report;
  const offset = location.timezoneOffset;
  const isDay = now >= current.sunrise && now < current.sunset;
  const region = [location.state !== location.name ? location.state : null, countryName(location.country)]
    .filter(Boolean)
    .join(', ');
  const unitName = units === 'metric' ? 'Celsius' : 'Fahrenheit';

  return (
    <section className={styles.hero} aria-labelledby="hero-city">
      <div className={styles.inner} data-depth="exit">
        <div className={styles.place}>
          <h1 id="hero-city" className={styles.city}>
            {location.name}
          </h1>
          <p className={styles.meta}>
            <span>{region}</span>
            <time dateTime={isoLocal(now, offset)}>
              {formatLongDate(now, offset)}, {formatClock(now, offset)}
            </time>
          </p>
        </div>

        <p className={styles.temp}>
          <span aria-hidden="true">
            {formatTemp(current.temp, units)}
            <span className={styles.degree}>°</span>
          </span>
          <span className="sr-only">
            {formatTemp(current.temp, units)} degrees {unitName}
          </span>
        </p>

        <div className={styles.now}>
          <div className={styles.condition}>
            <Icon name={iconFor(current.condition.id, isDay)} size={56} />
            <p>{describe(current.condition)}</p>
          </div>
          <dl className={styles.range}>
            <div>
              <dt className="label">High</dt>
              <dd>{formatTemp(current.high, units)}°</dd>
            </div>
            <div>
              <dt className="label">Low</dt>
              <dd>{formatTemp(current.low, units)}°</dd>
            </div>
            <div>
              <dt className="label">Feels like</dt>
              <dd>{formatTemp(current.feelsLike, units)}°</dd>
            </div>
          </dl>
        </div>
      </div>

      <a className={styles.cue} href="#hourly">
        <span className="label">Next 24 hours</span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1v10M2 7l4 4 4-4" />
        </svg>
      </a>
    </section>
  );
}
