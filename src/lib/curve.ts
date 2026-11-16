export interface Point {
  x: number;
  y: number;
}

/**
 * SVG path through the points using monotone cubic interpolation
 * (Fritsch–Carlson). Unlike a Catmull-Rom spline it never overshoots, so the
 * curve cannot show a temperature higher or lower than any real reading.
 * Points must be ordered by increasing x.
 */
export function monotonePath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M${first.x},${first.y}`;

  const n = points.length;
  const widths: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const width = points[i + 1]!.x - points[i]!.x;
    widths.push(width);
    slopes.push((points[i + 1]!.y - points[i]!.y) / width);
  }

  // Tangent at each point: flat at local extremes, otherwise a weighted
  // harmonic mean of the neighbouring slopes.
  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) {
    const before = slopes[i - 1]!;
    const after = slopes[i]!;
    if (before * after <= 0) {
      tangents.push(0);
    } else {
      const w1 = 2 * widths[i]! + widths[i - 1]!;
      const w2 = widths[i]! + 2 * widths[i - 1]!;
      tangents.push((w1 + w2) / (w1 / before + w2 / after));
    }
  }
  tangents.push(slopes[n - 2]!);

  const r = (value: number) => Math.round(value * 100) / 100;
  let path = `M${r(first.x)},${r(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const third = widths[i]! / 3;
    path +=
      `C${r(a.x + third)},${r(a.y + tangents[i]! * third)}` +
      ` ${r(b.x - third)},${r(b.y - tangents[i + 1]! * third)}` +
      ` ${r(b.x)},${r(b.y)}`;
  }
  return path;
}
