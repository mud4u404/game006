/**
 * HD-2D 像素精灵单位：立在 3D 场景里的公告板
 * - 根据角色朝向与镜头方向自动选择正面/背面并镜像
 * - 受场景光照影响（兰伯特 + 自发光底色），投射阴影
 * - 实现 UnitModel 接口，与 3D 模型可互换
 */
import * as THREE from 'three';
import type { PlayOptions, Quality, UnitAnim, UnitModel, UnitModelSpec } from '../contracts';
import { ANIM_FRAMES, type SpriteAnim } from '@/art/frames';
import { frameIndex, type SpriteAtlas } from '@/art/atlas';

/** 像素密度：每个世界单位多少像素（所有精灵统一，保证像素大小一致） */
export const PPU = 50;

const TEAM_COLORS: Record<UnitModelSpec['team'], [string, string]> = {
  player: ['#4aa3ff', '#ffd46a'],
  enemy: ['#ff4a3d', '#ff9a6a'],
  ally: ['#4dff88', '#c8ffb0'],
  neutral: ['#d8d8e0', '#ffffff'],
};

const texCache = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>();
function atlasTexture(a: SpriteAtlas): THREE.CanvasTexture {
  let t = texCache.get(a.canvas);
  if (!t) {
    t = new THREE.CanvasTexture(a.canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    texCache.set(a.canvas, t);
  }
  return t;
}

/** 当前镜头（由世界每帧设置） */
let activeCamera: THREE.Camera | null = null;
export function setSpriteCamera(c: THREE.Camera) {
  activeCamera = c;
}

interface Action {
  anim: SpriteAnim;
  t: number;
  dur: number;
  impactAt: number;
  impacted: boolean;
  onImpact?: () => void;
  resolve: () => void;
  speed: number;
}

export class SpriteUnit implements UnitModel {
  readonly object = new THREE.Group();
  height: number;
  private atlas: SpriteAtlas;
  private plane: THREE.Mesh;
  private geo: THREE.PlaneGeometry;
  private mat: THREE.MeshLambertMaterial;
  private depthMat: THREE.MeshDepthMaterial;
  private uniforms = {
    uDesat: { value: 0 },
    uFlash: { value: new THREE.Color(1, 1, 1) },
    uFlashAmt: { value: 0 },
    uOpacity: { value: 1 },
  };
  private ring: THREE.Mesh;
  private ringMat: THREE.ShaderMaterial;
  private facing = new THREE.Vector2(0, 1);
  private mirror = false;
  private view: 0 | 1 = 0;
  private moving = false;
  private loopT = Math.random() * 2;
  private action: Action | null = null;
  private acted = false;
  private actedT = 0;
  private highlighted = false;
  private dead = false;
  private flashAmt = 0;
  private flashDecay = 4;
  private kick = new THREE.Vector3();
  private lastFrame = -1;
  private scale: number;

  constructor(spec: UnitModelSpec, atlas: SpriteAtlas, _quality: Quality) {
    this.atlas = atlas;
    this.scale = spec.scale ?? 1;
    const w = atlas.frameW / PPU;
    const h = atlas.frameH / PPU;
    this.geo = new THREE.PlaneGeometry(w, h);
    // 让脚底锚点位于原点
    this.geo.translate((atlas.frameW / 2 - atlas.anchorX) / PPU, h / 2 - (atlas.frameH - atlas.anchorY) / PPU, 0);
    const tex = atlasTexture(atlas);
    this.mat = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.42, alphaTest: 0.5, side: THREE.DoubleSide });
    const u = this.uniforms;
    this.mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uDesat; uniform vec3 uFlash; uniform float uFlashAmt; uniform float uOpacity;`)
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
{
  float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(l) * vec3(0.8, 0.82, 0.9), uDesat);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlash, uFlashAmt);
  // 逐渐消失时使用抖动透明，保持像素感
  float d = fract(sin(dot(floor(gl_FragCoord.xy / 2.0), vec2(12.9898, 78.233))) * 43758.5453);
  if (d > uOpacity) discard;
}`,
        );
    };
    this.mat.customProgramCacheKey = () => 'sprite_unit';
    this.depthMat = new THREE.MeshDepthMaterial({ map: tex, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    this.plane = new THREE.Mesh(this.geo, this.mat);
    this.plane.castShadow = true;
    this.plane.receiveShadow = false;
    this.plane.customDepthMaterial = this.depthMat;
    const planeScale = atlas.baked ? 1 : this.scale;
    this.plane.scale.setScalar(planeScale);
    this.object.add(this.plane);
    this.height = (atlas.top / PPU) * planeScale;

    // 阵营光环
    const [teamCol, accent] = TEAM_COLORS[spec.team];
    this.ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(teamCol) }, uAccent: { value: new THREE.Color(accent) }, uTime: { value: 0 }, uAlpha: { value: 1 }, uHi: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uAccent; uniform float uTime; uniform float uAlpha; uniform float uHi;
        varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p) * 2.0;
          float ring = smoothstep(0.78, 0.86, d) * smoothstep(1.0, 0.9, d);
          float fill = smoothstep(0.86, 0.0, d) * 0.2;
          float a = atan(p.y, p.x);
          float dash = 0.5 + 0.5 * sin(a * 6.0 + uTime * 1.5);
          vec3 col = mix(uColor, uAccent, dash * 0.3) * (ring * (0.75 + uHi * 1.2) + fill * (0.6 + uHi));
          gl_FragColor = vec4(col, (ring + fill) * uAlpha);
        }`,
    });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(atlas.ring, atlas.ring), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.025;
    this.ring.renderOrder = 3;
    if (!atlas.baked) this.ring.scale.setScalar(Math.min(1.6, this.scale));
    this.object.add(this.ring);
    this.setFrame('idle', 0);
  }

  /* -------------------- 帧 -------------------- */

  private setFrame(anim: SpriteAnim, f: number) {
    const idx = frameIndex(anim, f) + this.view * 1000 + (this.mirror ? 100000 : 0);
    if (idx === this.lastFrame) return;
    this.lastFrame = idx;
    const a = this.atlas;
    const col = frameIndex(anim, f);
    const u0 = (col * a.frameW) / (a.cols * a.frameW);
    const u1 = ((col + 1) * a.frameW) / (a.cols * a.frameW);
    const v1 = 1 - (this.view * a.frameH) / (a.rows * a.frameH);
    const v0 = 1 - ((this.view + 1) * a.frameH) / (a.rows * a.frameH);
    const uv = this.geo.attributes.uv as THREE.BufferAttribute;
    // PlaneGeometry 顶点顺序：左上、右上、左下、右下
    const L = this.mirror ? u1 : u0;
    const R = this.mirror ? u0 : u1;
    uv.setXY(0, L, v1);
    uv.setXY(1, R, v1);
    uv.setXY(2, L, v0);
    uv.setXY(3, R, v0);
    uv.needsUpdate = true;
  }

  private frameAt(anim: SpriteAnim, t: number): number {
    const d = ANIM_FRAMES[anim].dur;
    const total = d.reduce((s, x) => s + x, 0);
    let tt = ANIM_FRAMES[anim].loop ? t % total : Math.min(t, total - 1e-4);
    for (let i = 0; i < d.length; i++) {
      if (tt < d[i]) return i;
      tt -= d[i];
    }
    return d.length - 1;
  }

  /* -------------------- UnitModel -------------------- */

  play(anim: UnitAnim, opts: PlayOptions = {}): Promise<void> {
    if (this.action) {
      if (!this.action.impacted) this.action.onImpact?.();
      this.action.resolve();
      this.action = null;
    }
    const spec = ANIM_FRAMES[anim];
    const dur = spec.dur.reduce((s, x) => s + x, 0) + (anim === 'death' ? 0.6 : 0);
    let impactAt = 0;
    for (let i = 0; i < (spec.impact ?? 0); i++) impactAt += spec.dur[i];
    if (anim === 'death') this.dead = true;
    return new Promise((resolve) => {
      this.action = { anim, t: 0, dur, impactAt, impacted: false, onImpact: opts.onImpact, resolve, speed: opts.speed ?? 1 };
      if (anim === 'hit') this.kick.set(-this.facing.x * 0.08, 0, -this.facing.y * 0.08);
    });
  }

  setMoving(moving: boolean) {
    this.moving = moving;
  }

  faceTowards(dx: number, dz: number, _immediate?: boolean) {
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    this.facing.set(dx, dz).normalize();
  }

  setActed(acted: boolean) {
    this.acted = acted;
  }

  flash(color: string, duration = 0.25) {
    this.uniforms.uFlash.value.set(color);
    this.flashAmt = 0.85;
    this.flashDecay = 0.85 / Math.max(0.05, duration);
  }

  setHighlighted(on: boolean) {
    this.highlighted = on;
  }

  setRing(on: boolean) {
    this.ring.visible = on;
  }

  update(dt: number, time: number) {
    // 公告板：只绕 Y 轴朝向镜头
    const cam = activeCamera;
    if (cam) {
      const wp = this.object.getWorldPosition(_v);
      const yaw = Math.atan2(cam.position.x - wp.x, cam.position.z - wp.z);
      this.plane.rotation.y = yaw;
      // 镜头前方向（XZ）与右方向
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = -fz;
      const rz = fx;
      const toward = this.facing.x * fx + this.facing.y * fz; // >0 背对镜头
      this.view = toward > 0.05 ? 1 : 0;
      const side = this.facing.x * rx + this.facing.y * rz;
      if (Math.abs(side) > 0.05) this.mirror = side < 0;
    }
    // 变灰 / 闪光 / 光环
    this.actedT += ((this.acted ? 1 : 0) - this.actedT) * Math.min(1, dt * 6);
    this.uniforms.uDesat.value = this.actedT * 0.8;
    this.flashAmt = Math.max(0, this.flashAmt - dt * this.flashDecay);
    this.uniforms.uFlashAmt.value = this.flashAmt;
    this.ringMat.uniforms.uTime.value = time;
    this.ringMat.uniforms.uHi.value += ((this.highlighted ? 1 : 0) - this.ringMat.uniforms.uHi.value) * Math.min(1, dt * 8);
    this.ringMat.uniforms.uAlpha.value = (this.dead ? 0 : 1) * (1 - this.actedT * 0.55);
    // 受击后退
    this.kick.multiplyScalar(Math.max(0, 1 - dt * 8));
    this.plane.position.copy(this.kick);

    if (this.action) {
      const a = this.action;
      a.t += dt * a.speed;
      if (!a.impacted && a.t >= a.impactAt) {
        a.impacted = true;
        a.onImpact?.();
      }
      const f = this.frameAt(a.anim as SpriteAnim, a.t);
      this.setFrame(a.anim as SpriteAnim, f);
      if (a.anim === 'death') this.uniforms.uOpacity.value = Math.max(0, 1 - Math.max(0, a.t - 0.5) / 0.6);
      if (a.t >= a.dur) {
        this.action = null;
        a.resolve();
      }
      return;
    }
    if (this.dead) {
      this.uniforms.uOpacity.value = 0;
      return;
    }
    this.loopT += dt;
    const anim: SpriteAnim = this.moving ? 'walk' : 'idle';
    this.setFrame(anim, this.frameAt(anim, this.loopT));
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.depthMat.dispose();
    this.ring.geometry.dispose();
    this.ringMat.dispose();
    this.object.removeFromParent();
  }
}

const _v = new THREE.Vector3();
