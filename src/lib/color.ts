export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const channel = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Linear blend in sRGB. `amount` 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount]);
}

/** Pulls a colour toward the grey of equal brightness. */
export function desaturate(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  return mix(hex, rgbToHex([grey, grey, grey]), amount);
}

/** WCAG 2 relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
