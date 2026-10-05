/**
 * 卡通着色（三阶色调 + 轮廓光）与反向外壳描边
 * 每个单位持有自己的材质实例，以便单独控制「已行动变灰」「受击闪光」「淡出」。
 */
import * as THREE from 'three';

let gradientTex: THREE.DataTexture | null = null;

/** 三阶明暗的渐变贴图 */
export function toonGradient(): THREE.DataTexture {
  if (gradientTex) return gradientTex;
  const steps = [70, 150, 215, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  gradientTex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  gradientTex.minFilter = THREE.NearestFilter;
  gradientTex.magFilter = THREE.NearestFilter;
  gradientTex.generateMipmaps = false;
  gradientTex.needsUpdate = true;
  return gradientTex;
}

export interface UnitUniforms {
  uDesat: { value: number };
  uFlash: { value: THREE.Color };
  uFlashAmt: { value: number };
  uRim: { value: THREE.Color };
  uOpacity: { value: number };
}

export function createUnitUniforms(rim: THREE.ColorRepresentation): UnitUniforms {
  return {
    uDesat: { value: 0 },
    uFlash: { value: new THREE.Color(1, 1, 1) },
    uFlashAmt: { value: 0 },
    uRim: { value: new THREE.Color(rim) },
    uOpacity: { value: 1 },
  };
}

/** 卡通材质：顶点色 + 三阶明暗 + 轮廓光 + 变灰 + 闪光 */
export function createToonMaterial(u: UnitUniforms, opts: { metal?: boolean; emissive?: boolean } = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vViewN;`)
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>\nvViewN = normalize(transformedNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uDesat; uniform vec3 uFlash; uniform float uFlashAmt; uniform vec3 uRim; uniform float uOpacity;
varying vec3 vViewN;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * vec3(0.78, 0.8, 0.86), uDesat);
  diffuseColor.a *= uOpacity;
}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  // 轮廓光：让小人在复杂地形上依然醒目
  float rim = pow(1.0 - clamp(dot(normalize(vViewN), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += uRim * rim * 0.35 * (1.0 - uDesat * 0.7);
  totalEmissiveRadiance += uFlash * uFlashAmt;
  ${opts.metal ? 'totalEmissiveRadiance += diffuseColor.rgb * pow(rim, 0.5) * 0.15;' : ''}
}`,
      );
  };
  m.customProgramCacheKey = () => `unit_toon_${opts.metal ? 1 : 0}`;
  return m;
}

/** 反向外壳描边材质：沿平滑法线外扩 */
export function createOutlineMaterial(u: UnitUniforms, thickness: number, color: THREE.ColorRepresentation = '#1a120e'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uThick: { value: thickness },
      uOpacity: u.uOpacity,
      uDesat: u.uDesat,
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSmoothN;
      uniform float uThick;
      void main() {
        vec3 p = position + normalize(aSmoothN) * uThick;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uDesat;
      void main() {
        gl_FragColor = vec4(mix(uColor, vec3(0.18), uDesat * 0.5), uOpacity);
      }`,
  });
}

/** 计算按位置平均的平滑法线（用于描边外扩，避免硬边处裂开） */
export function addSmoothNormals(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const map = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${pos.getX(i).toFixed(4)}|${pos.getY(i).toFixed(4)}|${pos.getZ(i).toFixed(4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let v = map.get(k);
    if (!v) {
      v = new THREE.Vector3();
      map.set(k, v);
    }
    v.x += nor.getX(i);
    v.y += nor.getY(i);
    v.z += nor.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = map.get(key(i))!;
    const l = v.length() || 1;
    out[i * 3] = v.x / l;
    out[i * 3 + 1] = v.y / l;
    out[i * 3 + 2] = v.z / l;
  }
  g.setAttribute('aSmoothN', new THREE.BufferAttribute(out, 3));
  return g;
}
