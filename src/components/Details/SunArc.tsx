import { formatClock, formatDuration } from '../../lib/time';
import styles from './SunArc.module.css';

const WIDTH = 400;
const HEIGHT = 210;
const HORIZON = 170;
const RADIUS = 150;
const CENTRE = WIDTH / 2;
const ARC = `M${CENTRE - RADIUS},${HORIZON}A${RADIUS},${RADIUS} 0 0 1 ${CENTRE + RADIUS},${HORIZON}`;

interface SunArcProps {
  sunrise: number;
  sunset: number;
  now: number;
  timezoneOffset: number;
}

/** The sun's path from rise to set, with the sun drawn where it is right now. */
export function SunArc({ sunrise, sunset, now, timezoneOffset }: SunArcProps) {
  const daylight = sunset - sunrise;
  const progress = Math.min(1, Math.max(0, (now - sunrise) / daylight));
  const isUp = now >= sunrise && now < sunset;

  const angle = Math.PI * (1 - progress);
  const sunX = CENTRE + RADIUS * Math.cos(angle);
  const sunY = HORIZON - RADIUS * Math.sin(angle);

  let status: string;
  if (isUp) status = `Sunset in ${formatDuration(sunset - now)}`;
  else if (now < sunrise) status = `Sunrise in ${formatDuration(sunrise - now)}`;
  // After sunset the API still reports today's times; tomorrow's sunrise is about a day after today's.
  else status = `Sunrise in about ${formatDuration(sunrise + 86400 - now)}`;

  const rise = formatClock(sunrise, timezoneOffset);
  const set = formatClock(sunset, timezoneOffset);

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.arc}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Sunrise at ${rise}, sunset at ${set}. ${status}.`}
      >
        <path className={styles.path} d={ARC} />
        {/* pathLength=1 lets the dash array express progress directly as a fraction. */}
        <path className={styles.travelled} d={ARC} pathLength={1} strokeDasharray={`${progress} 1`} />
        <line className={styles.horizon} x1={0} x2={WIDTH} y1={HORIZON} y2={HORIZON} />
        {isUp ? (
          <circle className={styles.sun} cx={sunX} cy={sunY} r={9} />
        ) : (
          <circle className={styles.sunDown} cx={now < sunrise ? CENTRE - RADIUS : CENTRE + RADIUS} cy={HORIZON} r={5} />
        )}
      </svg>

      <figcaption className={styles.caption}>
        <div>
          <p className="label">Sunrise</p>
          <p className={styles.time}>{rise}</p>
        </div>
        <div className={styles.centre}>
          <p className={styles.status}>{status}</p>
          <p className={styles.daylight}>{formatDuration(daylight)} of daylight</p>
        </div>
        <div className={styles.end}>
          <p className="label">Sunset</p>
          <p className={styles.time}>{set}</p>
        </div>
      </figcaption>
    </figure>
  );
}
