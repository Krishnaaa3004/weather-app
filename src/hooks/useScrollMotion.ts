import { useEffect } from 'react';

/**
 * Turns on smooth scrolling and the depth transitions between sections.
 * GSAP and Lenis live in their own chunk, loaded only when motion is allowed,
 * so reduced-motion users never download them.
 *
 * @param enabled  False for reduced motion, or before any section exists.
 */
export function useScrollMotion(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;

    void import('../lib/motion').then(({ initMotion }) => {
      if (!cancelled) dispose = initMotion();
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [enabled]);
}
