import type { ReactNode } from 'react';
import styles from './Section.module.css';

interface SectionProps {
  id: string;
  /** Short name of the section, set as a small label. */
  label: string;
  /** The section's headline: a sentence drawn from the data, not a generic title. */
  headline: ReactNode;
  children: ReactNode;
}

/** Shared frame for the sections below the hero: a hairline, a label, a headline. */
export function Section({ id, label, headline, children }: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.inner} data-depth="enter">
        <header className={styles.header}>
          <p className="label">{label}</p>
          <h2 id={`${id}-title`} className={styles.headline}>
            {headline}
          </h2>
        </header>
        {children}
      </div>
    </section>
  );
}
