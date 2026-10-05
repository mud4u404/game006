/**
 * 3D 战场世界：把地形、环境、单位、覆盖层、特效与镜头组织在一起
 * 战斗与剧情演出共用（剧情时放置「演员」而不是战斗单位）。
 */
import * as THREE from 'three';
import { TERRAIN_CHARS, type Battlefield, type Environment, type MapData, type Quality, type ThemeId, type UnitAnim, type UnitModel, type UnitModelSpec, type VfxId, type VfxSystem } from './contracts';
import { buildBattlefield, createEnvironment } from './battlefield';
import { createUnitModel } from './units';
import { createVfxSystem, type VfxImpl } from './vfx';
import { CameraRig } from './cameraRig';
import { TileOverlay } from './overlay';
import type { Engine } from './engine';
import { h } from '@/ui/dom';

export type FacingDir = 'n' | 's' | 'e' | 'w';
const FACE_VEC: Record<FacingDir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export interface ViewState {
  hp: number;
  maxHp: number;
  team: 'player' | 'enemy' | 'ally';
  boss?: boolean;
  acted?: boolean;
}

export class UnitView {
  readonly id: string;
  model: UnitModel;
  x = 0;
  y = 0;
  hpEl: HTMLElement;
  bossEl: HTMLElement | null = null;
  state: ViewState;
  visible = true;

  constructor(id: string, model: UnitModel, state: ViewState, layer: HTMLElement) {
    this.id = id;
    this.model = model;
    this.state = { ...state };
    this.hpEl = h(`div.hpbar-mini.${state.team}`, null, h('i'));
    layer.appendChild(this.hpEl);
    if (state.boss) {
      this.bossEl = h('div.boss-mark', null, '♛');
      layer.appendChild(this.bossEl);
    }
    this.setHp(state.hp, state.maxHp);
  }

  setHp(hp: number, max: number) {
    this.state.hp = hp;
    this.state.maxHp = max;
    (this.hpEl.firstChild as HTMLElement).style.transform = `scaleX(${Math.max(0, hp / Math.max(1, max))})`;
  }

  dispose() {
    this.model.dispose();
    this.hpEl.remove();
    this.bossEl?.remove();
  }
}

export interface WorldOptions {
  map: MapData;
  quality: Quality;
  /** 是否显示单位头顶的血条 */
  hpBars?: boolean;
}

export class BattleWorld {
  readonly engine: Engine;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  bf: Battlefield;
  env: Environment;
  overlay: TileOverlay;
  vfx: VfxSystem;
  readonly views = new Map<string, UnitView>();
  readonly layer: HTMLElement;
  readonly map: MapData;
  private quality: Quality;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private unsub: () => void;
  hpBars = true;
  /** 镜头自动跟随的目标 */
  follow: string | null = null;
  private v3 = new THREE.Vector3();

  constructor(engine: Engine, uiRoot: HTMLElement, opts: WorldOptions) {
    this.engine = engine;
    this.map = opts.map;
    this.quality = opts.quality;
    this.hpBars = opts.hpBars ?? true;
    engine.setScene(this.scene);
    this.env = createEnvironment(engine.renderer, this.scene, opts.map.theme, { width: opts.map.width, height: opts.map.height }, opts.quality);
    engine.setMood(this.env.mood);
    this.bf = buildBattlefield(opts.map, opts.quality);
    this.scene.add(this.bf.group);
    this.overlay = new TileOverlay(this.bf, opts.map.width, opts.map.height);
    this.scene.add(this.overlay.mesh, this.overlay.cursor);
    this.vfx = createVfxSystem(this.scene, opts.quality);
    this.rig = new CameraRig(engine.camera);
    this.rig.setBounds(opts.map.width, opts.map.height);
    this.rig.lookAt(opts.map.width / 2, 0, opts.map.height / 2, true);
    this.layer = h('div.floaters');
    uiRoot.prepend(this.layer);
    this.unsub = engine.onUpdate((dt, t) => this.update(dt, t));
  }

  static mapFromRows(rows: string[], theme: ThemeId, seed = 1, chests: { x: number; y: number; opened: boolean }[] = []): MapData {
    const width = Math.max(...rows.map((r) => r.length));
    return {
      width,
      height: rows.length,
      tiles: rows.map((r) => Array.from({ length: width }, (_, x) => TERRAIN_CHARS[r[x] ?? '.'] ?? 'plain')),
      theme,
      seed,
      chests,
    };
  }

  /* -------------------- 单位 -------------------- */

  addUnit(id: string, spec: UnitModelSpec, x: number, y: number, face: FacingDir, state: ViewState): UnitView {
    this.removeUnit(id);
    const model = createUnitModel(spec, this.quality);
    const v = new UnitView(id, model, state, this.layer);
    v.x = x;
    v.y = y;
    this.bf.tileToWorld(x, y, model.object.position);
    const [fx, fz] = FACE_VEC[face];
    model.faceTowards(fx, fz, true);
    this.scene.add(model.object);
    this.views.set(id, v);
    return v;
  }

  removeUnit(id: string) {
    const v = this.views.get(id);
    if (!v) return;
    this.scene.remove(v.model.object);
    v.dispose();
    this.views.delete(id);
  }

  view(id: string): UnitView | undefined {
    return this.views.get(id);
  }

  place(id: string, x: number, y: number) {
    const v = this.views.get(id);
    if (!v) return;
    v.x = x;
    v.y = y;
    this.bf.tileToWorld(x, y, v.model.object.position);
  }

  face(id: string, dir: FacingDir | [number, number]) {
    const v = this.views.get(id);
    if (!v) return;
    const [fx, fz] = Array.isArray(dir) ? dir : FACE_VEC[dir];
    v.model.faceTowards(fx, fz);
  }

  faceUnit(id: string, other: string) {
    const a = this.views.get(id);
    const b = this.views.get(other);
    if (!a || !b) return;
    a.model.faceTowards(b.x - a.x, b.y - a.y);
  }

  /** 沿路径移动（每格约 0.16 秒），返回到达的 Promise */
  async moveAlong(id: string, path: [number, number][], speed = 1): Promise<void> {
    const v = this.views.get(id);
    if (!v || path.length < 2) return;
    v.model.setMoving(true);
    const obj = v.model.object;
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1];
      const [bx, by] = path[i];
      v.model.faceTowards(bx - ax, by - ay);
      this.bf.tileToWorld(ax, ay, from);
      this.bf.tileToWorld(bx, by, to);
      const dur = 0.16 / speed;
      await this.tween(dur, (t) => {
        obj.position.lerpVectors(from, to, t);
        obj.position.y = this.bf.heightAtWorld(obj.position.x, obj.position.z);
      });
      v.x = bx;
      v.y = by;
    }
    v.model.setMoving(false);
  }

  private tween(dur: number, fn: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      let t = 0;
      const off = this.engine.onUpdate((dt) => {
        t += dt;
        const k = Math.min(1, t / dur);
        fn(k);
        if (k >= 1) {
          off();
          resolve();
        }
      });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms / 1000, () => {});
  }

  play(id: string, anim: UnitAnim, onImpact?: () => void, speed = 1): Promise<void> {
    const v = this.views.get(id);
    if (!v) {
      onImpact?.();
      return Promise.resolve();
    }
    return v.model.play(anim, { onImpact, speed });
  }

  /* -------------------- 位置 -------------------- */

  tilePos(x: number, y: number, lift = 0): THREE.Vector3 {
    return this.bf.tileToWorld(x, y).add(new THREE.Vector3(0, lift, 0));
  }

  /** 单位胸口位置（特效锚点） */
  anchor(id: string): THREE.Vector3 {
    const v = this.views.get(id);
    if (!v) return new THREE.Vector3();
    return v.model.object.position.clone().add(new THREE.Vector3(0, v.model.height * 0.55, 0));
  }

  /** 屏幕坐标 → 格子 */
  pick(clientX: number, clientY: number): [number, number] | null {
    const rect = this.engine.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.engine.camera);
    const hit = this.raycaster.intersectObject(this.overlay.mesh, false)[0];
    if (!hit) return null;
    const x = Math.floor(hit.point.x);
    const y = Math.floor(hit.point.z);
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return null;
    return [x, y];
  }

  /** 世界坐标 → 屏幕 CSS 像素 */
  project(p: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = this.v3.copy(p).project(this.engine.camera);
    const rect = this.engine.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, visible: v.z < 1 && v.z > -1 };
  }

  /** 浮动文字（伤害、治疗、提示） */
  popup(at: THREE.Vector3, text: string, cls = '') {
    const s = this.project(at);
    if (!s.visible) return;
    const el = h(`div.popup${cls ? '.' + cls : ''}`, { style: { left: `${s.x}px`, top: `${s.y}px` } }, text);
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  async vfxPlay(id: VfxId, from: THREE.Vector3, to: THREE.Vector3, onImpact?: () => void, scale = 1) {
    await this.vfx.play(id, from, to, { onImpact, scale });
  }

  focusTile(x: number, y: number, immediate = false) {
    const p = this.bf.tileToWorld(x, y);
    this.rig.lookAt(p.x, p.y, p.z, immediate);
  }

  setTile(x: number, y: number, t: Parameters<Battlefield['setTile']>[2]) {
    this.bf.setTile(x, y, t);
    // 覆盖层几何体随地形重建
    this.overlay.mesh.geometry = this.bf.overlayGeometry;
  }

  /* -------------------- 帧更新 -------------------- */

  update(dt: number, time: number) {
    if (this.follow) {
      const v = this.views.get(this.follow);
      if (v) this.rig.lookAt(v.model.object.position.x, v.model.object.position.y, v.model.object.position.z);
    }
    this.rig.update(dt);
    this.bf.update(dt, time);
    this.env.update(dt, time, this.engine.camera);
    this.overlay.update(dt, time);
    this.vfx.update(dt, time);
    // 粒子像素尺寸：与绘制缓冲高度、视角相关
    const fov = this.engine.camera.fov;
    const rect = this.engine.canvas.getBoundingClientRect();
    (this.vfx as VfxImpl).setPixelScale?.((rect.height / (2 * Math.tan((fov * Math.PI) / 360))) * 0.5);
    // 单位与血条
    for (const v of this.views.values()) {
      v.model.update(dt, time);
      const showBar = this.hpBars && v.visible && v.state.hp > 0 && !this.rig.inCinematic;
      if (showBar) {
        const p = this.project(v.model.object.position.clone().add(new THREE.Vector3(0, v.model.height + 0.12, 0)));
        v.hpEl.style.display = p.visible ? 'block' : 'none';
        v.hpEl.style.transform = `translate(${p.x}px, ${p.y}px)`;
        v.hpEl.style.left = '0';
        v.hpEl.style.top = '0';
        if (v.bossEl) {
          v.bossEl.style.display = p.visible ? 'block' : 'none';
          v.bossEl.style.transform = `translate(${p.x}px, ${p.y - 26}px)`;
          v.bossEl.style.left = '0';
          v.bossEl.style.top = '0';
        }
      } else {
        v.hpEl.style.display = 'none';
        if (v.bossEl) v.bossEl.style.display = 'none';
      }
    }
  }

  dispose() {
    this.unsub();
    for (const id of [...this.views.keys()]) this.removeUnit(id);
    this.vfx.dispose();
    this.overlay.dispose();
    this.bf.dispose();
    this.env.dispose();
    this.layer.remove();
    this.scene.clear();
  }
}
