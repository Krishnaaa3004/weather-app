import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { describe, iconFor, isWet } from '../../lib/conditions';
import { dateKey, dayMonthOf, weekdayOf } from '../../lib/time';
import { type UnitSystem, formatTemp } from '../../lib/units';
import type { DailyForecast, WeatherReport } from '../../types/weather';
import { Icon } from '../Icon/Icon';
import { Section } from '../Section/Section';
import styles from './Forecast.module.css';

/** Horizontal distance between neighbouring cards, as a share of one card's width. */
const SPACING = 0.9;
/** How far a neighbour turns away and steps back, per position from the centre. */
const TURN_DEGREES = 34;
const STEP_BACK_PX = 190;

function headline(days: readonly DailyForecast[], units: UnitSystem): string {
  const warmest = days.reduce((a, b) => (b.high > a.high ? b : a));
  const wet = days.filter((day) => isWet(day.condition.id) || day.pop >= 0.5);
  const peak = `${weekdayOf(warmest.date)} is the warmest, at ${formatTemp(warmest.high, units)}°.`;
  if (wet.length === 0) return `Dry all week. ${peak}`;
  if (wet.length === days.length) return `Wet every day. ${peak}`;
  return `${peak} Expect rain or snow on ${wet.length} of ${days.length} days.`;
}

interface ForecastProps {
  report: WeatherReport;
  units: UnitSystem;
}

/**
 * Five days as a ring of panels in perspective. The position is a float that
 * follows the pointer during a drag (written straight to the DOM, so dragging
 * never re-renders React) and settles on the nearest whole card on release.
 */
export function Forecast({ report, units }: ForecastProps) {
  const { daily, location } = report;
  const today = dateKey(report.current.time, location.timezoneOffset);
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startPosition: number; moved: boolean } | null>(null);

  const weekLow = Math.min(...daily.map((day) => day.low));
  const weekSpan = Math.max(1, Math.max(...daily.map((day) => day.high)) - weekLow);

  const place = useCallback((position: number, animate: boolean) => {
    const cards = stage.current?.querySelectorAll<HTMLElement>('[data-card]');
    cards?.forEach((card, index) => {
      const offset = index - position;
      const distance = Math.abs(offset);
      card.style.transition = animate ? '' : 'none';
      card.style.transform =
        `translateX(${offset * SPACING * 100}%) translateZ(${-distance * STEP_BACK_PX}px) rotateY(${-offset * TURN_DEGREES}deg)`;
      // Neighbours stay opaque so cards never show through each other; only the
      // ones beyond them, which overlap nothing, fade into the sky.
      card.style.opacity = String(Math.min(1, Math.max(0, 1 - (distance - 1) * 0.6)));
      card.style.zIndex = String(100 - Math.round(distance * 10));
    });
  }, []);

  useEffect(() => place(active, true), [active, place, daily]);
  // A new city may have fewer days than the card that was selected.
  useEffect(() => setActive(0), [location.lat, location.lon]);

  const go = (index: number) => setActive(Math.min(daily.length - 1, Math.max(0, index)));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { startX: event.clientX, startPosition: active, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const card = stage.current?.querySelector<HTMLElement>('[data-card]');
    if (!state || !card) return;
    const deltaX = event.clientX - state.startX;
    if (!state.moved && Math.abs(deltaX) < 6) return;
    if (!state.moved) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const raw = state.startPosition - deltaX / (card.offsetWidth * SPACING);
    // Resist past the first and last card instead of stopping dead.
    const position = Math.min(daily.length - 0.6, Math.max(-0.4, raw));
    place(position, false);
    event.currentTarget.dataset.position = String(position);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;
    const position = Number(event.currentTarget.dataset.position ?? active);
    const target = Math.min(daily.length - 1, Math.max(0, Math.round(position)));
    if (target === active) place(active, true);
    else setActive(target);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(active + 1);
    else if (event.key === 'ArrowLeft') go(active - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(daily.length - 1);
    else return;
    event.preventDefault();
  };

  if (daily.length === 0) return null;

  return (
    <Section id="forecast" label="Five days" headline={headline(daily, units)}>
      <div
        ref={stage}
        className={styles.stage}
        role="group"
        aria-roledescription="carousel"
        aria-label="Five-day forecast. Use the arrow keys to move between days."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ol className={styles.ring}>
          {daily.map((day, index) => {
            const isActive = index === active;
            const name = day.date === today ? 'Today' : weekdayOf(day.date);
            return (
              <li
                key={day.date}
                data-card
                className={styles.card}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  if (!isActive) go(index);
                }}
              >
                <header className={styles.cardHead}>
                  <h3 className={styles.day}>{name}</h3>
                  <p className="label">{dayMonthOf(day.date)}</p>
                </header>

                <Icon name={iconFor(day.condition.id, true)} size={72} />
                <p className={styles.summary}>{describe(day.condition)}</p>

                <p className={styles.high}>
                  <span className="sr-only">High </span>
                  {formatTemp(day.high, units)}°
                </p>

                <div className={styles.rangeRow}>
                  <span>
                    <span className="sr-only">Low </span>
                    {formatTemp(day.low, units)}°
                  </span>
                  {/* Where this day's low-to-high sits within the week's full range. */}
                  <span className={styles.rangeTrack} aria-hidden="true">
                    <span
                      className={styles.rangeFill}
                      style={{
                        left: `${((day.low - weekLow) / weekSpan) * 100}%`,
                        right: `${100 - ((day.high - weekLow) / weekSpan) * 100}%`,
                      }}
                    />
                  </span>
                  <span aria-hidden="true">{formatTemp(day.high, units)}°</span>
                </div>

                <p className={styles.pop}>
                  <span className="label">Precipitation</span>
                  <span>{Math.round(day.pop * 100)}%</span>
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.nav}>
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous day">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H2M7 3 2 8l5 5" /></svg>
        </button>
        <p className={styles.count} aria-live="polite">
          <span className="sr-only">Day </span>
          {active + 1} <span aria-hidden="true">/</span><span className="sr-only">of</span> {daily.length}
        </p>
        <button
          type="button"
          onClick={() => go(active + 1)}
          disabled={active === daily.length - 1}
          aria-label="Next day"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" /></svg>
        </button>
      </div>
    </Section>
  );
}
