/**
 * 环境：天空穹顶（渐变、日月、日蚀、星空、云）、光照与阴影、雾、环境贴图、环境粒子
 */
import * as THREE from 'three';
import type { CreateEnvironment, Environment, Quality, ThemeId } from '../contracts';
import { GLSL_NOISE } from './noise';
import { THEMES, type ParticleSpec, type ThemeConfig } from './themes';

const SHADOW_SIZE: Record<Quality, number> = { low: 1024, medium: 2048, high: 4096, ultra: 4096 };
const PARTICLE_SCALE: Record<Quality, number> = { low: 0, medium: 0.5, high: 0.8, ultra: 1 };

/* ------------------------------------------------------------------ */
/* 天空                                                                */
/* ------------------------------------------------------------------ */

export function createSkyMaterial(th: ThemeConfig): THREE.ShaderMaterial {
  const discMode = { none: 0, sun: 1, moon: 2, eclipse: 3 }[th.disc];
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(th.sky.top) },
      uHorizon: { value: new THREE.Color(th.sky.horizon) },
      uBottom: { value: new THREE.Color(th.sky.bottom) },
      uGlow: { value: new THREE.Color(th.sky.sunGlow) },
      uSunDir: { value: new THREE.Vector3(...th.sunDir).normalize() },
      uDisc: { value: discMode },
      uStars: { value: th.stars },
      uClouds: { value: th.clouds },
      uCloudColor: { value: new THREE.Color(th.cloudColor) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // 永远在最远处
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uGlow;
      uniform vec3 uSunDir; uniform float uDisc; uniform float uStars; uniform float uClouds;
      uniform vec3 uCloudColor; uniform float uTime;
      varying vec3 vDir;
      ${GLSL_NOISE}
      float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, h), 0.55)) : mix(uHorizon, uBottom, smoothstep(0.0, -0.25, h));
        float sd = dot(d, normalize(uSunDir));
        // 太阳光晕
        col += uGlow * (pow(max(sd, 0.0), 6.0) * 0.35 + pow(max(sd, 0.0), 48.0) * 0.6) * (uDisc > 0.5 ? 1.0 : 0.35);
        // 星空
        if (uStars > 0.0 && h > 0.0) {
          vec3 cell = floor(d * 220.0);
          float s = hash3(cell);
          float star = smoothstep(0.9965, 1.0, s) * (0.6 + 0.4 * sin(uTime * 2.0 + s * 100.0));
          col += vec3(0.85, 0.9, 1.0) * star * uStars * 2.5 * smoothstep(0.0, 0.25, h);
        }
        // 云
        if (uClouds > 0.0 && h > -0.02) {
          vec2 cp = d.xz / (h + 0.18) * 1.6 + vec2(uTime * 0.008, uTime * 0.004);
          float c = eo_fbm(cp);
          c = smoothstep(1.0 - uClouds * 0.75, 1.05, c + 0.15);
          float lit = 0.6 + 0.4 * max(sd, 0.0);
          vec3 cc = uCloudColor * lit + uGlow * pow(max(sd, 0.0), 4.0) * 0.4;
          col = mix(col, cc, c * smoothstep(-0.02, 0.15, h) * 0.85);
        }
        // 日月
        if (uDisc > 0.5 && uDisc < 1.5) {
          col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, sd) * 12.0;
        } else if (uDisc > 1.5 && uDisc < 2.5) {
          float m = smoothstep(0.9988, 0.9992, sd);
          float crater = eo_noise(d.xy * 900.0) * 0.25;
          col = mix(col, vec3(0.92, 0.95, 1.0) * (1.6 - crater), m);
          col += vec3(0.6, 0.7, 1.0) * pow(max(sd, 0.0), 220.0) * 0.8;
        } else if (uDisc > 2.5) {
          // 日蚀：黑色日轮与金色日冕
          float core = smoothstep(0.99835, 0.9985, sd);
          float ring = smoothstep(0.9975, 0.99835, sd) * (1.0 - core);
          float rays = pow(max(sd, 0.0), 30.0) * (0.6 + 0.4 * eo_noise(vec2(atan(d.x - uSunDir.x, d.y - uSunDir.y) * 8.0, uTime * 0.2)));
          col += vec3(1.0, 0.75, 0.35) * (ring * 9.0 + rays * 1.8);
          col = mix(col, vec3(0.0), core);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/* ------------------------------------------------------------------ */
/* 粒子                                                                */
/* ------------------------------------------------------------------ */

const KIND_ID: Record<ParticleSpec['kind'], number> = {
  embers: 0,
  leaves: 1,
  fireflies: 2,
  pollen: 3,
  snow: 4,
  rain: 5,
  ash: 6,
  motes: 7,
  spray: 8,
};

function createParticles(spec: ParticleSpec, size: { width: number; height: number }, quality: Quality): THREE.Points | null {
  const count = Math.floor(spec.count * PARTICLE_SCALE[quality]);
  if (count <= 0) return null;
  const pad = 6;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -pad + Math.random() * (size.width + pad * 2);
    pos[i * 3 + 1] = Math.random();
    pos[i * 3 + 2] = -pad + Math.random() * (size.height + pad * 2);
    seed[i * 4] = Math.random();
    seed[i * 4 + 1] = Math.random();
    seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const additive = ['embers', 'fireflies', 'pollen', 'motes', 'spray'].includes(spec.kind);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uKind: { value: KIND_ID[spec.kind] },
      uColor: { value: new THREE.Color(spec.color) },
      uSize: { value: spec.size },
      uScale: { value: 1 },
      uHeight: { value: spec.kind === 'rain' || spec.kind === 'snow' || spec.kind === 'ash' ? 9.0 : 5.0 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uKind; uniform float uSize; uniform float uScale; uniform float uHeight;
      varying float vAlpha; varying float vRot; varying vec4 vSeed;
      void main() {
        vec3 p = position;
        float t = uTime;
        float s = aSeed.x;
        float k = uKind;
        float y = 0.0;
        float alpha = 1.0;
        float size = uSize;
        if (k < 0.5) { // embers 上升
          float ph = fract(s + t * (0.08 + aSeed.y * 0.08));
          y = ph * uHeight;
          p.x += sin(t * 1.3 + s * 30.0) * 0.4 * ph;
          p.z += cos(t * 1.1 + s * 20.0) * 0.4 * ph;
          alpha = smoothstep(0.0, 0.1, ph) * (1.0 - ph) * (0.6 + 0.4 * sin(t * 12.0 + s * 50.0));
          size *= 6.0 + aSeed.z * 6.0;
        } else if (k < 1.5) { // leaves 飘落
          float ph = fract(s - t * (0.05 + aSeed.y * 0.04));
          y = ph * uHeight;
          p.x += sin(t * 0.9 + s * 30.0) * 1.2 + t * 0.3;
          p.z += cos(t * 0.7 + s * 20.0) * 0.8;
          alpha = smoothstep(0.0, 0.08, ph) * smoothstep(1.0, 0.85, ph);
          size *= 14.0 + aSeed.z * 8.0;
        } else if (k < 2.5) { // fireflies
          y = 0.3 + aSeed.y * 1.6 + sin(t * 0.8 + s * 10.0) * 0.3;
          p.x += sin(t * 0.5 + s * 40.0) * 0.6;
          p.z += cos(t * 0.4 + s * 30.0) * 0.6;
          alpha = pow(0.5 + 0.5 * sin(t * 2.5 + s * 60.0), 3.0);
          size *= 8.0;
        } else if (k < 3.5) { // pollen
          y = 0.3 + aSeed.y * 3.5 + sin(t * 0.3 + s * 10.0) * 0.4;
          p.x += sin(t * 0.2 + s * 40.0) * 1.0 + t * 0.05;
          p.z += cos(t * 0.25 + s * 30.0) * 1.0;
          alpha = 0.35 + 0.35 * sin(t * 1.5 + s * 60.0);
          size *= 5.0;
        } else if (k < 4.5) { // snow
          float ph = fract(s - t * (0.06 + aSeed.y * 0.05));
          y = ph * uHeight;
          p.x += sin(t * 0.8 + s * 30.0) * 0.5 + t * 0.6;
          p.z += cos(t * 0.6 + s * 20.0) * 0.4;
          alpha = smoothstep(0.0, 0.05, ph) * 0.9;
          size *= 7.0 + aSeed.z * 7.0;
        } else if (k < 5.5) { // rain
          float ph = fract(s - t * (0.9 + aSeed.y * 0.3));
          y = ph * uHeight;
          p.x += t * 0.8;
          alpha = 0.5;
          size *= 16.0;
        } else if (k < 6.5) { // ash
          float ph = fract(s - t * (0.025 + aSeed.y * 0.02));
          y = ph * uHeight;
          p.x += sin(t * 0.5 + s * 30.0) * 1.0 + t * 0.2;
          p.z += cos(t * 0.4 + s * 20.0) * 0.6;
          alpha = smoothstep(0.0, 0.05, ph) * 0.75;
          size *= 6.0 + aSeed.z * 6.0;
        } else if (k < 7.5) { // motes
          y = 0.4 + aSeed.y * 4.0 + sin(t * 0.4 + s * 10.0) * 0.6;
          p.x += sin(t * 0.3 + s * 40.0) * 0.8;
          p.z += cos(t * 0.35 + s * 30.0) * 0.8;
          alpha = pow(0.5 + 0.5 * sin(t * 1.2 + s * 60.0), 2.0) * 0.8;
          size *= 5.0;
        } else { // spray
          y = 0.1 + aSeed.y * 0.8;
          p.x += sin(t * 0.6 + s * 40.0) * 0.8 + t * 0.4;
          p.z += cos(t * 0.5 + s * 30.0) * 0.6;
          alpha = 0.25 * (0.5 + 0.5 * sin(t * 2.0 + s * 60.0));
          size *= 10.0;
        }
        // 水平方向循环，保证粒子留在场景内
        p.y = y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // 靠近镜头的粒子不要过大
        float ps = size * uScale / max(0.5, -mv.z);
        gl_PointSize = min(ps, uScale * 1.4);
        alpha *= smoothstep(1.5, 4.0, -mv.z);
        vAlpha = alpha;
        vRot = t * (aSeed.w - 0.5) * 4.0 + s * 6.28;
        vSeed = aSeed;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uKind;
      varying float vAlpha; varying float vRot; varying vec4 vSeed;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float a;
        vec3 col = uColor;
        if (uKind > 0.5 && uKind < 1.5) {
          // 叶片：旋转的椭圆
          float c = cos(vRot), s = sin(vRot);
          vec2 r = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
          a = smoothstep(0.5, 0.42, length(r * vec2(1.0, 2.2)));
          col *= 0.75 + 0.5 * vSeed.z;
        } else if (uKind > 4.5 && uKind < 5.5) {
          // 雨丝
          a = smoothstep(0.06, 0.0, abs(uv.x)) * smoothstep(0.5, 0.2, abs(uv.y));
        } else if (uKind > 5.5 && uKind < 6.5) {
          a = smoothstep(0.5, 0.3, length(uv * vec2(1.0, 1.6)));
          col *= 0.8 + 0.4 * vSeed.z;
        } else {
          float d = length(uv);
          a = smoothstep(0.5, 0.0, d);
          a = a * a;
          if (uKind < 0.5 || uKind > 6.5) col *= 2.2;
        }
        gl_FragColor = vec4(col, a * vAlpha);
        if (gl_FragColor.a < 0.01) discard;
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = `particles_${spec.kind}`;
  return pts;
}

/* ------------------------------------------------------------------ */
/* 环境                                                                */
/* ------------------------------------------------------------------ */

export const createEnvironment: CreateEnvironment = (renderer, scene, theme: ThemeId, size, quality): Environment => {
  const th = THEMES[theme];
  const cx = size.width / 2;
  const cz = size.height / 2;
  const group = new THREE.Group();
  group.name = 'environment';
  scene.add(group);

  // 天空
  const skyMat = createSkyMaterial(th);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), skyMat);
  sky.position.set(cx, 0, cz);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  group.add(sky);

  // 环境贴图：由天空生成
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial({ ...th, stars: 0 }));
  envScene.add(envSky);
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = 0.8;
  envSky.geometry.dispose();
  (envSky.material as THREE.Material).dispose();
  pmrem.dispose();

  // 雾
  scene.fog = new THREE.Fog(th.fog.color, th.fog.near, th.fog.far);
  scene.background = new THREE.Color(th.fog.color);

  // 光照
  const hemi = new THREE.HemisphereLight(th.hemi.sky, th.hemi.ground, th.hemi.intensity);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(th.sunColor, th.sunIntensity);
  const dir = new THREE.Vector3(...th.sunDir).normalize();
  // 阴影：太低的太阳会拉出过长影子，限制最小仰角
  const shadowDir = dir.clone();
  shadowDir.y = Math.max(shadowDir.y, 0.42);
  shadowDir.normalize();
  sun.position.set(cx + shadowDir.x * 40, shadowDir.y * 40, cz + shadowDir.z * 40);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  const half = Math.max(size.width, size.height) / 2 + 6;
  sun.shadow.mapSize.set(SHADOW_SIZE[quality], SHADOW_SIZE[quality]);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -half;
  sc.right = half;
  sc.top = half;
  sc.bottom = -half;
  sc.near = 1;
  sc.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  group.add(sun, sun.target);

  if (th.fill) {
    const fill = new THREE.DirectionalLight(th.fill.color, th.fill.intensity);
    fill.position.set(cx - dir.x * 30, 12, cz - dir.z * 30);
    fill.target.position.set(cx, 0, cz);
    group.add(fill, fill.target);
  }

  // 粒子
  const particles: THREE.Points[] = [];
  for (const p of th.particles) {
    const pts = createParticles(p, size, quality);
    if (pts) {
      particles.push(pts);
      group.add(pts);
    }
  }

  const tmp = new THREE.Vector2();
  return {
    sun,
    mood: { ...th.mood },
    update(dt, time, camera) {
      skyMat.uniforms.uTime.value = time;
      renderer.getDrawingBufferSize(tmp);
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 35;
      const scale = tmp.y / (2 * Math.tan((fov * Math.PI) / 360)) / 60;
      for (const p of particles) {
        const m = p.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = time;
        m.uniforms.uScale.value = scale;
      }
      // 天空跟随相机水平位置，避免靠近边缘
      sky.position.x = camera.position.x;
      sky.position.z = camera.position.z;
    },
    dispose() {
      scene.remove(group);
      sky.geometry.dispose();
      skyMat.dispose();
      envRT.dispose();
      for (const p of particles) {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      }
      scene.environment = null;
      scene.fog = null;
    },
  };
};
