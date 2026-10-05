/**
 * 建筑与人造物：民居、村庄、城墙与塔楼、城门、石柱、王座、营寨、废墟、台阶、桥、码头、宝箱、火盆
 */
import * as THREE from 'three';
import type { ChestSpec, Quality, TerrainId } from '../contracts';
import { BRIDGE_Y, DECK_Y, type TerrainField } from './field';
import { merge, paint, xf } from './geom';
import { GLSL_NOISE, Prng } from './noise';
import { THEMES, type ThemeConfig } from './themes';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

export interface StructureMeshes {
  group: THREE.Group;
  chests: Map<string, { lid: THREE.Object3D; open: boolean; t: number }>;
  update(dt: number, time: number): void;
  openChest(x: number, y: number): void;
  dispose(): void;
}

/** 石材：三向投影的砖缝纹理 */
function stoneMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos; varying vec3 vWN;`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos; varying vec3 vWN;\n${GLSL_NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec3 an = abs(vWN);
  vec2 uv = an.y > 0.6 ? vWPos.xz * vec2(2.5, 2.5) : (an.x > an.z ? vec2(vWPos.z * 2.5, vWPos.y * 5.0) : vec2(vWPos.x * 2.5, vWPos.y * 5.0));
  uv.x += step(1.0, mod(floor(uv.y), 2.0)) * 0.5;
  vec2 f = fract(uv);
  float g = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x) * smoothstep(0.0, 0.1, f.y) * smoothstep(1.0, 0.9, f.y);
  float v = 0.85 + 0.28 * eo_hash(floor(uv)) + 0.12 * (eo_fbm(vWPos.xz * 6.0 + vWPos.y * 3.0) - 0.5);
  diffuseColor.rgb *= v * mix(0.55, 1.0, g);
  // 底部的苔藓与污渍
  diffuseColor.rgb *= mix(0.75, 1.0, smoothstep(0.0, 0.5, vWPos.y));
}`,
      );
  };
  return m;
}

/** 木材：顺纹理的条纹 */
function woodMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\n${GLSL_NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb *= 0.82 + 0.3 * eo_noise(vec2(vWPos.x * 40.0 + vWPos.z * 3.0, vWPos.y * 6.0 + vWPos.z * 40.0));`,
      );
  };
  return m;
}

export function buildStructures(field: TerrainField, th: ThemeConfig, quality: Quality, chests: ChestSpec[]): StructureMeshes {
  const rng = new Prng(field.seed * 13 + 3);
  const group = new THREE.Group();
  group.name = 'structures';
  const stone: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];
  const plain: THREE.BufferGeometry[] = [];
  const glow: THREE.BufferGeometry[] = [];
  const metal: THREE.BufferGeometry[] = [];
  const flames: THREE.Vector3[] = [];
  const night = ['night_fort', 'castle', 'temple', 'volcano', 'eclipse', 'port_town', 'dusk_road'].includes(themeKey(th));

  const wallCol = new THREE.Color(th.wallStone);
  const sk = field.skirt;
  const isT = (x: number, y: number, ...ts: TerrainId[]) => ts.includes(field.tile(x, y));

  // ---------- 民居 ----------
  const house = (cx: number, cz: number, gy: number, rot: number, scale: number, village: boolean) => {
    const w = 0.72 * scale;
    const d = 0.6 * scale;
    const h = 0.42 * scale;
    const roofCol = new THREE.Color(rng.pick(th.roof)).multiplyScalar(rng.range(0.85, 1.1));
    const plaster = new THREE.Color(th.plaster).multiplyScalar(rng.range(0.9, 1.05));
    const beam = '#3a2a20';
    const parts: THREE.BufferGeometry[] = [];
    const woods: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    parts.push(paint(xf(box(w, h, d), 0, h / 2, 0), plaster, 0, 0.25, h));
    // 木构架
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) woods.push(paint(xf(box(0.05, h, 0.05), (sx * w) / 2, h / 2, (sz * d) / 2), beam));
    woods.push(paint(xf(box(w + 0.02, 0.04, d + 0.02), 0, h * 0.55, 0), beam));
    // 山墙与屋顶
    const rh = 0.3 * scale;
    const gable = new THREE.BufferGeometry();
    const gv = new Float32Array([-w / 2, h, d / 2, w / 2, h, d / 2, 0, h + rh, d / 2, w / 2, h, -d / 2, -w / 2, h, -d / 2, 0, h + rh, -d / 2]);
    gable.setAttribute('position', new THREE.BufferAttribute(gv, 3));
    gable.computeVertexNormals();
    parts.push(paint(gable, plaster, 0));
    const slope = Math.atan2(rh, w / 2);
    const len = Math.hypot(rh, w / 2) + 0.08;
    for (const s of [-1, 1]) {
      const r = xf(box(len, 0.05, d + 0.14), 0, 0, 0);
      xf(r, 0, 0, 0, 0, 1, 1, 1, 0, s * slope);
      xf(r, (s * w) / 4 + s * 0.01, h + rh / 2 + 0.02, 0);
      parts.push(paint(r, roofCol, 0));
    }
    // 烟囱
    if (rng.next() < 0.7) parts.push(paint(xf(box(0.09, 0.26, 0.09), w * 0.22, h + rh * 0.7, -d * 0.18), '#6a5a52'));
    // 门与窗
    woods.push(paint(xf(box(0.14, 0.24, 0.03), 0, 0.12, d / 2 + 0.01), '#4a3020'));
    const winCol = night ? '#ffc070' : '#ffe2a8';
    for (const sx of [-1, 1]) {
      glows.push(paint(xf(new THREE.PlaneGeometry(0.1, 0.1), sx * w * 0.3, h * 0.62, d / 2 + 0.012), winCol));
      glows.push(paint(xf(new THREE.PlaneGeometry(0.1, 0.1), sx * w * 0.3, h * 0.62, -d / 2 - 0.012, Math.PI), winCol));
    }
    if (village) {
      // 灯笼柱、招牌、栅栏
      woods.push(paint(xf(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), w / 2 + 0.06, 0.25, d / 2 + 0.12), beam));
      glows.push(paint(xf(box(0.07, 0.09, 0.07), w / 2 + 0.06, 0.48, d / 2 + 0.12), '#ffb050'));
      woods.push(paint(xf(box(0.2, 0.12, 0.02), -w / 2 - 0.04, 0.32, d / 2 + 0.1), '#7a5434'));
      woods.push(paint(xf(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5), -w / 2 - 0.04, 0.18, d / 2 + 0.1), beam));
    }
    const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, gy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(1, 1, 1));
    for (const g of parts) plain.push(g.applyMatrix4(m));
    for (const g of woods) wood.push(g.applyMatrix4(m));
    for (const g of glows) glow.push(g.applyMatrix4(m));
  };

  // ---------- 火盆 ----------
  const brazier = (x: number, z: number) => {
    const gy = field.walk(x, z);
    metal.push(paint(xf(new THREE.CylinderGeometry(0.02, 0.03, 0.36, 6), x, gy + 0.18, z), '#3a3434'));
    metal.push(paint(xf(new THREE.CylinderGeometry(0.11, 0.06, 0.08, 10), x, gy + 0.38, z), '#4a403a'));
    flames.push(new THREE.Vector3(x, gy + 0.42, z));
  };
  const brazierSpots: [number, number][] = [];

  for (let ty = -sk; ty < field.H + sk; ty++) {
    for (let tx = -sk; tx < field.W + sk; tx++) {
      const t = field.tile(tx, ty);
      const inside = field.inside(tx, ty);
      const cx = tx + 0.5;
      const cz = ty + 0.5;
      const gy = field.ground(cx, cz);
      const out = field.outside(cx, cz);
      if (out > 8) continue;
      switch (t) {
        case 'house':
          house(cx + rng.range(-0.05, 0.05), cz + rng.range(-0.05, 0.05), gy, (rng.int(0, 3) * Math.PI) / 2, rng.range(1.05, 1.25), false);
          break;
        case 'village':
          house(cx - 0.12, cz - 0.24, gy, 0, 0.82, true);
          break;
        case 'wall': {
          const nH = isT(tx - 1, ty, 'wall', 'gate') || isT(tx + 1, ty, 'wall', 'gate');
          const nV = isT(tx, ty - 1, 'wall', 'gate') || isT(tx, ty + 1, 'wall', 'gate');
          const tower = (nH && nV) || (!nH && !nV);
          const hgt = tower ? 1.45 : 1.05;
          const tw = tower ? 1.0 : 1.0;
          const c = wallCol.clone().multiplyScalar(rng.range(0.9, 1.05));
          stone.push(paint(xf(box(tw, hgt, tw), cx, gy + hgt / 2, cz), c, 0, 0.2, 1));
          // 城垛
          const top = gy + hgt;
          const mer = 0.16;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const r = 0.42;
            stone.push(paint(xf(box(mer, 0.16, mer), cx + Math.cos(a) * r, top + 0.08, cz + Math.sin(a) * r), c));
          }
          if (tower && inside) {
            const roof = paint(xf(new THREE.ConeGeometry(0.62, 0.55, 4), cx, top + 0.42, cz, Math.PI / 4), rng.pick(th.roof));
            plain.push(roof);
          }
          if (th.braziers && inside) {
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
              const nx = tx + dx;
              const ny = ty + dy;
              if (field.inside(nx, ny) && !isT(nx, ny, 'wall', 'gate', 'house', 'water', 'pillar') && rng.next() < 0.18) {
                brazierSpots.push([nx + 0.5 - dx * 0.38 + (rng.next() - 0.5) * 0.3, ny + 0.5 - dy * 0.38]);
              }
            }
          }
          break;
        }
        case 'gate': {
          const ew = isT(tx - 1, ty, 'wall') || isT(tx + 1, ty, 'wall');
          const c = wallCol.clone().multiplyScalar(0.95);
          for (const s of [-1, 1]) {
            const px = ew ? cx + s * 0.44 : cx;
            const pz = ew ? cz : cz + s * 0.44;
            stone.push(paint(xf(box(ew ? 0.14 : 1, 1.25, ew ? 1 : 0.14), px, gy + 0.62, pz), c));
          }
          stone.push(paint(xf(box(ew ? 1.02 : 1, 0.32, ew ? 1 : 1.02), cx, gy + 1.12, cz), c));
          // 吊起的铁闸
          metal.push(paint(xf(box(ew ? 0.84 : 0.05, 0.22, ew ? 0.05 : 0.84), cx, gy + 0.95, cz), '#2e2c2c'));
          if (th.braziers) {
            brazierSpots.push(ew ? [cx - 0.36, cz + 0.62] : [cx + 0.62, cz - 0.36]);
            brazierSpots.push(ew ? [cx + 0.36, cz + 0.62] : [cx + 0.62, cz + 0.36]);
          }
          break;
        }
        case 'pillar': {
          const c = wallCol.clone().multiplyScalar(1.05);
          stone.push(paint(xf(box(0.56, 0.14, 0.56), cx, gy + 0.07, cz), c));
          stone.push(paint(xf(new THREE.CylinderGeometry(0.17, 0.2, 1.25, 12), cx, gy + 0.76, cz), c, 0, 0.2, 1.3));
          stone.push(paint(xf(box(0.5, 0.12, 0.5), cx, gy + 1.44, cz), c));
          if (th.braziers && (themeKey(th) === 'temple' || themeKey(th) === 'eclipse')) {
            glow.push(paint(xf(new THREE.TorusGeometry(0.19, 0.012, 6, 24), cx, gy + 0.6, cz, 0, 1, 1, 1, Math.PI / 2), themeKey(th) === 'eclipse' ? '#c080ff' : '#ff9a40'));
          }
          break;
        }
        case 'throne': {
          if (!inside) break;
          stone.push(paint(xf(box(0.98, 0.14, 0.98), cx, gy + 0.07, cz), wallCol.clone().multiplyScalar(1.1)));
          stone.push(paint(xf(box(0.8, 0.1, 0.8), cx, gy + 0.19, cz), wallCol.clone().multiplyScalar(1.15)));
          plain.push(paint(xf(box(0.36, 0.012, 0.9), cx, gy + 0.245, cz + 0.05), '#8a1a20'));
          // 宝座在格子后方
          const tc = '#6a1418';
          plain.push(paint(xf(box(0.34, 0.12, 0.22), cx, gy + 0.32, cz - 0.32), tc));
          plain.push(paint(xf(box(0.34, 0.6, 0.06), cx, gy + 0.55, cz - 0.42), tc));
          metal.push(paint(xf(box(0.4, 0.08, 0.08), cx, gy + 0.88, cz - 0.42), '#d8a840'));
          metal.push(paint(xf(new THREE.OctahedronGeometry(0.06), cx, gy + 0.98, cz - 0.42), '#e8c050'));
          break;
        }
        case 'fort': {
          // 木栅营寨：三面围栏、旗杆
          for (let i = 0; i < 9; i++) {
            const s = -0.44 + i * 0.11;
            for (const [px, pz] of [
              [cx + s, cz - 0.45],
              [cx - 0.45, cz + s],
              [cx + 0.45, cz + s],
            ] as const) {
              if (Math.abs(pz - cz) > 0.4 && i % 2 === 1) continue;
              const h = 0.34 + rng.range(-0.04, 0.04);
              wood.push(paint(xf(new THREE.CylinderGeometry(0.035, 0.04, h, 6), px, field.ground(px, pz) + h / 2, pz), '#6a4a30'));
            }
          }
          wood.push(paint(xf(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), cx + 0.38, gy + 0.4, cz - 0.38), '#4a3424'));
          plain.push(paint(xf(new THREE.PlaneGeometry(0.26, 0.16), cx + 0.25, gy + 0.68, cz - 0.38), '#a8282c'));
          break;
        }
        case 'ruins': {
          for (let i = 0; i < 2; i++) {
            const a = rng.range(0, Math.PI * 2);
            const px = cx + Math.cos(a) * 0.36;
            const pz = cz + Math.sin(a) * 0.36;
            const h = rng.range(0.2, 0.6);
            stone.push(paint(xf(new THREE.CylinderGeometry(0.13, 0.15, h, 10), px, field.ground(px, pz) + h / 2, pz, 0, 1, 1, 1, rng.range(-0.1, 0.1)), wallCol));
          }
          for (let i = 0; i < 3; i++) {
            const a = rng.range(0, Math.PI * 2);
            const px = cx + Math.cos(a) * 0.38;
            const pz = cz + Math.sin(a) * 0.38;
            stone.push(paint(xf(box(0.16, 0.1, 0.12), px, field.ground(px, pz) + 0.04, pz, rng.range(0, 3), 1, 1, 1, rng.range(-0.3, 0.3)), wallCol.clone().multiplyScalar(0.85)));
          }
          break;
        }
        case 'stairs': {
          for (let i = 0; i < 3; i++) {
            stone.push(paint(xf(box(0.96, 0.05 * (i + 1), 0.32), cx, gy + 0.025 * (i + 1), cz + 0.32 - i * 0.32), wallCol.clone().multiplyScalar(1.05)));
          }
          break;
        }
        case 'bridge': {
          const alongX = !isT(tx - 1, ty, 'water', 'shallow') || !isT(tx + 1, ty, 'water', 'shallow');
          const pathAlongX = alongX && (isT(tx, ty - 1, 'water', 'shallow') || isT(tx, ty + 1, 'water', 'shallow'));
          const y = BRIDGE_Y;
          for (let i = 0; i < 7; i++) {
            const o = -0.43 + i * 0.143;
            const g = pathAlongX ? box(0.13, 0.05, 1.0) : box(1.0, 0.05, 0.13);
            wood.push(paint(xf(g, pathAlongX ? cx + o : cx, y - 0.02, pathAlongX ? cz : cz + o), new THREE.Color('#8a6440').multiplyScalar(rng.range(0.85, 1.1))));
          }
          for (const s of [-1, 1]) {
            const rx = pathAlongX ? cx : cx + s * 0.48;
            const rz = pathAlongX ? cz + s * 0.48 : cz;
            wood.push(paint(xf(box(pathAlongX ? 1.0 : 0.05, 0.05, pathAlongX ? 0.05 : 1.0), rx, y + 0.22, rz), '#6a4a30'));
            for (const q of [-0.45, 0, 0.45]) {
              wood.push(paint(xf(box(0.06, 0.6, 0.06), pathAlongX ? rx + q : rx, y - 0.05, pathAlongX ? rz : rz + q), '#5a3e28'));
            }
          }
          break;
        }
        case 'deck': {
          const y = DECK_Y;
          for (let i = 0; i < 6; i++) {
            const o = -0.42 + i * 0.168;
            wood.push(paint(xf(box(1.0, 0.05, 0.155), cx, y - 0.02, cz + o), new THREE.Color('#7a5a3a').multiplyScalar(rng.range(0.85, 1.1))));
          }
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) wood.push(paint(xf(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), cx + sx * 0.44, y - 0.38, cz + sz * 0.44), '#4a3424'));
          if (rng.next() < 0.25) {
            const a = rng.int(0, 3);
            const px = cx + (a % 2 ? 0.32 : -0.32);
            const pz = cz + (a > 1 ? 0.32 : -0.32);
            if (rng.next() < 0.5) wood.push(paint(xf(box(0.22, 0.22, 0.22), px, y + 0.11, pz, rng.range(0, 1)), '#8a6a44'));
            else wood.push(paint(xf(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 10), px, y + 0.13, pz), '#6a4a2e'));
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // 火盆（数量受画质限制）
  const maxBraziers = { low: 4, medium: 8, high: 12, ultra: 16 }[quality];
  const chosen: [number, number][] = [];
  for (const s of brazierSpots) {
    if (chosen.length >= maxBraziers) break;
    if (chosen.some((c) => Math.hypot(c[0] - s[0], c[1] - s[1]) < 2.5)) continue;
    chosen.push(s);
    brazier(s[0], s[1]);
  }

  // ---------- 合成网格 ----------
  const disposables: { dispose(): void }[] = [];
  const addMesh = (geos: THREE.BufferGeometry[], mat: THREE.Material, shadow = true) => {
    if (!geos.length) return;
    const g = merge(geos);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    disposables.push(g, mat);
  };
  addMesh(stone, stoneMaterial());
  addMesh(wood, woodMaterial());
  addMesh(plain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
  addMesh(metal, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 }));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  glowMat.color.setScalar(night ? 3.2 : 1.4);
  addMesh(glow, glowMat, false);

  // 火焰（实例化，着色器内闪烁）
  const flameUniforms = { uTime: { value: 0 } };
  if (flames.length) {
    const fg = new THREE.ConeGeometry(0.075, 0.26, 8, 1, true);
    fg.translate(0, 0.13, 0);
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 1.8, 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    fm.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = flameUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float ph = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7;
float fl = 0.85 + 0.25 * sin(uTime * 13.0 + ph) + 0.1 * sin(uTime * 23.0 + ph * 2.0);
transformed.y *= fl;
transformed.x += sin(uTime * 7.0 + ph + transformed.y * 10.0) * 0.02 * transformed.y * 4.0;`,
      );
    };
    const im = new THREE.InstancedMesh(fg, fm, flames.length);
    flames.forEach((p, i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    disposables.push(fg, fm);
    // 少量点光源
    const lights = { low: 0, medium: 2, high: 4, ultra: 4 }[quality];
    const cx0 = field.W / 2;
    const cz0 = field.H / 2;
    const sorted = [...flames].sort((a, b) => Math.hypot(a.x - cx0, a.z - cz0) - Math.hypot(b.x - cx0, b.z - cz0));
    for (let i = 0; i < Math.min(lights, sorted.length); i++) {
      const l = new THREE.PointLight('#ff9a4a', 2.2, 5, 1.6);
      l.position.copy(sorted[i]).add(new THREE.Vector3(0, 0.3, 0));
      l.userData.flicker = i * 1.7;
      group.add(l);
    }
  }

  // ---------- 宝箱 ----------
  const chestMap = new Map<string, { lid: THREE.Object3D; open: boolean; t: number }>();
  const chestWood = new THREE.MeshStandardMaterial({ color: '#7a4a24', roughness: 0.7 });
  const chestGold = new THREE.MeshStandardMaterial({ color: '#e0b040', roughness: 0.3, metalness: 0.9, emissive: '#3a2a00' });
  disposables.push(chestWood, chestGold);
  const chestBody = new THREE.BoxGeometry(0.3, 0.17, 0.2);
  const chestLid = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12, 1, false, 0, Math.PI);
  chestLid.rotateZ(Math.PI / 2);
  const band = new THREE.BoxGeometry(0.035, 0.18, 0.21);
  disposables.push(chestBody, chestLid, band);
  for (const c of chests) {
    const g = new THREE.Group();
    const px = c.x + 0.5 + 0.27;
    const pz = c.y + 0.5 - 0.27;
    g.position.set(px, field.walk(px, pz), pz);
    g.rotation.y = -0.4;
    const body = new THREE.Mesh(chestBody, chestWood);
    body.position.y = 0.085;
    body.castShadow = true;
    g.add(body);
    for (const s of [-0.09, 0.09]) {
      const b = new THREE.Mesh(band, chestGold);
      b.position.set(s, 0.09, 0);
      g.add(b);
    }
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.17, -0.1);
    const lid = new THREE.Mesh(chestLid, chestWood);
    lid.position.set(0, 0, 0.1);
    lid.rotation.y = Math.PI / 2;
    lid.rotation.x = 0;
    lid.castShadow = true;
    lidPivot.add(lid);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), chestGold);
    lock.position.set(0, 0.0, 0.205);
    lidPivot.add(lock);
    g.add(lidPivot);
    group.add(g);
    if (c.opened) lidPivot.rotation.x = -1.9;
    chestMap.set(`${c.x},${c.y}`, { lid: lidPivot, open: c.opened, t: c.opened ? 1 : 0 });
  }

  return {
    group,
    chests: chestMap,
    update(dt, time) {
      flameUniforms.uTime.value = time;
      for (const o of group.children) {
        if (o instanceof THREE.PointLight) o.intensity = 2.0 + Math.sin(time * 11 + o.userData.flicker) * 0.35 + Math.sin(time * 23 + o.userData.flicker) * 0.2;
      }
      for (const [, c] of chestMap) {
        if (c.open && c.t < 1) {
          c.t = Math.min(1, c.t + dt * 1.8);
          const e = 1 - Math.pow(1 - c.t, 3);
          c.lid.rotation.x = -1.9 * e;
        }
      }
    },
    openChest(x, y) {
      const c = chestMap.get(`${x},${y}`);
      if (c) c.open = true;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

/** 通过主题对象反查主题名（用于少量主题专属装饰） */
function themeKey(th: ThemeConfig): string {
  for (const [k, v] of Object.entries(THEMES)) if (v === th) return k;
  return '';
}
