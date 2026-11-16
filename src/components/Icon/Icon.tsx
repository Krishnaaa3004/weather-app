import { useReducedMotion } from '../../hooks/useMediaQuery';
import type { IconName } from '../../lib/conditions';
import styles from './Icon.module.css';

// Inlined (not <img>) so the strokes can use currentColor and follow the sky.
const sources = import.meta.glob<string>('../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const animated = new Map<string, string>();
const still = new Map<string, string>();
for (const [path, svg] of Object.entries(sources)) {
  const name = path.slice(path.lastIndexOf('/') + 1, -4);
  animated.set(name, svg);
  still.set(name, svg.replace(/<animate(Transform|Motion)?\b[^>]*?(\/>|>.*?<\/animate(Transform|Motion)?>)/g, ''));
}

interface IconProps {
  name: IconName;
  /** Rendered size in pixels. */
  size?: number;
  /** Accessible name. Omit when adjacent text already describes the icon. */
  label?: string;
}

/** A Meteocon weather icon. Its looping animation is removed for reduced motion. */
export function Icon({ name, size = 48, label }: IconProps) {
  const reducedMotion = useReducedMotion();
  const svg = (reducedMotion ? still : animated).get(name) ?? '';
  return (
    <span
      className={styles.icon}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // Static, build-time SVG from our own assets folder; never user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
