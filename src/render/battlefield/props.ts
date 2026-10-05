/**
 * 植被与岩石：实例化的树、草丛、花、灌木、岩石、山峰
 * 摆放规则：可站立格的中心保持空旷（单位站在那里），装饰物分布在格子边缘。
 */
import * as THREE from 'three';
import type { Quality, TerrainId } from '../contracts';
import type { TerrainField } from './field';
import { jitter, merge, paint, patchPropMaterial, xf } from './geom';
import { Prng } from './noise';
import type { ThemeConfig, TreeKind } from './themes';

const DENSITY: Record<Quality, number> = { low: 0.3, medium: 0.6, high: 0.85, ultra: 1 };

/* ------------------------------------------------------------------ */
/* 模板几何体                                                          */
/* ------------------------------------------------------------------ */

function trunk(h: number, r: number, color: string) {
  return paint(xf(new THREE.CylinderGeometry(r * 0.7, r, h, 7, 1), 0, h / 2, 0), color, 0, 0.4, h);
}

function broadleaf(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [trunk(0.42, 0.055, '#5a3e2a')];
  const rng = new Prng(seed);
  const blobs = 4;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rng.range(0, 1);
    const r = i === 0 ? 0 : 0.14;
    const s = i === 0 ? 0.32 : rng.range(0.2, 0.26);
    const g = jitter(new THREE.IcosahedronGeometry(1, 1), 0.18, seed + i * 7);
    xf(g, Math.cos(a) * r, 0.62 + (i === 0 ? 0.12 : rng.range(-0.04, 0.06)), Math.sin(a) * r, 0, s, s * 0.85, s);
    parts.push(paint(g, '#ffffff', 1, 0.45, 1.0));
  }
  return merge(parts);
}

function conifer(seed: number, snowy: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [trunk(0.3, 0.05, '#4a3424')];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const r = 0.3 - i * 0.06;
    const h = 0.34 - i * 0.03;
    const g = jitter(new THREE.ConeGeometry(r, h, 9, 1), 0.02, seed + i);
    xf(g, 0, 0.32 + i * 0.17 + h / 2, 0, i * 0.4);
    const pg = paint(g, '#ffffff', 1, 0.35, 1.1);
    if (snowy) {
      // 朝上的面覆盖积雪
      const nor = pg.attributes.normal;
      const col = pg.attributes.color;
      const tin = pg.attributes.aTint;
      for (let k = 0; k < nor.count; k++) {
        if (nor.getY(k) > 0.62 && (k % 3 !== 0)) {
          col.setXYZ(k, 0.95, 0.97, 1.0);
          tin.setX(k, 0);
        }
      }
    }
    parts.push(pg);
  }
  return merge(parts);
}

function deadTree(seed: number): THREE.BufferGeometry {
  const rng = new Prng(seed);
  const parts: THREE.BufferGeometry[] = [trunk(0.75, 0.06, '#2e2420')];
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2);
    const len = rng.range(0.2, 0.35);
    const g = new THREE.CylinderGeometry(0.012, 0.025, len, 5);
    xf(g, 0, len / 2, 0);
    xf(g, 0, 0, 0, a, 1, 1, 1, 0, rng.range(0.6, 1.1));
    xf(g, 0, rng.range(0.35, 0.65), 0);
    parts.push(paint(g, '#2e2420', 0));
  }
  return merge(parts);
}

function grassTuft(seed: number): THREE.BufferGeometry {
  const rng = new Prng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const h = rng.range(0.1, 0.2);
    const w = 0.025;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array([-w, 0, 0, w, 0, 0, 0, h, 0.02]);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.computeVertexNormals();
    const a = (i / blades) * Math.PI * 2 + rng.range(-0.3, 0.3);
    xf(g, Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04, -a, 1, 1, 1, rng.range(-0.25, 0.25));
    const pg = paint(g, '#ffffff', 1, 0.5, 0.2);
    // 双面：再加一份翻转法线
    const back = pg.clone();
    const n = back.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, -n.getX(k), -n.getY(k), -n.getZ(k));
    const idxSwap = back.attributes.position;
    const tmp = [idxSwap.getX(0), idxSwap.getY(0), idxSwap.getZ(0)];
    idxSwap.setXYZ(0, idxSwap.getX(1), idxSwap.getY(1), idxSwap.getZ(1));
    idxSwap.setXYZ(1, tmp[0], tmp[1], tmp[2]);
    parts.push(pg, back);
  }
  return merge(parts);
}

function flower(): THREE.BufferGeometry {
  const stem = paint(xf(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), 0, 0.06, 0), '#3a6a2a', 0);
  const head = paint(xf(new THREE.OctahedronGeometry(0.03, 0), 0, 0.13, 0), '#ffffff', 1);
  return merge([stem, head]);
}

function bush(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const g = jitter(new THREE.IcosahedronGeometry(1, 1), 0.2, seed + i);
    const a = (i / 3) * Math.PI * 2;
    xf(g, Math.cos(a) * 0.08, 0.1, Math.sin(a) * 0.08, 0, 0.14, 0.11, 0.14);
    parts.push(paint(g, '#ffffff', 1, 0.5, 0.25));
  }
  return merge(parts);
}

function rock(seed: number): THREE.BufferGeometry {
  const g = jitter(new THREE.IcosahedronGeometry(1, 1), 0.35, seed);
  xf(g, 0, 0.25, 0, 0, 0.5, 0.42, 0.5);
  return paint(g, '#ffffff', 1, 0.35, 0.5);
}

function spire(seed: number, snowCap: boolean): THREE.BufferGeometry {
  const g = jitter(new THREE.ConeGeometry(0.5, 1.4, 7, 4), 0.14, seed);
  xf(g, 0, 0.7, 0);
  const pg = paint(g, '#ffffff', 1, 0.3, 1.4);
  if (snowCap) {
    const pos = pg.attributes.position;
    const col = pg.attributes.color;
    const tin = pg.attributes.aTint;
    const nor = pg.attributes.normal;
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) > 0.95 || (nor.getY(k) > 0.6 && pos.getY(k) > 0.6)) {
        col.setXYZ(k, 0.94, 0.96, 1);
        tin.setX(k, 0);
      }
    }
  }
  return pg;
}

/* ------------------------------------------------------------------ */
/* 摆放                                                                */
/* ------------------------------------------------------------------ */

interface Batch {
  geo: THREE.BufferGeometry;
  mats: THREE.Matrix4[];
  colors: THREE.Color[];
  sway: number;
  shadow: boolean;
}

export interface PropMeshes {
  group: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

/** 格子中心是否需要保持空旷 */
function walkable(t: TerrainId): boolean {
  return !['wall', 'pillar', 'house', 'peak', 'cliff', 'water'].includes(t);
}

export function buildProps(field: TerrainField, th: ThemeConfig, quality: Quality): PropMeshes {
  const dens = DENSITY[quality];
  const rng = new Prng(field.seed * 31 + 7);
  const group = new THREE.Group();
  group.name = 'props';
  const uniforms = { uTime: { value: 0 } };

  // 模板（每种 3 个变体）
  const treeTemplates: Record<TreeKind, THREE.BufferGeometry[]> = {
    broadleaf: [broadleaf(11), broadleaf(23), broadleaf(37)],
    autumn: [broadleaf(41), broadleaf(53), broadleaf(67)],
    conifer: [conifer(5, false), conifer(9, false), conifer(13, false)],
    snowpine: [conifer(5, true), conifer(9, true), conifer(13, true)],
    dead: [deadTree(3), deadTree(17), deadTree(29)],
  };
  const batches = new Map<string, Batch>();
  const add = (key: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, rot: number, s: number, color: THREE.Color, sway: number, shadow = true, sy = s) => {
    let b = batches.get(key);
    if (!b) {
      b = { geo, mats: [], colors: [], sway, shadow };
      batches.set(key, b);
    }
    b.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, sy, s)));
    b.colors.push(color);
  };

  const foliage = th.foliage.map((c) => new THREE.Color(c));
  const rockCol = new THREE.Color(th.rock);
  const grassBase = new THREE.Color(th.ground[0]).lerp(new THREE.Color('#ffffff'), 0.08);
  const flowerCols = th.flowers.map((c) => new THREE.Color(c));
  const grassGeo = [grassTuft(1), grassTuft(2)];
  const flowerGeo = flower();
  const bushGeos = [bush(3), bush(8)];
  const rockGeos = [rock(4), rock(9), rock(15)];
  const spireGeos = [spire(2, th.snowCover > 0.3), spire(6, th.snowCover > 0.3), spire(10, true)];

  const sk = field.skirt;
  const placeTree = (x: number, z: number, scale: number, idx: number) => {
    const kind = th.trees[idx % th.trees.length];
    const v = rng.int(0, 2);
    const col = foliage[rng.int(0, foliage.length - 1)].clone().multiplyScalar(rng.range(0.85, 1.12));
    if (kind === 'dead') col.set('#ffffff');
    add(`tree_${kind}_${v}`, treeTemplates[kind][v], x, field.ground(x, z) - 0.02, z, rng.range(0, 6.28), scale, col, kind === 'dead' ? 0.01 : 0.035);
  };

  for (let ty = -sk; ty < field.H + sk; ty++) {
    for (let tx = -sk; tx < field.W + sk; tx++) {
      const t = field.tile(tx, ty);
      const inside = field.inside(tx, ty);
      const out = field.outside(tx + 0.5, ty + 0.5);
      // 远处的装饰稀疏一些
      const farFactor = out > 6 ? 0.5 : 1;
      const cx = tx + 0.5;
      const cz = ty + 0.5;
      // 边缘位置（避开中心半径 0.28）
      const edgePos = (): [number, number] => {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(0.3, 0.46);
        return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
      };
      const anyPos = (): [number, number] => [cx + rng.range(-0.45, 0.45), cz + rng.range(-0.45, 0.45)];
      const pos = () => (inside && walkable(t) ? edgePos() : anyPos());

      switch (t) {
        case 'forest': {
          const n = inside ? rng.int(2, 3) : Math.round(rng.int(2, 4) * farFactor);
          for (let i = 0; i < n; i++) {
            const [x, z] = pos();
            placeTree(x, z, rng.range(0.85, 1.25) * (inside ? 1 : 1.2), rng.int(0, 9));
          }
          if (rng.next() < 0.6 * dens) {
            const [x, z] = pos();
            add(`bush_${0}`, bushGeos[0], x, field.ground(x, z), z, rng.range(0, 6), rng.range(0.8, 1.3), foliage[0].clone().multiplyScalar(0.9), 0.02);
          }
          break;
        }
        case 'plain':
        case 'hill':
        case 'village':
        case 'fort': {
          if (th.grass > 0) {
            const n = Math.round(rng.range(2, 6) * th.grass * dens * farFactor);
            for (let i = 0; i < n; i++) {
              const [x, z] = pos();
              const col = grassBase.clone().multiplyScalar(rng.range(0.75, 1.15));
              add(`grass_${i % 2}`, grassGeo[i % 2], x, field.ground(x, z), z, rng.range(0, 6.28), rng.range(0.8, 1.4), col, 0.9, false);
            }
          }
          if (flowerCols.length && rng.next() < 0.45 * dens) {
            const n = rng.int(1, 4);
            for (let i = 0; i < n; i++) {
              const [x, z] = pos();
              add('flower', flowerGeo, x, field.ground(x, z), z, 0, rng.range(0.8, 1.2), flowerCols[rng.int(0, flowerCols.length - 1)].clone(), 0.6, false);
            }
          }
          if (!inside && rng.next() < 0.08 && th.trees.length) {
            const [x, z] = anyPos();
            placeTree(x, z, rng.range(0.9, 1.3), rng.int(0, 9));
          }
          if (t === 'hill' || rng.next() < 0.06 * dens) {
            const n = t === 'hill' ? rng.int(1, 2) : 1;
            for (let i = 0; i < n; i++) {
              const [x, z] = pos();
              add(`rock_${i % 3}`, rockGeos[i % 3], x, field.ground(x, z) - 0.05, z, rng.range(0, 6), rng.range(0.25, 0.45), rockCol.clone().multiplyScalar(rng.range(0.85, 1.15)), 0);
            }
          }
          break;
        }
        case 'mountain': {
          const n = inside ? rng.int(2, 3) : rng.int(1, 2);
          for (let i = 0; i < n; i++) {
            const [x, z] = pos();
            const s = rng.range(0.45, 0.75) * (inside ? 1 : 1.4);
            add(`spire_${i % 2}`, spireGeos[i % 2], x, field.ground(x, z) - 0.1, z, rng.range(0, 6), s, rockCol.clone().multiplyScalar(rng.range(0.85, 1.1)), 0, true, s * rng.range(0.8, 1.3));
          }
          for (let i = 0; i < 2; i++) {
            const [x, z] = pos();
            add(`rock_${i}`, rockGeos[i], x, field.ground(x, z) - 0.04, z, rng.range(0, 6), rng.range(0.3, 0.5), rockCol.clone(), 0);
          }
          break;
        }
        case 'peak':
        case 'cliff': {
          const s = rng.range(0.9, 1.3) * (inside ? 1 : 1.5);
          add('spire_2', spireGeos[2], cx + rng.range(-0.1, 0.1), field.ground(cx, cz) - 0.2, cz + rng.range(-0.1, 0.1), rng.range(0, 6), s, rockCol.clone(), 0, true, s * rng.range(1.0, 1.6));
          const [x, z] = anyPos();
          add('spire_0', spireGeos[0], x, field.ground(x, z) - 0.1, z, rng.range(0, 6), s * 0.6, rockCol.clone().multiplyScalar(0.9), 0);
          break;
        }
        case 'shallow':
        case 'sand': {
          if (rng.next() < 0.3 * dens) {
            const [x, z] = pos();
            if (t === 'shallow') add('grass_0', grassGeo[0], x, field.ground(x, z), z, 0, rng.range(1.2, 1.8), new THREE.Color('#7a8a4a'), 0.6, false);
            else add(`rock_2`, rockGeos[2], x, field.ground(x, z) - 0.05, z, rng.range(0, 6), rng.range(0.15, 0.3), new THREE.Color(th.sand).multiplyScalar(0.85), 0);
          }
          break;
        }
        case 'ash':
        case 'snow':
        case 'ruins': {
          if (rng.next() < 0.5 * dens) {
            const [x, z] = pos();
            add(`rock_${rng.int(0, 2)}`, rockGeos[rng.int(0, 2)], x, field.ground(x, z) - 0.05, z, rng.range(0, 6), rng.range(0.2, 0.4), rockCol.clone().multiplyScalar(0.8), 0);
          }
          if (!inside && th.trees.includes('dead') && rng.next() < 0.15) {
            const [x, z] = anyPos();
            placeTree(x, z, rng.range(0.9, 1.3), 0);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // 生成 InstancedMesh
  const materials: THREE.MeshStandardMaterial[] = [];
  const meshes: THREE.InstancedMesh[] = [];
  const matCache = new Map<number, THREE.MeshStandardMaterial>();
  const getMat = (sway: number) => {
    let m = matCache.get(sway);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: sway > 0.5 ? THREE.DoubleSide : THREE.FrontSide });
      patchPropMaterial(m, uniforms, sway > 0.5 ? 0.25 : sway);
      matCache.set(sway, m);
      materials.push(m);
    }
    return m;
  };
  for (const [, b] of batches) {
    const im = new THREE.InstancedMesh(b.geo, getMat(b.sway), b.mats.length);
    for (let i = 0; i < b.mats.length; i++) {
      im.setMatrixAt(i, b.mats[i]);
      im.setColorAt(i, b.colors[i]);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = b.shadow && quality !== 'low';
    im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
    meshes.push(im);
  }

  const allGeos = new Set<THREE.BufferGeometry>([
    ...Object.values(treeTemplates).flat(),
    ...grassGeo,
    flowerGeo,
    ...bushGeos,
    ...rockGeos,
    ...spireGeos,
  ]);
  return {
    group,
    update(time) {
      uniforms.uTime.value = time;
    },
    dispose() {
      for (const g of allGeos) g.dispose();
      for (const m of materials) m.dispose();
      for (const im of meshes) im.dispose();
    },
  };
}
