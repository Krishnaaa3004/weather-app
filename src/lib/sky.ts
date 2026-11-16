import { desaturate, mix } from './color';

/**
 * The sky is the app's whole visual system: its palette, the text colour that
 * sits on it, and the WebGL scene are all derived from one small state.
 * Six conditions × four phases of day = 24 skies, each checked for contrast
 * in sky.test.ts.
 */

export type SkyCondition = 'clear' | 'clouds' | 'rain' | 'snow' | 'haze' | 'storm';
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export const SKY_CONDITIONS: readonly SkyCondition[] = ['clear', 'clouds', 'rain', 'snow', 'haze', 'storm'];
export const SKY_PHASES: readonly SkyPhase[] = ['dawn', 'day', 'dusk', 'night'];

export interface SkyState {
  condition: SkyCondition;
  phase: SkyPhase;
  /** Cloud cover, 0–1. */
  cover: number;
}

export interface SkyPalette {
  /** Gradient stops from zenith to horizon. */
  top: string;
  mid: string;
  low: string;
  /** Tint of the drifting cloud layers. */
  cloud: string;
  /** Text colour, and whether that text is dark-on-light or light-on-dark. */
  fg: string;
  ink: 'dark' | 'light';
  /** The one accent: marks "now" on the hourly curve and the sun on its arc. */
  accent: string;
  /** Opaque panel colour for surfaces that must cover what is behind them. */
  surface: string;
}

export const MUTED_ALPHA = 0.82;
const PAPER = '#f4f1ea';
const INK = '#0b1420';

type Stops = readonly [top: string, mid: string, low: string];

/** Daytime skies are designed one by one; they carry most of the app's character. */
const DAY: Record<SkyCondition, { stops: Stops; ink: 'dark' | 'light' }> = {
  clear: { stops: ['#7fb2e3', '#a3c9ec', '#d2e5f4'], ink: 'dark' },
  clouds: { stops: ['#98a6b3', '#b6c1cb', '#d5dbe0'], ink: 'dark' },
  snow: { stops: ['#b4c0cc', '#d0d8e0', '#eaeef1'], ink: 'dark' },
  haze: { stops: ['#b7a587', '#ccbc9c', '#dfd3b8'], ink: 'dark' },
  rain: { stops: ['#2a343f', '#3b4752', '#4a5560'], ink: 'light' },
  storm: { stops: ['#171c26', '#262d38', '#39414c'], ink: 'light' },
};

/** Clear-sky base for the low-light phases. Weather then mutes and tints it. */
const LOW_LIGHT: Record<Exclude<SkyPhase, 'day'>, Stops> = {
  dawn: ['#1b2443', '#403d62', '#704554'],
  dusk: ['#181c36', '#47324e', '#784032'],
  night: ['#060a14', '#0c1424', '#172238'],
};

/** How each condition alters a low-light sky: wash out colour, darken, then tint. */
const WEATHERING: Record<SkyCondition, { wash: number; shade: number; tint?: [string, number] }> = {
  clear: { wash: 0, shade: 1 },
  clouds: { wash: 0.35, shade: 0.95 },
  rain: { wash: 0.7, shade: 0.85, tint: ['#27313d', 0.3] },
  storm: { wash: 0.8, shade: 0.7, tint: ['#161b24', 0.35] },
  snow: { wash: 0.5, shade: 0.92, tint: ['#5d6878', 0.12] },
  haze: { wash: 0.4, shade: 0.95, tint: ['#4f4032', 0.3] },
};

function weather(stop: string, condition: SkyCondition): string {
  const { wash, shade, tint } = WEATHERING[condition];
  let colour = mix(desaturate(stop, wash), '#000000', 1 - shade);
  if (tint) colour = mix(colour, tint[0], tint[1]);
  return colour;
}

export function paletteFor({ condition, phase }: Pick<SkyState, 'condition' | 'phase'>): SkyPalette {
  const day = DAY[condition];
  const ink = phase === 'day' ? day.ink : 'light';
  const [top, mid, low] =
    phase === 'day' ? day.stops : LOW_LIGHT[phase].map((stop) => weather(stop, condition)) as unknown as Stops;
  const fg = ink === 'dark' ? INK : PAPER;

  return {
    top,
    mid,
    low,
    fg,
    ink,
    // Clouds are paler than a light sky and darker than a dark one, so text
    // contrast can only improve when a cloud drifts behind it.
    cloud: ink === 'dark' ? mix(low, '#ffffff', 0.45) : mix(top, '#000000', 0.35),
    accent: ink === 'dark' ? '#a8300a' : '#ffb454',
    surface: mix(mid, fg, 0.05),
  };
}

/** Maps an OpenWeatherMap condition id to one of the six skies. */
export function conditionFromId(id: number): SkyCondition {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  // 771 squall and 781 tornado are in the "atmosphere" group but are storms.
  if (id === 771 || id === 781) return 'storm';
  if (id >= 700 && id < 800) return 'haze';
  return id > 800 ? 'clouds' : 'clear';
}

const TWILIGHT_BEFORE = 40 * 60;
const TWILIGHT_AFTER = 50 * 60;

/** Phase of day from the sun's actual rise and set at the location. Times in unix seconds. */
export function phaseAt(now: number, sunrise: number, sunset: number): SkyPhase {
  if (now >= sunrise - TWILIGHT_BEFORE && now < sunrise + TWILIGHT_AFTER) return 'dawn';
  if (now >= sunset - TWILIGHT_AFTER && now < sunset + TWILIGHT_BEFORE) return 'dusk';
  return now >= sunrise && now < sunset ? 'day' : 'night';
}

export function skyStateFor(
  conditionId: number,
  cloudCover: number,
  now: number,
  sunrise: number,
  sunset: number,
): SkyState {
  return {
    condition: conditionFromId(conditionId),
    phase: phaseAt(now, sunrise, sunset),
    cover: Math.min(1, Math.max(0, cloudCover / 100)),
  };
}

export type ParticleKind = 'none' | 'rain' | 'snow' | 'haze';

/** Everything the WebGL scene needs, with no dependency on three.js. */
export interface SkySceneParams {
  palette: SkyPalette;
  /** Share of each cloud layer that is filled, 0–1. */
  cloudCover: number;
  /** Peak opacity of a cloud layer. */
  cloudOpacity: number;
  /** Drift speed multiplier. */
  wind: number;
  particles: ParticleKind;
  /** Star visibility, 0–1. */
  stars: number;
  /** Whether to add the rare, dim sheet-lightning swell. */
  lightning: boolean;
}

export function sceneParamsFor(state: SkyState): SkySceneParams {
  const palette = paletteFor(state);
  const { condition, phase, cover } = state;

  const cloudCover: Record<SkyCondition, number> = {
    clear: 0.16,
    clouds: 0.35 + cover * 0.45,
    rain: 0.8,
    snow: 0.7,
    haze: 0.5,
    storm: 0.92,
  };
  const particles: Record<SkyCondition, ParticleKind> = {
    clear: 'none',
    clouds: 'none',
    rain: 'rain',
    snow: 'snow',
    haze: 'haze',
    storm: 'rain',
  };

  return {
    palette,
    cloudCover: cloudCover[condition],
    cloudOpacity: palette.ink === 'dark' ? 0.36 : 0.42,
    wind: condition === 'storm' ? 2.2 : condition === 'rain' ? 1.4 : 1,
    particles: particles[condition],
    stars: phase === 'night' && (condition === 'clear' || condition === 'clouds') ? 1 - cover * 0.8 : 0,
    lightning: condition === 'storm',
  };
}

/**
 * Parses a `?sky=<condition>-<phase>` override, e.g. `?sky=storm-dusk`.
 * Lets every sky be reviewed on demand instead of waiting for the weather.
 */
export function skyOverrideFrom(search: string): SkyState | null {
  const [condition, phase] = (new URLSearchParams(search).get('sky') ?? '').split('-');
  const isCondition = (SKY_CONDITIONS as readonly string[]).includes(condition ?? '');
  const isPhase = (SKY_PHASES as readonly string[]).includes(phase ?? '');
  if (!isCondition || !isPhase) return null;
  return { condition: condition as SkyCondition, phase: phase as SkyPhase, cover: condition === 'clear' ? 0 : 0.7 };
}
