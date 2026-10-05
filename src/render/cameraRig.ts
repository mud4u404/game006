/**
 * 战术镜头：围绕目标点的轨道镜头，支持平移、90° 旋转、缩放、平滑跟随与战斗特写
 */
import * as THREE from 'three';

export interface CameraPose {
  target: THREE.Vector3;
  yaw: number;
  pitch: number;
  distance: number;
  fov: number;
}

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** 当前值 */
  target = new THREE.Vector3();
  yaw = 0;
  pitch = 0.92;
  distance = 15;
  fov = 32;
  /** 目标值 */
  goal: CameraPose;
  bounds = { minX: 0, maxX: 20, minZ: 0, maxZ: 20 };
  minDist = 7;
  maxDist = 30;
  private saved: CameraPose | null = null;
  stiffness = 6;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.goal = { target: new THREE.Vector3(), yaw: 0, pitch: 0.92, distance: 15, fov: 32 };
  }

  setBounds(w: number, h: number) {
    this.bounds = { minX: -1, maxX: w + 1, minZ: -1, maxZ: h + 1 };
  }

  lookAt(x: number, y: number, z: number, immediate = false) {
    this.goal.target.set(x, y, z);
    this.clampGoal();
    if (immediate) this.snap();
  }

  snap() {
    this.target.copy(this.goal.target);
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.distance = this.goal.distance;
    this.fov = this.goal.fov;
    this.apply();
  }

  rotate(steps: number) {
    this.goal.yaw += (steps * Math.PI) / 2;
  }

  zoom(delta: number) {
    this.goal.distance = THREE.MathUtils.clamp(this.goal.distance * (1 + delta), this.minDist, this.maxDist);
  }

  /** 以镜头朝向为基准平移（右、前） */
  pan(right: number, forward: number) {
    const s = this.goal.distance / 17;
    const cy = Math.cos(this.goal.yaw);
    const sy = Math.sin(this.goal.yaw);
    this.goal.target.x += (right * cy - forward * sy) * s;
    this.goal.target.z += (-right * sy - forward * cy) * s;
    this.clampGoal();
  }

  private clampGoal() {
    const b = this.bounds;
    this.goal.target.x = THREE.MathUtils.clamp(this.goal.target.x, b.minX, b.maxX);
    this.goal.target.z = THREE.MathUtils.clamp(this.goal.target.z, b.minZ, b.maxZ);
  }

  /** 战斗特写：对准两点之间，从侧面低角度拍摄 */
  cinematic(a: THREE.Vector3, b: THREE.Vector3) {
    if (!this.saved) this.saved = { target: this.goal.target.clone(), yaw: this.goal.yaw, pitch: this.goal.pitch, distance: this.goal.distance, fov: this.goal.fov };
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.45;
    const dir = b.clone().sub(a);
    dir.y = 0;
    const len = Math.max(1, dir.length());
    // 镜头垂直于两者连线，偏向当前镜头一侧
    const perpYaw = Math.atan2(dir.x, dir.z) + Math.PI / 2;
    let yaw = perpYaw;
    // 选择离当前朝向更近的一侧
    const diff = Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
    if (Math.abs(diff) > Math.PI / 2) yaw += Math.PI;
    // 稍微偏一点角度，更有纵深
    yaw += 0.35 * Math.sign(diff || 1);
    this.goal.target.copy(mid);
    this.goal.yaw = this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
    this.goal.pitch = 0.32;
    this.goal.distance = 3.4 + len * 0.9;
    this.goal.fov = 34;
  }

  /** 结束特写，恢复原来的镜头 */
  restore() {
    if (!this.saved) return;
    this.goal = this.saved;
    this.saved = null;
  }

  get inCinematic() {
    return !!this.saved;
  }

  update(dt: number) {
    const k = this.saved ? 4 : this.stiffness;
    this.target.x = damp(this.target.x, this.goal.target.x, k, dt);
    this.target.y = damp(this.target.y, this.goal.target.y, k, dt);
    this.target.z = damp(this.target.z, this.goal.target.z, k, dt);
    this.yaw = damp(this.yaw, this.goal.yaw, k, dt);
    this.pitch = damp(this.pitch, this.goal.pitch, k, dt);
    this.distance = damp(this.distance, this.goal.distance, k, dt);
    this.fov = damp(this.fov, this.goal.fov, k, dt);
    this.apply();
  }

  apply() {
    const cp = Math.cos(this.pitch);
    const off = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).multiplyScalar(this.distance);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** 当前镜头的「右」方向在格子坐标中的近似（用于方向键移动光标） */
  screenAxes(): { right: [number, number]; down: [number, number] } {
    // yaw 为 0 时，镜头在 +z 侧看向 -z：屏幕右 = +x，屏幕下 = +z
    const q = Math.round(this.goal.yaw / (Math.PI / 2));
    const r = ((q % 4) + 4) % 4;
    const table: { right: [number, number]; down: [number, number] }[] = [
      { right: [1, 0], down: [0, 1] },
      { right: [0, -1], down: [1, 0] },
      { right: [-1, 0], down: [0, -1] },
      { right: [0, 1], down: [-1, 0] },
    ];
    return table[r];
  }
}
