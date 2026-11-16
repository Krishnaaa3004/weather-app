/** GLSL for the sky. Kept as plain strings so no build plugin is needed. */

export const backgroundVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // A full-screen quad drawn straight in clip space, behind everything.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const backgroundFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform float uStars;
  uniform float uFlash;
  uniform float uTime;
  varying vec2 vUv;

  // Hash without a large multiplier (Dave Hoskins' hash12). The classic
  // fract(sin(x) * 43758.5) loses its low bits in 32-bit floats, so it can
  // never return the near-1 values that the star threshold looks for.
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    // Same stops as the CSS fallback: horizon at 0, mid at 0.45, zenith at 1.
    vec3 colour = vUv.y < 0.45
      ? mix(uLow, uMid, vUv.y / 0.45)
      : mix(uMid, uTop, (vUv.y - 0.45) / 0.55);

    // Sparse stars in the upper sky, each twinkling at its own slow rate.
    vec2 cell = floor(gl_FragCoord.xy / 2.0);
    float seed = hash(cell);
    float star = step(0.9989, seed) * (0.55 + 0.45 * sin(uTime * 0.8 + seed * 600.0));
    colour += star * uStars * smoothstep(0.3, 0.8, vUv.y) * 0.7;

    // Sheet lightning: a dim swell of the whole upper sky, never a strobe.
    colour += uFlash * 0.07 * smoothstep(0.2, 1.0, vUv.y);

    // One step of noise hides banding in the dark gradients.
    colour += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(colour, 1.0);
  }
`;

export const cloudVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDistance;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const cloudFragment = /* glsl */ `
  precision mediump float;
  uniform sampler2D uNoise;
  uniform vec3 uColour;
  uniform float uCover;
  uniform float uOpacity;
  uniform float uDrift;
  uniform float uSeed;
  uniform float uFlash;
  varying vec2 vUv;
  varying float vDistance;

  void main() {
    vec2 p = vUv * vec2(8.0, 4.5) + uSeed;
    // Two octaves of a precomputed noise texture, drifting at different
    // speeds, cost two lookups per pixel instead of a procedural fbm.
    float shape = texture2D(uNoise, p * 0.5 + vec2(uDrift * 0.006, 0.0)).r * 0.64
                + texture2D(uNoise, p * 1.4 + vec2(uDrift * 0.011, uDrift * 0.003) + 0.37).r * 0.36;

    float threshold = mix(0.86, 0.2, uCover);
    float density = smoothstep(threshold - 0.16, threshold + 0.16, shape);

    // Layers dissolve as the camera reaches them and fade into haze far away.
    float near = smoothstep(0.5, 6.0, vDistance);
    float far = 1.0 - smoothstep(30.0, 50.0, vDistance);
    float edge = 1.0 - smoothstep(0.38, 0.5, length(vUv - 0.5));

    gl_FragColor = vec4(uColour + uFlash * 0.05, density * near * far * edge * uOpacity);
  }
`;

export const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uCameraZ;
  uniform float uFall;
  uniform float uWind;
  uniform float uSway;
  uniform float uSize;
  uniform float uProjection;
  varying float vFade;

  void main() {
    // "position" holds three random seeds in 0..1, not a place in space.
    vec3 seed = position;
    float x = fract(seed.x + uTime * uWind + sin(uTime * 0.3 + seed.z * 40.0) * uSway);
    float y = fract(seed.y - uTime * uFall * (0.6 + 0.4 * seed.z));
    // Wrapping depth around the camera makes particles stream past as it advances.
    float depth = mod(seed.z * 24.0 + uCameraZ, 24.0);

    vec4 viewPosition = viewMatrix * vec4((x - 0.5) * 46.0, (y - 0.5) * 28.0, uCameraZ - 1.5 - depth, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uSize * uProjection / -viewPosition.z;
    vFade = smoothstep(1.5, 4.0, -viewPosition.z) * (1.0 - smoothstep(17.0, 25.0, -viewPosition.z));
  }
`;

export const particleFragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uColour;
  uniform float uOpacity;
  uniform float uStreak;
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float flake = smoothstep(0.5, 0.05, length(c));
    // Rain: a thin, slightly slanted line inside the point sprite.
    float streak = smoothstep(0.035, 0.0, abs(c.x + c.y * 0.18)) * smoothstep(0.5, 0.2, abs(c.y));
    gl_FragColor = vec4(uColour, mix(flake, streak, uStreak) * uOpacity * vFade);
  }
`;
