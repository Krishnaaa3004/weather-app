import styles from './Status.module.css';

/** Placeholder with the hero's exact layout, so nothing shifts when data arrives. */
export function Skeleton() {
  return (
    <section className={styles.skeleton} aria-busy="true" aria-label="Loading the weather">
      <div className={styles.bone} style={{ width: 'min(18rem, 70%)', height: '3.5rem' }} />
      <div className={styles.bone} style={{ width: 'min(22rem, 85%)', height: '1.25rem', marginTop: '1rem' }} />
      <div className={styles.spacer} />
      <div className={styles.bottom}>
        <div className={`${styles.bone} ${styles.figure}`} />
        <div className={styles.side}>
          <div className={styles.bone} style={{ height: '3rem' }} />
          <div className={styles.bone} style={{ height: '2.5rem', marginTop: '1.5rem' }} />
        </div>
      </div>
    </section>
  );
}
