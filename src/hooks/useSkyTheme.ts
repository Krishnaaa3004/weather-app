import { useEffect } from 'react';
import { hexToRgb } from '../lib/color';
import type { SkyPalette } from '../lib/sky';

/**
 * Publishes the current sky as CSS custom properties on <html>. Every colour
 * in the stylesheet derives from these, so the whole UI re-themes at once.
 */
export function useSkyTheme(palette: SkyPalette): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sky-top', palette.top);
    root.style.setProperty('--sky-mid', palette.mid);
    root.style.setProperty('--sky-low', palette.low);
    root.style.setProperty('--fg-rgb', hexToRgb(palette.fg).join(' '));
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--surface', palette.surface);
    root.dataset.ink = palette.ink;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.top);
  }, [palette]);
}
