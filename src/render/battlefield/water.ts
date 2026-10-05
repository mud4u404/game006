/**
 * 水面与熔岩
 *  - 水：覆盖整个场景的一张平面，用深度贴图决定深浅色、透明度与岸边泡沫；法线扰动产生波纹
 *  - 熔岩：只铺在熔岩格上，流动的发光裂纹与暗色硬壳
 */
import * as THREE from 'three';
import type { Quality } from '../contracts';
import { LAVA_Y, WATER_Y, type TerrainField } from './field';
import { GLSL_NOISE } from './noise';
import type { ThemeConfig } from './themes';

export interface WaterMeshes {
  water: THREE.Mesh | null;
  lava: THREE.Mesh | null;
  update(time: number): void;
  dispose(): void;
}

export function buildWater(field: TerrainField, th: ThemeConfig, quality: Quality): WaterMeshes {
  const sk = field.skirt;
  const x0 = -sk;
  const z0 = -sk;
  const wTiles = field.W + sk * 2;
  const hTiles = field.H + sk * 2;
  const R = quality === 'low' ? 2 : 4; // 每格的深度贴图采样数

  // ---------- 深度贴图 ----------
  const tw = wTiles * R;
  const thh = hTiles * R;
  const data = new Uint8Array(tw * thh * 4);
  let anyWater = false;
  for (let j = 0; j < thh; j++) {
    for (let i = 0; i < tw; i++) {
      const wx = x0 + (i + 0.5) / R;
      const wz = z0 + (j + 0.5) / R;
      const depth = WATER_Y - field.ground(wx, wz);
      const k = (j * tw + i) * 4;
      const d = Math.max(0, Math.min(1, depth / 0.6));
      if (depth > 0) anyWater = true;
      data[k] = Math.round(d * 255);
      data[k + 1] = depth > 0 ? 255 : 0;
      data[k + 2] = 0;
      data[k + 3] = 255;
    }
  }
  const depthTex = new THREE.DataTexture(data, tw, thh, THREE.RGBAFormat);
  depthTex.magFilter = THREE.LinearFilter;
  depthTex.minFilter = THREE.LinearFilter;
  depthTex.needsUpdate = true;

  const uniforms = {
    uTime: { value: 0 },
    uDepth: { value: depthTex },
    uOrigin: { value: new THREE.Vector2(x0, z0) },
    uSize: { value: new THREE.Vector2(wTiles, hTiles) },
    uShallow: { value: new THREE.Color(th.water.shallow) },
    uDeep: { value: new THREE.Color(th.water.deep) },
  };

  let water: THREE.Mesh | null = null;
  let waterMat: THREE.MeshStandardMaterial | null = null;
  if (anyWater) {
    const geo = new THREE.PlaneGeometry(wTiles, hTiles, 1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(x0 + wTiles / 2, WATER_Y, z0 + hTiles / 2);
    waterMat = new THREE.MeshStandardMaterial({
      color: th.water.shallow,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      envMapIntensity: 1.2,
    });
    waterMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime; uniform sampler2D uDepth; uniform vec2 uOrigin; uniform vec2 uSize;
uniform vec3 uShallow; uniform vec3 uDeep;
varying vec3 vWPos;
${GLSL_NOISE}
float eo_depth(vec2 w) { return texture2D(uDepth, (w - uOrigin) / uSize).r; }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
float dep = eo_depth(vWPos.xz);
float deepMix = smoothstep(0.02, 0.55, dep);
diffuseColor.rgb = mix(uShallow, uDeep, deepMix);
// 岸边泡沫与涌浪
float shore = 1.0 - smoothstep(0.0, 0.12, dep);
float bands = 0.5 + 0.5 * sin(dep * 70.0 - uTime * 1.6 + eo_noise(vWPos.xz * 2.0) * 4.0);
float foam = shore * (0.55 + 0.45 * bands) * smoothstep(0.3, 0.7, eo_noise(vWPos.xz * 6.0 + uTime * 0.2));
foam = max(foam, smoothstep(0.035, 0.0, dep));
// 远处的白浪
float crest = smoothstep(0.78, 0.9, eo_fbm(vWPos.xz * 0.9 + vec2(uTime * 0.05, uTime * 0.03))) * deepMix * 0.35;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), clamp(foam + crest, 0.0, 1.0));
diffuseColor.a = mix(0.55, 0.9, smoothstep(0.0, 0.3, dep)) + foam * 0.3;
diffuseColor.a = clamp(diffuseColor.a, 0.0, 0.97);`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
{
  vec2 p = vWPos.xz;
  float e = 0.05;
  float t = uTime;
  float h0 = eo_fbm(p * 1.6 + vec2(t * 0.12, t * 0.08)) + 0.5 * eo_noise(p * 4.5 - vec2(t * 0.25, t * 0.1));
  float hx = eo_fbm((p + vec2(e, 0.0)) * 1.6 + vec2(t * 0.12, t * 0.08)) + 0.5 * eo_noise((p + vec2(e, 0.0)) * 4.5 - vec2(t * 0.25, t * 0.1));
  float hz = eo_fbm((p + vec2(0.0, e)) * 1.6 + vec2(t * 0.12, t * 0.08)) + 0.5 * eo_noise((p + vec2(0.0, e)) * 4.5 - vec2(t * 0.25, t * 0.1));
  vec3 wn = normalize(vec3(-(hx - h0) / e * 0.18, 1.0, -(hz - h0) / e * 0.18));
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}`,
        );
    };
    water = new THREE.Mesh(geo, waterMat);
    water.name = 'water';
    water.receiveShadow = true;
    water.renderOrder = 2;
  }

  // ---------- 熔岩 ----------
  let lava: THREE.Mesh | null = null;
  let lavaMat: THREE.MeshStandardMaterial | null = null;
  const lavaQuads: number[] = [];
  for (let ty = z0; ty < z0 + hTiles; ty++) {
    for (let tx = x0; tx < x0 + wTiles; tx++) {
      if (field.tile(tx, ty) === 'lava') lavaQuads.push(tx, ty);
    }
  }
  const lavaUniforms = { uTime: { value: 0 }, uLava: { value: new THREE.Color(th.lava) } };
  if (lavaQuads.length) {
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < lavaQuads.length; i += 2) {
      const g = new THREE.PlaneGeometry(1.3, 1.3, 1, 1);
      g.rotateX(-Math.PI / 2);
      g.translate(lavaQuads[i] + 0.5, LAVA_Y, lavaQuads[i + 1] + 0.5);
      geos.push(g);
    }
    const merged = mergeSimple(geos);
    lavaMat = new THREE.MeshStandardMaterial({ color: '#1a0a06', roughness: 0.7, emissive: '#000000' });
    lavaMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, lavaUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime; uniform vec3 uLava;
varying vec3 vWPos;
${GLSL_NOISE}`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
{
  vec2 p = vWPos.xz * 1.15;
  vec2 flow = vec2(uTime * 0.05, uTime * 0.03);
  float n = eo_fbm(p + flow + eo_fbm(p * 0.8 - flow) * 1.4);
  // 暗色熔岩壳 + 细而亮的熔流裂纹 + 偶尔的熔池
  float v = clamp(1.0 - abs(n - 0.5) * 2.0, 0.0, 1.0);
  float vein = pow(v, 7.0);
  float pool = smoothstep(0.6, 0.78, eo_fbm(p * 0.45 + flow * 0.4 + 3.1));
  float heat = clamp(vein + pool * 0.85, 0.0, 1.0);
  vec3 hotCol = mix(uLava * vec3(0.75, 0.12, 0.02), vec3(1.0, 0.42, 0.04), smoothstep(0.1, 0.6, heat));
  hotCol = mix(hotCol, vec3(1.0, 0.82, 0.35), pow(heat, 5.0));
  float pulse = 0.82 + 0.18 * sin(uTime * 2.2 + n * 12.0);
  totalEmissiveRadiance += hotCol * heat * 2.4 * pulse + uLava * 0.035;
  diffuseColor.rgb = mix(vec3(0.045, 0.028, 0.026), vec3(0.11, 0.05, 0.035), n);
}`,
        );
    };
    lava = new THREE.Mesh(merged, lavaMat);
    lava.name = 'lava';
  }

  return {
    water,
    lava,
    update(time: number) {
      uniforms.uTime.value = time;
      lavaUniforms.uTime.value = time;
    },
    dispose() {
      depthTex.dispose();
      water?.geometry.dispose();
      waterMat?.dispose();
      lava?.geometry.dispose();
      lavaMat?.dispose();
    },
  };
}

/** 合并只含 position/normal/uv 的简单几何体 */
export function mergeSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array as Float32Array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, vo * 2);
    if (g.index) {
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
      io += src.length;
    } else {
      for (let i = 0; i < n; i++) idx[io + i] = vo + i;
      io += n;
    }
    vo += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
