import { useEffect, useRef, useState } from 'react';
import { type SkyState, sceneParamsFor } from '../../lib/sky';
import styles from './Sky.module.css';
import { SkyScene, pickQuality } from './scene';

interface SkyCanvasProps {
  state: SkyState;
}

/** React wrapper around the imperative three.js scene. Default export so it can be lazy-loaded. */
export default function SkyCanvas({ state }: SkyCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SkyScene | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const { condition, phase, cover } = state;

  useEffect(() => {
    if (!canvas.current) return;
    try {
      scene.current = new SkyScene(canvas.current, {
        quality: pickQuality(),
        // ?gl=software renders without a GPU, for automated screenshots.
        allowSoftware: new URLSearchParams(window.location.search).get('gl') === 'software',
        onFirstFrame: () => setIsReady(true),
        onTooSlow: () => setGaveUp(true),
      });
    } catch {
      // No WebGL, or no GPU behind it: leave the CSS gradient showing.
      setGaveUp(true);
      return;
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setTarget(sceneParamsFor({ condition, phase, cover }));
  }, [condition, phase, cover]);

  // Hiding the canvas (rather than unmounting it) fades the CSS sky back in underneath.
  return <canvas ref={canvas} className={styles.canvas} data-ready={(isReady && !gaveUp) || undefined} />;
}
