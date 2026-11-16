import { Component, type ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import type { SkyState } from '../../lib/sky';
import styles from './Sky.module.css';

// three.js is the heaviest dependency; it loads after the page is interactive.
const SkyCanvas = lazy(() => import('./SkyCanvas'));

/** If the 3D chunk fails to load or WebGL throws, the CSS gradient simply stays. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface SkyBackdropProps {
  state: SkyState;
}

/**
 * The sky behind everything. A CSS gradient paints on the first frame; the
 * WebGL scene fades in over it once the browser is idle. With reduced motion
 * the gradient is all there is.
 */
export function SkyBackdrop({ state }: SkyBackdropProps) {
  const reducedMotion = useReducedMotion();
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIsIdle(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIsIdle(true), 600);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      {isIdle && !reducedMotion && (
        <Fallback>
          <Suspense fallback={null}>
            <SkyCanvas state={state} />
          </Suspense>
        </Fallback>
      )}
    </div>
  );
}
