/**
 * 地表网格与材质
 *  - 顶点色按地形混合（与高度同样的平台插值）
 *  - 着色器中叠加：噪声细节、坡度岩石、石板铺装纹理、道路车辙、灰烬火星、积雪闪光
 */
import * as THREE from 'three';
import type { Quality, TerrainId } from '../contracts';
import type { TerrainField } from './field';
import { fbm, GLSL_NOISE } from './noise';
import type { ThemeConfig } from './themes';

const SUBDIV: Record<Quality, number> = { low: 3, medium: 5, high: 6, ultra: 8 };

/** 地形的地表颜色 */
function tileColor(t: TerrainId, th: ThemeConfig, n: number, out: THREE.Color): THREE.Color {
  const g0 = new THREE.Color(th.ground[0]);
  const g1 = new THREE.Color(th.ground[1]);
  const ground = g0.lerp(g1, n);
  switch (t) {
    case 'road':
      return out.set(th.dirt).lerp(new THREE.Color(th.sand), 0.25);
    case 'forest':
      return out.copy(ground).multiplyScalar(0.72).lerp(new THREE.Color(th.dirt), 0.2);
    case 'hill':
      return out.copy(ground).lerp(new THREE.Color(th.dirt), 0.25);
    case 'mountain':
    case 'cliff':
      return out.set(th.rock);
    case 'peak':
      return out.set(th.rock).lerp(new THREE.Color('#ffffff'), 0.15);
    case 'water':
      return out.set(th.water.deep).lerp(new THREE.Color(th.dirt), 0.35);
    case 'shallow':
    case 'bridge':
    case 'deck':
      return out.set(th.sand).lerp(new THREE.Color(th.dirt), 0.35);
    case 'sand':
      return out.set(th.sand);
    case 'snow':
      return out.set('#f2f6fc');
    case 'lava':
      return out.set('#2a1a16');
    case 'ash':
      return out.set('#3a3434');
    case 'floor':
    case 'wall':
    case 'pillar':
    case 'gate':
    case 'throne':
    case 'stairs':
      return out.set(th.floor);
    case 'village':
    case 'house':
      return out.copy(ground).lerp(new THREE.Color(th.dirt), 0.45);
    case 'fort':
    case 'ruins':
      return out.set(th.dirt).lerp(new THREE.Color(th.floor), 0.4);
    default:
      return out.copy(ground);
  }
}

/** 材质标记：x 铺装，y 道路，z 灰烬，w 积雪 */
function tileMat(t: TerrainId, th: ThemeConfig): [number, number, number, number] {
  const snow = th.snowCover;
  switch (t) {
    case 'floor':
    case 'wall':
    case 'pillar':
    case 'gate':
    case 'throne':
    case 'stairs':
      return [1, 0, 0, snow * 0.4];
    case 'road':
      return [0, 1, 0, snow * 0.5];
    case 'ash':
    case 'lava':
      return [0, 0, 1, 0];
    case 'snow':
      return [0, 0, 0, 1];
    case 'water':
    case 'shallow':
    case 'bridge':
    case 'deck':
      return [0, 0, 0, 0];
    case 'fort':
    case 'ruins':
      return [0.5, 0.3, 0, snow * 0.6];
    default:
      return [0, 0, 0, snow];
  }
}

export interface TerrainMeshes {
  ground: THREE.Mesh;
  overlay: THREE.BufferGeometry;
  dispose(): void;
}

export function buildTerrain(field: TerrainField, th: ThemeConfig, quality: Quality): TerrainMeshes {
  const S = SUBDIV[quality];
  const sk = field.skirt;
  const x0 = -sk;
  const z0 = -sk;
  const nx = (field.W + sk * 2) * S;
  const nz = (field.H + sk * 2) * S;
  const vx = nx + 1;
  const vz = nz + 1;
  const pos = new Float32Array(vx * vz * 3);
  const col = new Float32Array(vx * vz * 3);
  const mat = new Float32Array(vx * vz * 4);

  // 预先计算每个格子的颜色与材质（含外延）
  const tw = field.W + sk * 2 + 2;
  const th2 = field.H + sk * 2 + 2;
  const tColor = new Float32Array(tw * th2 * 3);
  const tMat = new Float32Array(tw * th2 * 4);
  const c = new THREE.Color();
  for (let ty = 0; ty < th2; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const gx = tx + x0 - 1;
      const gy = ty + z0 - 1;
      const t = field.tile(gx, gy);
      const n = fbm(gx * 0.35, gy * 0.35, field.seed + 21, 2);
      tileColor(t, th, n, c);
      // 地图外的景观略微压暗，突出棋盘
      const out = field.outside(gx + 0.5, gy + 0.5);
      if (out > 0) c.multiplyScalar(1 - Math.min(0.25, out * 0.03));
      const i = (ty * tw + tx) * 3;
      tColor[i] = c.r;
      tColor[i + 1] = c.g;
      tColor[i + 2] = c.b;
      const m = tileMat(t, th);
      tMat.set(m, (ty * tw + tx) * 4);
    }
  }
  const sm = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const sample = (wx: number, wz: number, arr: Float32Array, stride: number, out: number[]) => {
    const gx = wx - 0.5 - x0 + 1;
    const gz = wz - 0.5 - z0 + 1;
    const ix = Math.max(0, Math.min(tw - 2, Math.floor(gx)));
    const iz = Math.max(0, Math.min(th2 - 2, Math.floor(gz)));
    const u = sm(0.2, 0.8, gx - ix);
    const v = sm(0.2, 0.8, gz - iz);
    for (let k = 0; k < stride; k++) {
      const a = arr[(iz * tw + ix) * stride + k];
      const b = arr[(iz * tw + ix + 1) * stride + k];
      const cc = arr[((iz + 1) * tw + ix) * stride + k];
      const d = arr[((iz + 1) * tw + ix + 1) * stride + k];
      out[k] = a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
    }
  };

  const tmp3 = [0, 0, 0];
  const tmp4 = [0, 0, 0, 0];
  for (let j = 0; j < vz; j++) {
    for (let i = 0; i < vx; i++) {
      const wx = x0 + i / S;
      const wz = z0 + j / S;
      const k = j * vx + i;
      pos[k * 3] = wx;
      pos[k * 3 + 1] = field.ground(wx, wz);
      pos[k * 3 + 2] = wz;
      sample(wx, wz, tColor, 3, tmp3);
      col[k * 3] = tmp3[0];
      col[k * 3 + 1] = tmp3[1];
      col[k * 3 + 2] = tmp3[2];
      sample(wx, wz, tMat, 4, tmp4);
      mat[k * 4] = tmp4[0];
      mat[k * 4 + 1] = tmp4[1];
      mat[k * 4 + 2] = tmp4[2];
      mat[k * 4 + 3] = tmp4[3];
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let p = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * vx + i;
      const b = a + 1;
      const d = a + vx;
      const e = d + 1;
      // 交替对角线，减少方向性伪影
      if ((i + j) % 2 === 0) {
        idx.set([a, d, b, b, d, e], p);
      } else {
        idx.set([a, d, e, a, e, b], p);
      }
      p += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aMat', new THREE.BufferAttribute(mat, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const material = createGroundMaterial(th);
  const ground = new THREE.Mesh(geo, material);
  ground.receiveShadow = true;
  ground.castShadow = quality === 'high' || quality === 'ultra';
  ground.name = 'terrain';

  const overlay = buildOverlayGeometry(field, Math.max(4, S));

  return {
    ground,
    overlay,
    dispose() {
      geo.dispose();
      material.dispose();
      overlay.dispose();
    },
  };
}

/** 覆盖层网格：贴合可站立面 */
function buildOverlayGeometry(field: TerrainField, S: number): THREE.BufferGeometry {
  const nx = field.W * S;
  const nz = field.H * S;
  const vx = nx + 1;
  const vz = nz + 1;
  const pos = new Float32Array(vx * vz * 3);
  const uv = new Float32Array(vx * vz * 2);
  for (let j = 0; j < vz; j++) {
    for (let i = 0; i < vx; i++) {
      const wx = i / S;
      const wz = j / S;
      const k = j * vx + i;
      pos[k * 3] = wx;
      pos[k * 3 + 1] = field.walk(Math.min(field.W - 0.001, wx), Math.min(field.H - 0.001, wz)) + 0.025;
      pos[k * 3 + 2] = wz;
      uv[k * 2] = wx / field.W;
      uv[k * 2 + 1] = wz / field.H;
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let p = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * vx + i;
      idx.set([a, a + vx, a + 1, a + 1, a + vx, a + vx + 1], p);
      p += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

function createGroundMaterial(th: ThemeConfig): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const uniforms = {
    uRock: { value: new THREE.Color(th.rock) },
    uDirt: { value: new THREE.Color(th.dirt) },
    uFloor: { value: new THREE.Color(th.floor) },
    uEmber: { value: new THREE.Color(th.lava) },
    uTime: { value: 0 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 aMat;
varying vec4 vMat;
varying vec3 vWPos;
varying vec3 vWNormal;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vMat = aMat;
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uRock; uniform vec3 uDirt; uniform vec3 uFloor; uniform vec3 uEmber; uniform float uTime;
varying vec4 vMat;
varying vec3 vWPos;
varying vec3 vWNormal;
${GLSL_NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec2 p = vWPos.xz;
  float n1 = eo_fbm(p * 2.7);
  float n2 = eo_noise(p * 11.0);
  // 基础细节 + 大尺度色块（干草/阴湿处）
  float patchN = eo_fbm(p * 0.35 + 3.1);
  diffuseColor.rgb *= 0.86 + 0.26 * n1 + 0.06 * (n2 - 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.06, 0.82), smoothstep(0.55, 0.75, patchN) * 0.55);
  diffuseColor.rgb *= mix(0.86, 1.0, smoothstep(0.2, 0.45, patchN));
  // 坡度岩石
  float slope = 1.0 - clamp(vWNormal.y, 0.0, 1.0);
  float rockMix = smoothstep(0.32, 0.55, slope + (n1 - 0.5) * 0.25);
  vec3 rock = uRock * (0.75 + 0.45 * eo_fbm(p * 5.0 + vWPos.y * 2.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, rock, rockMix);
  // 石板铺装
  if (vMat.x > 0.01) {
    vec2 q = p * 2.0;
    q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 f = fract(q);
    float grout = smoothstep(0.0, 0.06, f.x) * smoothstep(1.0, 0.94, f.x) * smoothstep(0.0, 0.06, f.y) * smoothstep(1.0, 0.94, f.y);
    float stoneVar = 0.82 + 0.3 * eo_hash(floor(q));
    vec3 paved = uFloor * stoneVar * mix(0.45, 1.0, grout) * (0.9 + 0.2 * n2);
    diffuseColor.rgb = mix(diffuseColor.rgb, paved, clamp(vMat.x, 0.0, 1.0));
  }
  // 道路车辙与碎石
  if (vMat.y > 0.01) {
    float pebble = smoothstep(0.72, 0.8, eo_noise(p * 18.0));
    vec3 road = diffuseColor.rgb * (0.92 + 0.15 * eo_noise(p * 6.0)) + vec3(0.06) * pebble;
    diffuseColor.rgb = mix(diffuseColor.rgb, road, vMat.y);
  }
  // 积雪
  if (vMat.w > 0.01) {
    float flatK = smoothstep(0.55, 0.85, vWNormal.y);
    float sn = clamp(vMat.w * flatK * (0.75 + 0.5 * n1), 0.0, 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 1.0) * (0.92 + 0.1 * n2), sn);
  }
}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor - vMat.x * 0.25 * eo_noise(vWPos.xz * 3.0) - vMat.w * 0.2, 0.3, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
if (vMat.z > 0.01) {
  float e = smoothstep(0.82, 0.92, eo_noise(vWPos.xz * 9.0 + vec2(0.0, uTime * 0.05)));
  float pulse = 0.6 + 0.4 * sin(uTime * 2.0 + eo_hash(floor(vWPos.xz * 9.0)) * 6.28);
  totalEmissiveRadiance += uEmber * e * pulse * 2.5 * vMat.z;
}`,
      );
  };
  m.userData.uniforms = uniforms;
  return m;
}
