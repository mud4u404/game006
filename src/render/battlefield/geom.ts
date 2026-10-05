/**
 * 几何体工具：带顶点色/染色标记的几何体构建与合并
 */
import * as THREE from 'three';

/** 给几何体写入统一的顶点色和染色权重（aTint：1 = 受实例颜色影响） */
export function paint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, tint = 0, ao = 0, aoHeight = 1): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  const n = geo.attributes.position.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3);
  const t = new Float32Array(n);
  const pos = geo.attributes.position;
  for (let i = 0; i < n; i++) {
    // 简单的高度环境光遮蔽：底部更暗
    const k = ao > 0 ? 1 - ao * (1 - Math.min(1, Math.max(0, pos.getY(i) / aoHeight))) : 1;
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
    t[i] = tint;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aTint', new THREE.BufferAttribute(t, 1));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

/** 合并带 position/normal/color/aTint 的非索引几何体 */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const tin = new Float32Array(n);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array as Float32Array, o * 3);
    else col.fill(1, o * 3, (o + c) * 3);
    if (g.attributes.aTint) tin.set(g.attributes.aTint.array as Float32Array, o);
    o += c;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('aTint', new THREE.BufferAttribute(tin, 1));
  out.computeBoundingSphere();
  return out;
}

/** 变换几何体（平移/旋转/缩放） */
export function xf(g: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  g.applyMatrix4(m);
  return g;
}

/** 顶点噪声位移（让岩石、树冠更自然） */
export function jitter(g: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const pos = g.attributes.position;
  const map = new Map<string, [number, number, number]>();
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647 - 0.5;
  };
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = map.get(key);
    if (!d) {
      d = [rnd() * amount, rnd() * amount, rnd() * amount];
      map.set(key, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  g.computeVertexNormals();
  return g;
}

/** 为使用 aTint 的材质注入「只对标记部分应用实例颜色」以及风吹摇摆 */
export function patchPropMaterial(m: THREE.MeshStandardMaterial, uniforms: { uTime: { value: number } }, sway: number) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aTint;
uniform float uTime;`,
      )
      .replace(
        '#include <color_vertex>',
        `vColor = vec4(1.0);
#ifdef USE_COLOR
vColor.rgb = color.rgb;
#endif
#ifdef USE_INSTANCING_COLOR
vColor.rgb = mix(vColor.rgb, vColor.rgb * instanceColor.rgb, aTint);
#endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec2 ip = instanceMatrix[3].xz;
  float hgt = max(0.0, transformed.y);
  float w = ${sway.toFixed(3)} * hgt * hgt;
  transformed.x += sin(uTime * 1.6 + ip.x * 0.7 + ip.y * 0.3) * w;
  transformed.z += cos(uTime * 1.3 + ip.y * 0.6) * w * 0.6;
}
#endif`,
      );
  };
  m.customProgramCacheKey = () => `prop_${sway}`;
}
