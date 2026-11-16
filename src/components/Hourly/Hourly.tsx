import { useMemo, useRef } from 'react';
import { useDragScroll } from '../../hooks/useDragScroll';
import { describe, iconFor } from '../../lib/conditions';
import { monotonePath } from '../../lib/curve';
import { summariseHours } from '../../lib/summary';
import { formatClock } from '../../lib/time';
import { type UnitSystem, formatTemp } from '../../lib/units';
import type { HourlyPoint, WeatherReport } from '../../types/weather';
import { Icon } from '../Icon/Icon';
import { Section } from '../Section/Section';
import styles from './Hourly.module.css';

/** Pixels per three hours of forecast. Wide enough that the track overflows and invites a drag. */
const STEP = 184;
const EDGE = 56;
const HEIGHT = 300;
const CURVE_TOP = 124;
const CURVE_BOTTOM = 196;
/** The axis the curve stands on; time labels sit below it. */
const BASELINE = 236;
const THREE_HOURS = 3 * 3600;
/** A forecast slot closer to "now" than this would collide with it, so "now" stands in for it. */
const MIN_GAP = 1.5 * 3600;

interface Plotted extends HourlyPoint {
  x: number;
  y: number;
}

function plot(hours: readonly HourlyPoint[]): Plotted[] {
  const [now, next, ...rest] = hours;
  if (!now) return [];
  const points = next && next.time - now.time < MIN_GAP ? [now, ...rest] : hours;

  const temps = points.map((point) => point.temp);
  const min = Math.min(...temps);
  const span = Math.max(1, Math.max(...temps) - min);

  return points.map((point) => ({
    ...point,
    // Spacing follows real elapsed time, so the short first interval looks short.
    x: EDGE + ((point.time - now.time) / THREE_HOURS) * STEP,
    y: CURVE_BOTTOM - ((point.temp - min) / span) * (CURVE_BOTTOM - CURVE_TOP),
  }));
}

interface HourlyProps {
  report: WeatherReport;
  units: UnitSystem;
}

export function Hourly({ report, units }: HourlyProps) {
  const offset = report.location.timezoneOffset;
  const scroller = useRef<HTMLDivElement>(null);
  useDragScroll(scroller);

  const points = useMemo(() => plot(report.hourly), [report.hourly]);
  const last = points[points.length - 1];
  if (!last) return null;

  const width = last.x + EDGE;
  const line = monotonePath(points);
  const area = `${line}L${last.x},${BASELINE}L${EDGE},${BASELINE}Z`;

  return (
    <Section id="hourly" label="Next 24 hours" headline={summariseHours(report.hourly, offset, units)}>
      <div
        ref={scroller}
        className={styles.scroller}
        tabIndex={0}
        role="group"
        aria-label="Hourly forecast. Scroll sideways for later hours."
      >
        <div className={styles.track} style={{ width, height: HEIGHT }}>
          <svg className={styles.chart} width={width} height={HEIGHT} aria-hidden="true">
            <path className={styles.area} d={area} />
            {points.map((point) => (
              <line key={point.time} className={styles.drop} x1={point.x} x2={point.x} y1={point.y} y2={BASELINE} />
            ))}
            <line className={styles.axis} x1={EDGE} x2={last.x} y1={BASELINE} y2={BASELINE} />
            <path className={styles.line} d={line} />
            {points.map((point, index) => (
              <circle
                key={point.time}
                className={index === 0 ? styles.nowDot : styles.dot}
                cx={point.x}
                cy={point.y}
                r={index === 0 ? 5 : 3}
              />
            ))}
          </svg>

          <ol className={styles.hours}>
            {points.map((point, index) => (
              <li key={point.time} className={styles.hour} style={{ left: point.x }}>
                <Icon name={iconFor(point.condition.id, point.isDay)} size={36} label={describe(point.condition)} />
                <span className={styles.temp} style={{ top: point.y - 38 }}>
                  {formatTemp(point.temp, units)}°
                </span>
                <span className={styles.time}>{index === 0 ? 'Now' : formatClock(point.time, offset)}</span>
                <span className={styles.rain}>
                  {point.pop >= 0.05 ? `${Math.round(point.pop * 100)}% rain` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
