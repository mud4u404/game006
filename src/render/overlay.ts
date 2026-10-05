/**
 * 地块覆盖层：移动/攻击/治疗范围、敌方威胁区、路径、技能范围预览、网格线；以及光标
 * 每格状态写入一张 W×H 的数据纹理，由着色器在贴合地表的网格上绘制。
 */
import * as THREE from 'three';
import type { Battlefield } from './contracts';

export const enum Hl {
  None = 0,
  Move = 1,
  Attack = 2,
  Support = 3,
  Deploy = 4,
  Select = 5,
  Talk = 6,
}

export class TileOverlay {
  readonly mesh: THREE.Mesh;
  private data: Uint8Array;
  private tex: THREE.DataTexture;
  private mat: THREE.ShaderMaterial;
  readonly W: number;
  readonly H: number;
  readonly cursor: THREE.Group;
  private cursorTarget = new THREE.Vector3();
  private cursorMat: THREE.MeshBasicMaterial;
  private bf: Battlefield;
  private cursorTile: [number, number] = [-1, -1];

  constructor(bf: Battlefield, W: number, H: number) {
    this.bf = bf;
    this.W = W;
    this.H = H;
    this.data = new Uint8Array(W * H * 4);
    this.tex = new THREE.DataTexture(this.data, W, H, THREE.RGBAFormat);
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.minFilter = THREE.NearestFilter;
    this.tex.needsUpdate = true;
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uTex: { value: this.tex },
        uSize: { value: new THREE.Vector2(W, H) },
        uTime: { value: 0 },
        uGrid: { value: 0.16 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform vec2 uSize; uniform float uTime; uniform float uGrid;
        varying vec2 vUv;
        vec3 typeColor(float t) {
          if (t < 1.5) return vec3(0.25, 0.62, 1.0);   // 移动
          if (t < 2.5) return vec3(1.0, 0.28, 0.22);   // 攻击
          if (t < 3.5) return vec3(0.35, 1.0, 0.55);   // 支援
          if (t < 4.5) return vec3(1.0, 0.8, 0.3);     // 出击位置
          if (t < 5.5) return vec3(1.0, 0.92, 0.6);    // 选择
          return vec3(0.75, 0.55, 1.0);                // 交谈
        }
        void main() {
          vec2 g = vUv * uSize;
          vec2 cell = floor(g);
          vec2 f = fract(g);
          vec4 d = texture2D(uTex, (cell + 0.5) / uSize);
          float t = floor(d.r * 255.0 + 0.5);
          float danger = d.g;
          float path = d.b;
          float aoe = d.a;
          float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
          vec4 col = vec4(0.0);
          // 网格线
          float grid = smoothstep(0.035, 0.0, edge) * uGrid;
          col = vec4(vec3(0.05, 0.04, 0.03), grid);
          // 敌方威胁区（斜纹）
          if (danger > 0.5) {
            float stripe = step(0.5, fract((g.x + g.y) * 2.5 - uTime * 0.4));
            vec3 dc = vec3(0.85, 0.2, 0.55);
            col = mix(col, vec4(dc, 0.18 + stripe * 0.12), 1.0);
            col.a += smoothstep(0.06, 0.0, edge) * 0.25;
          }
          if (t > 0.5) {
            vec3 c = typeColor(t);
            float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
            float fill = 0.3 + pulse * 0.08;
            float border = smoothstep(0.09, 0.02, edge);
            float inner = smoothstep(0.5, 0.15, edge) * 0.12;
            col = vec4(c * (1.0 + border * 0.6), max(col.a, fill + border * 0.55 + inner));
          }
          if (aoe > 0.5) {
            vec3 c = vec3(1.0, 0.75, 0.25);
            float ring = smoothstep(0.1, 0.02, edge);
            col = vec4(mix(col.rgb, c, 0.8), max(col.a, 0.42 + ring * 0.5));
          }
          if (path > 0.5) {
            // 路径：中心的发光圆点
            float r = length(f - 0.5);
            float dot = smoothstep(0.17, 0.12, r);
            float glow = smoothstep(0.32, 0.0, r) * 0.35;
            col = mix(col, vec4(1.0, 0.95, 0.75, 1.0), dot);
            col.rgb += vec3(1.0, 0.85, 0.5) * glow;
            col.a = max(col.a, dot + glow);
          }
          if (col.a < 0.01) discard;
          gl_FragColor = col;
        }`,
    });
    this.mesh = new THREE.Mesh(bf.overlayGeometry, this.mat);
    this.mesh.renderOrder = 5;
    this.mesh.name = 'overlay';

    // 光标：四角括号 + 底光
    this.cursor = new THREE.Group();
    this.cursorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.7), transparent: true, depthTest: false });
    const L = 0.22;
    const T = 0.045;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const g = new THREE.Group();
      const a = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, T), this.cursorMat);
      a.position.set((-sx * L) / 2, 0, 0);
      const b = new THREE.Mesh(new THREE.BoxGeometry(T, 0.03, L), this.cursorMat);
      b.position.set(0, 0, (-sz * L) / 2);
      g.add(a, b);
      g.position.set(sx * 0.47, 0, sz * 0.47);
      g.userData.corner = [sx, sz];
      this.cursor.add(g);
    }
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ vec2 p=abs(vUv-0.5); float e=max(p.x,p.y); float a=smoothstep(0.5,0.3,e)*0.18*(0.8+0.2*sin(uTime*4.0)); gl_FragColor=vec4(vec3(1.0,0.8,0.4)*a,a);} `,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    this.cursor.add(glow);
    this.cursor.userData.glow = glow;
    this.cursor.renderOrder = 10;
    this.cursor.visible = false;
  }

  clear(keepDanger = true) {
    for (let i = 0; i < this.W * this.H; i++) {
      this.data[i * 4] = 0;
      if (!keepDanger) this.data[i * 4 + 1] = 0;
      this.data[i * 4 + 2] = 0;
      this.data[i * 4 + 3] = 0;
    }
    this.tex.needsUpdate = true;
  }

  set(tiles: Iterable<[number, number]>, type: Hl) {
    for (const [x, y] of tiles) {
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
      this.data[(y * this.W + x) * 4] = type;
    }
    this.tex.needsUpdate = true;
  }

  setDanger(tiles: Iterable<[number, number]>) {
    for (let i = 0; i < this.W * this.H; i++) this.data[i * 4 + 1] = 0;
    for (const [x, y] of tiles) this.data[(y * this.W + x) * 4 + 1] = 255;
    this.tex.needsUpdate = true;
  }

  setPath(tiles: [number, number][]) {
    for (let i = 0; i < this.W * this.H; i++) this.data[i * 4 + 2] = 0;
    for (const [x, y] of tiles.slice(1)) this.data[(y * this.W + x) * 4 + 2] = 255;
    this.tex.needsUpdate = true;
  }

  setArea(tiles: Iterable<[number, number]>) {
    for (let i = 0; i < this.W * this.H; i++) this.data[i * 4 + 3] = 0;
    for (const [x, y] of tiles) {
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
      this.data[(y * this.W + x) * 4 + 3] = 255;
    }
    this.tex.needsUpdate = true;
  }

  setGrid(alpha: number) {
    this.mat.uniforms.uGrid.value = alpha;
  }

  moveCursor(x: number, y: number) {
    this.cursorTile = [x, y];
    this.cursor.visible = x >= 0;
    if (x >= 0) this.bf.tileToWorld(x, y, this.cursorTarget);
  }

  get cursorAt(): [number, number] {
    return this.cursorTile;
  }

  update(dt: number, time: number) {
    this.mat.uniforms.uTime.value = time;
    const c = this.cursor;
    if (c.visible) {
      c.position.lerp(this.cursorTarget.clone().add(new THREE.Vector3(0, 0.04, 0)), Math.min(1, dt * 18));
      const s = 1 + Math.sin(time * 5) * 0.04;
      for (const ch of c.children) {
        const corner = ch.userData.corner as [number, number] | undefined;
        if (corner) ch.position.set(corner[0] * 0.47 * s, 0, corner[1] * 0.47 * s);
      }
      ((c.userData.glow as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
  }

  dispose() {
    this.tex.dispose();
    this.mat.dispose();
  }
}
