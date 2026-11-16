/**
 * Copies the Meteocons this app uses into src/assets/icons, recoloured to
 * `currentColor` so every icon inherits the text colour of the sky it sits on.
 * Run once after upgrading @bybas/weather-icons:  node scripts/build-icons.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'node_modules/@bybas/weather-icons/production/line/all';
const TARGET = 'src/assets/icons';
const ICONS = [
  'clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night', 'cloudy', 'overcast',
  'drizzle', 'rain', 'thunderstorms', 'thunderstorms-rain', 'snow', 'sleet',
  'mist', 'fog', 'haze', 'smoke', 'dust', 'tornado', 'wind',
];

mkdirSync(TARGET, { recursive: true });
for (const name of ICONS) {
  const svg = readFileSync(`${SOURCE}/${name}.svg`, 'utf8')
    // Colour animations would fight currentColor, so drop them.
    .replace(/<animate attributeName="(stroke|fill)"[^>]*\/>/g, '')
    .replace(/(stroke|fill)="#[0-9a-fA-F]{3,8}"/g, '$1="currentColor"')
    // Icons are inlined together, so ids must not collide between files.
    .replace(/\bid="([^"]+)"/g, `id="${name}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${name}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${name}-$1"`)
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');
  writeFileSync(`${TARGET}/${name}.svg`, svg);
}
console.log(`Wrote ${ICONS.length} icons to ${TARGET}`);
