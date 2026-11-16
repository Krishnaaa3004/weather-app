import styles from './Status.module.css';

interface NoticeProps {
  title: string;
  body: string;
  onDismiss: () => void;
}

/** A dismissible message for problems that leave the current report usable. */
export function Notice({ title, body, onDismiss }: NoticeProps) {
  return (
    <div className={styles.notice} role="alert">
      <p>
        <strong>{title}</strong> {body}
      </p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="m2 2 8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  );
}
