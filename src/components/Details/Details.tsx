import type { ReactNode } from 'react';
import { type UnitSystem, compassPoint, formatDistance, formatPressure, formatSpeed, formatTemp, toDisplayTemp } from '../../lib/units';
import type { AirQuality, WeatherReport } from '../../types/weather';
import { Section } from '../Section/Section';
import styles from './Details.module.css';
import { SunArc } from './SunArc';

const AIR_LABELS: Record<AirQuality['index'], string> = {
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very poor',
};

function uvCategory(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

function feelsLikeNote(actual: number, feels: number, units: UnitSystem): string {
  const difference = toDisplayTemp(feels, units) - toDisplayTemp(actual, units);
  if (difference === 0) return 'Same as the air temperature';
  return `${Math.abs(difference)}° ${difference > 0 ? 'warmer' : 'cooler'} than the air`;
}

function pressureNote(hectopascals: number): string {
  if (hectopascals < 1000) return 'Low, often unsettled weather';
  if (hectopascals > 1022) return 'High, often settled weather';
  return 'Typical for sea level';
}

function visibilityNote(metres: number, conditionMain: string): string {
  if (metres >= 9000) return 'Clear to the horizon';
  if (metres >= 4000) return 'Slightly reduced';
  return `Reduced by ${conditionMain.toLowerCase()}`;
}

function headline(report: WeatherReport): string {
  const { air, current } = report;
  if (!air) return `${current.humidity}% humidity, and the barometer reads ${Math.round(current.pressure)} hPa.`;
  const quality = AIR_LABELS[air.index].toLowerCase();
  const advice = air.index >= 4 ? 'Limit time outdoors if you can.' : air.index === 3 ? 'Sensitive groups should take care.' : 'Fine for being outside.';
  return `Air quality is ${quality}. ${advice}`;
}

/** A thin track with a filled share, for values that live on a known scale. */
function Meter({ value, max }: { value: number; max: number }) {
  return (
    <span className={styles.meter} aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }} />
    </span>
  );
}

/** Five steps, filled up to the current air quality index. */
function AirScale({ index }: { index: AirQuality['index'] }) {
  return (
    <span className={styles.scale} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <span key={step} data-on={step <= index || undefined} />
      ))}
    </span>
  );
}

/** A dial whose arrow points the way the wind is travelling. */
function Compass({ degrees }: { degrees: number }) {
  return (
    <svg className={styles.compass} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" />
      <path className={styles.north} d="M24 3v5" />
      {/* Meteorological bearings name where wind comes from, so the arrow is turned half a circle. */}
      <g transform={`rotate(${degrees + 180} 24 24)`}>
        <path className={styles.needle} d="M24 35V13M19 19l5-6 5 6" />
      </g>
    </svg>
  );
}

interface RowProps {
  label: string;
  value: ReactNode;
  unit?: string;
  note: ReactNode;
  figure?: ReactNode;
}

function Row({ label, value, unit, note, figure }: RowProps) {
  return (
    <div className={styles.row}>
      <dt className="label">{label}</dt>
      <dd className={styles.reading}>
        <span className={styles.value}>
          {value}
          {unit && <span className={styles.unit}> {unit}</span>}
        </span>
        <span className={styles.note}>{note}</span>
      </dd>
      <dd className={styles.figure}>{figure}</dd>
    </div>
  );
}

interface DetailsProps {
  report: WeatherReport;
  units: UnitSystem;
  now: number;
}

export function Details({ report, units, now }: DetailsProps) {
  const { current, air, uv, location } = report;
  const wind = formatSpeed(current.windSpeed, units);
  const gust = current.windGust === undefined ? null : formatSpeed(current.windGust, units);
  const pressure = formatPressure(current.pressure, units);
  const visibility = formatDistance(current.visibility, units);

  return (
    <Section id="details" label="Conditions" headline={headline(report)}>
      <div className={styles.layout}>
        <dl className={styles.rows}>
          <Row
            label="Air quality"
            value={air ? AIR_LABELS[air.index] : 'Unavailable'}
            note={air ? `PM2.5 ${Math.round(air.pm25)} · PM10 ${Math.round(air.pm10)} µg/m³` : 'No reading for this location'}
            figure={air && <AirScale index={air.index} />}
          />
          <Row
            label="UV index"
            value={uv ? Math.round(uv.now) : '—'}
            note={uv ? `${uvCategory(uv.now)} now, peaks at ${Math.round(uv.max)} today` : 'No reading right now'}
            figure={uv && <Meter value={uv.now} max={11} />}
          />
          <Row
            label="Wind"
            value={wind.value}
            unit={wind.unit}
            note={`From the ${compassPoint(current.windDeg)}${gust ? `, gusts ${gust.value} ${gust.unit}` : ''}`}
            figure={<Compass degrees={current.windDeg} />}
          />
          <Row
            label="Feels like"
            value={`${formatTemp(current.feelsLike, units)}°`}
            note={feelsLikeNote(current.temp, current.feelsLike, units)}
          />
          <Row
            label="Humidity"
            value={current.humidity}
            unit="%"
            note={current.humidity >= 70 ? 'Humid' : current.humidity <= 30 ? 'Dry' : 'Comfortable'}
            figure={<Meter value={current.humidity} max={100} />}
          />
          <Row label="Pressure" value={pressure.value} unit={pressure.unit} note={pressureNote(current.pressure)} />
          <Row
            label="Visibility"
            value={visibility.value}
            unit={visibility.unit}
            note={visibilityNote(current.visibility, current.condition.main)}
            figure={<Meter value={current.visibility} max={10000} />}
          />
        </dl>

        <SunArc
          sunrise={current.sunrise}
          sunset={current.sunset}
          now={now}
          timezoneOffset={location.timezoneOffset}
        />
      </div>
    </Section>
  );
}
