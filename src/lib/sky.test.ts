import { describe, expect, it } from 'vitest';
import { contrast, mix } from './color';
import { MUTED_ALPHA, SKY_CONDITIONS, SKY_PHASES, conditionFromId, paletteFor, phaseAt } from './sky';

const AA_BODY = 4.5;

describe('sky palettes', () => {
  for (const phase of SKY_PHASES) {
    for (const condition of SKY_CONDITIONS) {
      it(`${condition} at ${phase} keeps text at WCAG AA on every part of the sky`, () => {
        const palette = paletteFor({ condition, phase });
        // Text can sit over any gradient stop, with or without a cloud behind it.
        const backgrounds = [palette.top, palette.mid, palette.low, palette.cloud, palette.surface];
        for (const background of backgrounds) {
          const muted = mix(background, palette.fg, MUTED_ALPHA);
          expect(contrast(palette.fg, background)).toBeGreaterThanOrEqual(AA_BODY);
          expect(contrast(muted, background)).toBeGreaterThanOrEqual(AA_BODY);
        }
      });
    }
  }
});

describe('conditionFromId', () => {
  it.each([
    [211, 'storm'],
    [301, 'rain'],
    [502, 'rain'],
    [601, 'snow'],
    [711, 'haze'],
    [781, 'storm'],
    [800, 'clear'],
    [803, 'clouds'],
  ] as const)('maps %i to %s', (id, expected) => {
    expect(conditionFromId(id)).toBe(expected);
  });
});

describe('phaseAt', () => {
  const sunrise = 6 * 3600;
  const sunset = 18 * 3600;
  it.each([
    [sunrise - 3600, 'night'],
    [sunrise - 600, 'dawn'],
    [sunrise + 1800, 'dawn'],
    [12 * 3600, 'day'],
    [sunset - 1800, 'dusk'],
    [sunset + 1200, 'dusk'],
    [sunset + 3600, 'night'],
  ] as const)('returns the right phase at %i', (now, expected) => {
    expect(phaseAt(now, sunrise, sunset)).toBe(expected);
  });
});
