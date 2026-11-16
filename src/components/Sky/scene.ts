import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ColorManagement,
  DataTexture,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import type { ParticleKind, SkySceneParams } from '../../lib/sky';
import {
  backgroundFragment,
  backgroundVertex,
  cloudFragment,
  cloudVertex,
  particleFragment,
  particleVertex,
} from './shaders';

// Colours are authored in sRGB and must match the CSS gradient exactly, so
// three.js is told not to convert them to linear space.
ColorManagement.enabled = false;

export type Quality = 'high' | 'low';

interface QualitySettings {
  layers: number;
  particles: number;
  /** Multiplier on CSS pixels. Clouds are soft, so rendering below 1× is invisible and cheap. */
  pixelRatio: number;
}

const QUALITY: Record<Quality, QualitySettings> = {
  high: { layers: 8, particles: 700, pixelRatio: Math.min(window.devicePixelRatio, 1.25) },
  low: { layers: 5, particles: 260, pixelRatio: 0.75 },
};

/** Phones, and laptops with few cores or little memory, get the lighter scene. */
export function pickQuality(): Quality {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const fewCores = (navigator.hardwareConcurrency ?? 4) <= 4;
  const touchFirst = window.matchMedia('(pointer: coarse)').matches;
  return touchFirst || fewCores || (memory !== undefined && memory <= 4) ? 'low' : 'high';
}

interface ParticleLook {
  fall: number;
  wind: number;
  sway: number;
  size: number;
  streak: number;
  opacity: number;
  /** Share of the particle budget this kind uses. */
  share: number;
}

const PARTICLES: Record<Exclude<ParticleKind, 'none'>, ParticleLook> = {
  rain: { fall: 1.3, wind: 0.02, sway: 0, size: 0.8, streak: 1, opacity: 0.2, share: 1 },
  snow: { fall: 0.1, wind: 0.008, sway: 0.012, size: 0.22, streak: 0, opacity: 0.8, share: 0.6 },
  haze: { fall: 0.006, wind: 0.01, sway: 0.02, size: 2.2, streak: 0, opacity: 0.1, share: 0.35 },
};

const FIELD_OF_VIEW = 55;
const LAYER_SPACING = 6.5;
/** How far the camera travels over the full length of the page. */
const CAMERA_TRAVEL = 26;

/** A tileable greyscale fbm texture, generated once on the CPU. */
function createNoiseTexture(size = 256): DataTexture {
  const lattice = (period: number) => {
    const values = new Float32Array(period * period);
    for (let i = 0; i < values.length; i++) values[i] = Math.random();
    return values;
  };
  const octaves = [4, 8, 16, 32].map((period) => ({ period, values: lattice(period) }));
  const smooth = (t: number) => t * t * (3 - 2 * t);

  const field = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let amplitude = 0.5;
      for (const { period, values } of octaves) {
        const fx = (x / size) * period;
        const fy = (y / size) * period;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = smooth(fx - x0);
        const ty = smooth(fy - y0);
        // Wrapping the lattice index is what makes the texture tile seamlessly.
        const at = (ix: number, iy: number) => values[(iy % period) * period + (ix % period)]!;
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        sum += (top + (bottom - top) * ty) * amplitude;
        amplitude *= 0.5;
      }
      field[y * size + x] = sum;
      min = Math.min(min, sum);
      max = Math.max(max, sum);
    }
  }

  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < field.length; i++) {
    const value = Math.round(((field[i]! - min) / (max - min)) * 255);
    pixels.set([value, value, value, 255], i * 4);
  }
  const texture = new DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Frame-rate independent easing toward a target. */
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * The living sky: a gradient, cloud layers at increasing depth, and a
 * particle field. It owns its render loop and reads scroll position itself,
 * so React only tells it which sky to aim for.
 */
export class SkyScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 80);
  private readonly background: ShaderMaterial;
  private readonly clouds: ShaderMaterial[] = [];
  private readonly particleMaterial: ShaderMaterial;
  private readonly particleGeometry = new BufferGeometry();
  private readonly noise = createNoiseTexture();
  private readonly settings: QualitySettings;

  private target: SkySceneParams | null = null;
  private hasSnapped = false;
  private particleKind: ParticleKind = 'none';
  private particleFade = 0;
  private drift = Math.random() * 100;
  private time = 0;
  private flash = 0;
  private nextFlashAt = 6;
  private frame = 0;
  private lastFrameAt = 0;
  private hasRendered = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    quality: Quality,
    private readonly onFirstFrame: () => void,
  ) {
    this.settings = QUALITY[quality];
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(this.settings.pixelRatio);

    this.background = new ShaderMaterial({
      vertexShader: backgroundVertex,
      fragmentShader: backgroundFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color() },
        uMid: { value: new Color() },
        uLow: { value: new Color() },
        uStars: { value: 0 },
        uFlash: { value: 0 },
        uTime: { value: 0 },
      },
    });
    const backdrop = new Mesh(new PlaneGeometry(2, 2), this.background);
    backdrop.frustumCulled = false;
    backdrop.renderOrder = -1;
    this.scene.add(backdrop);

    const plane = new PlaneGeometry(220, 124);
    for (let i = 0; i < this.settings.layers; i++) {
      const material = new ShaderMaterial({
        vertexShader: cloudVertex,
        fragmentShader: cloudFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uNoise: { value: this.noise },
          uColour: { value: new Color() },
          uCover: { value: 0 },
          uOpacity: { value: 0 },
          uDrift: { value: 0 },
          uSeed: { value: i * 7.31 },
          uFlash: { value: 0 },
        },
      });
      const layer = new Mesh(plane, material);
      layer.position.set((i % 2 ? 1 : -1) * 6, (i % 3) * 3 - 3, -5 - i * LAYER_SPACING);
      this.clouds.push(material);
      this.scene.add(layer);
    }

    const seeds = new Float32Array(this.settings.particles * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    this.particleGeometry.setAttribute('position', new BufferAttribute(seeds, 3));
    this.particleMaterial = new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCameraZ: { value: 0 },
        uFall: { value: 0 },
        uWind: { value: 0 },
        uSway: { value: 0 },
        uSize: { value: 1 },
        uStreak: { value: 0 },
        uOpacity: { value: 0 },
        uProjection: { value: 1 },
        uColour: { value: new Color() },
      },
    });
    const points = new Points(this.particleGeometry, this.particleMaterial);
    points.frustumCulled = false;
    this.scene.add(points);

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.frame = requestAnimationFrame(this.render);
  }

  /** Aims the scene at a new sky. Values ease there over a couple of seconds. */
  setTarget(params: SkySceneParams): void {
    this.target = params;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.traverse((object) => {
      if (object instanceof Mesh || object instanceof Points) {
        object.geometry.dispose();
        (object.material as ShaderMaterial).dispose();
      }
    });
    this.noise.dispose();
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Converts a particle's size in world units to pixels at distance 1.
    const drawingHeight = height * this.settings.pixelRatio;
    this.particleMaterial.uniforms.uProjection!.value =
      drawingHeight / (2 * Math.tan((FIELD_OF_VIEW * Math.PI) / 360));
  };

  /** No point drawing a sky nobody can see. */
  private readonly onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (document.visibilityState === 'visible') {
      this.lastFrameAt = 0;
      this.frame = requestAnimationFrame(this.render);
    }
  };

  private readonly render = (timestamp: number): void => {
    this.frame = requestAnimationFrame(this.render);
    const dt = this.lastFrameAt ? Math.min(0.1, (timestamp - this.lastFrameAt) / 1000) : 0.016;
    this.lastFrameAt = timestamp;
    this.time += dt;

    const target = this.target;
    if (!target) return;
    // The first sky appears as it is; only later changes ease in.
    const rate = this.hasSnapped ? 1.4 : 1000;
    this.hasSnapped = true;

    const { palette } = target;
    const background = this.background.uniforms;
    (background.uTop!.value as Color).lerp(new Color(palette.top), 1 - Math.exp(-rate * dt));
    (background.uMid!.value as Color).lerp(new Color(palette.mid), 1 - Math.exp(-rate * dt));
    (background.uLow!.value as Color).lerp(new Color(palette.low), 1 - Math.exp(-rate * dt));
    background.uStars!.value = approach(background.uStars!.value as number, target.stars, rate, dt);
    background.uTime!.value = this.time;

    this.updateLightning(target.lightning, dt);
    background.uFlash!.value = this.flash;

    this.drift += dt * target.wind;
    const cloudColour = new Color(palette.cloud);
    for (const material of this.clouds) {
      const uniforms = material.uniforms;
      (uniforms.uColour!.value as Color).lerp(cloudColour, 1 - Math.exp(-rate * dt));
      uniforms.uCover!.value = approach(uniforms.uCover!.value as number, target.cloudCover, rate, dt);
      uniforms.uOpacity!.value = approach(uniforms.uOpacity!.value as number, target.cloudOpacity, rate, dt);
      uniforms.uDrift!.value = this.drift;
      uniforms.uFlash!.value = this.flash;
    }

    // Scroll position is the camera's position along the cloud layers.
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
    this.camera.position.z = approach(this.camera.position.z, -progress * CAMERA_TRAVEL, 6, dt);

    this.updateParticles(target, dt);
    this.renderer.render(this.scene, this.camera);

    if (!this.hasRendered) {
      this.hasRendered = true;
      this.onFirstFrame();
    }
  };

  private updateLightning(active: boolean, dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 0.9);
    if (!active) return;
    if (this.time >= this.nextFlashAt) {
      this.flash = 1;
      this.nextFlashAt = this.time + 9 + Math.random() * 14;
    }
  }

  /** Particles fade out fully before changing kind, so rain never morphs into snow. */
  private updateParticles(target: SkySceneParams, dt: number): void {
    const uniforms = this.particleMaterial.uniforms;
    const changing = target.particles !== this.particleKind;
    this.particleFade = approach(this.particleFade, changing ? 0 : 1, 3, dt);

    if (changing && this.particleFade < 0.02) {
      this.particleKind = target.particles;
      if (this.particleKind !== 'none') {
        const look = PARTICLES[this.particleKind];
        uniforms.uFall!.value = look.fall;
        uniforms.uWind!.value = look.wind;
        uniforms.uSway!.value = look.sway;
        uniforms.uSize!.value = look.size;
        uniforms.uStreak!.value = look.streak;
        this.particleGeometry.setDrawRange(0, Math.floor(this.settings.particles * look.share));
      }
    }

    const look = this.particleKind === 'none' ? null : PARTICLES[this.particleKind];
    uniforms.uOpacity!.value = (look?.opacity ?? 0) * this.particleFade;
    uniforms.uTime!.value = this.time;
    uniforms.uCameraZ!.value = this.camera.position.z;
    (uniforms.uColour!.value as Color).set(
      this.particleKind === 'haze' ? target.palette.cloud : target.palette.ink === 'dark' ? '#ffffff' : target.palette.fg,
    );
  }
}
