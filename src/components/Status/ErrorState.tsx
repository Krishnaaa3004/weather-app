import type { WeatherError } from '../../services/weatherApi';
import styles from './Status.module.css';

const COPY: Record<WeatherError['kind'], { title: string; body: string }> = {
  not_found: {
    title: 'We couldn’t find that place.',
    body: 'Check the spelling, or try the nearest larger city.',
  },
  network: {
    title: 'You seem to be offline.',
    body: 'Check your connection, then try again.',
  },
  rate_limited: {
    title: 'Too many requests just now.',
    body: 'The weather service is catching its breath. Try again in a minute.',
  },
  server: {
    title: 'The weather service didn’t answer.',
    body: 'This is on our side, not yours. Try again in a moment.',
  },
};

export function errorCopy(error: WeatherError) {
  return COPY[error.kind];
}

interface ErrorStateProps {
  error: WeatherError;
  onRetry: () => void;
}

/** Shown in place of the hero when there is no report at all to fall back on. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { title, body } = errorCopy(error);
  return (
    <section className={styles.error} role="alert">
      <h1 className={styles.errorTitle}>{title}</h1>
      <p className={styles.errorBody}>{body} You can also search for a city above.</p>
      <button type="button" className={styles.button} onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}
