/**
 * 动画关键帧：每个动作由若干姿势组成
 */
import type { UnitAnim, WeaponModel } from '@/render/contracts';
import { BASE_POSE, type Pose } from './humanoid';

export type SpriteAnim = 'idle' | 'walk' | UnitAnim;

/** 每个动作的帧数与每帧时长（秒）；impact = 命中发生在第几帧开始时 */
export const ANIM_FRAMES: Record<SpriteAnim, { frames: number; dur: number[]; impact?: number; loop?: boolean }> = {
  idle: { frames: 2, dur: [0.55, 0.55], loop: true },
  walk: { frames: 4, dur: [0.11, 0.11, 0.11, 0.11], loop: true },
  attack: { frames: 4, dur: [0.26, 0.09, 0.22, 0.16], impact: 1 },
  shoot: { frames: 3, dur: [0.3, 0.2, 0.25], impact: 2 },
  cast: { frames: 3, dur: [0.3, 0.42, 0.25], impact: 1 },
  heal: { frames: 3, dur: [0.3, 0.42, 0.25], impact: 1 },
  hit: { frames: 1, dur: [0.32], impact: 0 },
  dodge: { frames: 1, dur: [0.32], impact: 0 },
  death: { frames: 2, dur: [0.35, 0.8], impact: 0 },
  victory: { frames: 2, dur: [0.45, 0.6], impact: 0 },
  levelup: { frames: 2, dur: [0.35, 0.5], impact: 0 },
};

export const ANIM_ORDER: SpriteAnim[] = ['idle', 'walk', 'attack', 'shoot', 'cast', 'heal', 'hit', 'dodge', 'death', 'victory', 'levelup'];

/** 帧在图集中的列号 */
export const FRAME_COLUMN: Record<SpriteAnim, number> = (() => {
  const out = {} as Record<SpriteAnim, number>;
  let c = 0;
  for (const a of ANIM_ORDER) {
    out[a] = c;
    c += ANIM_FRAMES[a].frames;
  }
  return out;
})();
export const TOTAL_FRAMES = ANIM_ORDER.reduce((s, a) => s + ANIM_FRAMES[a].frames, 0);

/** 武器的待机角度 */
function restAngle(w: WeaponModel): number {
  switch (w) {
    case 'lance':
      return -0.1;
    case 'axe':
      return -0.55;
    case 'greatsword':
      return -0.45;
    case 'staff':
      return -0.14;
    case 'dagger':
      return 2.2;
    default:
      return 2.35;
  }
}

export function poseFor(anim: SpriteAnim, frame: number, weapon: WeaponModel): Pose {
  const p: Pose = { ...BASE_POSE, weapon: restAngle(weapon) };
  if (weapon === 'axe' || weapon === 'greatsword') {
    p.nearArm = 0.9;
    p.nearElbow = 1.4;
  }
  if (weapon === 'lance' || weapon === 'staff') {
    // 长柄武器竖握在身体外侧，不挡住脸
    p.nearArm = -0.12;
    p.nearElbow = 0.85;
  }
  if (weapon === 'bow') {
    p.farArm = 0.25;
    p.farElbow = 0.4;
  }
  if (weapon === 'tome') {
    p.farArm = 0.7;
    p.farElbow = 1.2;
  }
  switch (anim) {
    case 'idle':
      if (frame === 1) {
        p.bob = 0.6;
        p.nearArm -= 0.04;
      }
      break;
    case 'walk': {
      const s = [1, 0, -1, 0][frame];
      p.nearLeg = 0.45 * s;
      p.farLeg = -0.45 * s;
      p.nearKnee = s < 0 ? 0.5 : 0.1;
      p.farKnee = s > 0 ? 0.5 : 0.1;
      p.nearArm += -0.3 * s;
      p.farArm += 0.3 * s;
      p.bob = frame % 2 === 1 ? -0.8 : 0;
      p.lean = 0.6;
      break;
    }
    case 'attack': {
      if (weapon === 'lance' || weapon === 'dagger') {
        const k = [
          { a: 0.8, w: 1.57, l: -1.2 },
          { a: 1.5, w: 1.57, l: 3.2 },
          { a: 1.35, w: 1.6, l: 2.2 },
          { a: 0.6, w: 1.2, l: 0.6 },
        ][frame];
        p.nearArm = k.a;
        p.nearElbow = 0.15;
        p.weapon = k.w;
        p.lean = k.l;
        p.nearLeg = frame === 1 || frame === 2 ? 0.5 : 0.1;
        p.farLeg = -0.3;
      } else if (weapon === 'claws' || weapon === 'none' || weapon === 'tome' || weapon === 'bow') {
        const k = [
          { a: 2.4, l: -1 },
          { a: 1.2, l: 3 },
          { a: 0.8, l: 2 },
          { a: 0.4, l: 0.5 },
        ][frame];
        p.nearArm = k.a;
        p.farArm = k.a * 0.8;
        p.lean = k.l;
      } else {
        const heavy = weapon === 'axe' || weapon === 'greatsword';
        const k = [
          { a: 2.75, e: 0.4, w: -0.55, l: -1.2, c: 0 },
          { a: 1.2, e: 0.1, w: 1.95, l: 3, c: heavy ? 2 : 1 },
          { a: 0.55, e: 0.2, w: 2.7, l: 2.2, c: heavy ? 2 : 1 },
          { a: 0.35, e: 0.4, w: 2.4, l: 0.8, c: 0 },
        ][frame];
        p.nearArm = k.a;
        p.nearElbow = k.e;
        p.weapon = k.w;
        p.lean = k.l;
        p.crouch = k.c;
        p.nearLeg = frame >= 1 && frame <= 2 ? 0.55 : 0;
        p.farLeg = frame >= 1 && frame <= 2 ? -0.35 : 0;
        p.nearKnee = frame >= 1 && frame <= 2 ? 0.3 : 0;
        p.farArm = frame === 0 ? 0.4 : -0.3;
      }
      break;
    }
    case 'shoot': {
      p.farArm = 1.55;
      p.farElbow = 0;
      p.nearArm = [1.25, 1.2, 1.0][frame];
      p.nearElbow = [1.9, 2.1, 0.6][frame];
      p.lean = [-0.5, -0.8, 0.5][frame];
      p.weapon = 0;
      break;
    }
    case 'cast':
    case 'heal': {
      const up = anim === 'cast' ? 2.6 : 2.1;
      p.nearArm = [up * 0.8, up, 0.6][frame];
      p.nearElbow = [0.3, 0.1, 0.4][frame];
      p.farArm = [up * 0.6, up * 0.85, 0.4][frame];
      p.weapon = [0.2, 0.05, restAngle(weapon)][frame];
      p.glow = [0.4, 1, 0.2][frame];
      p.bob = [0, -1, 0][frame];
      p.lean = [-0.5, -0.8, 0][frame];
      break;
    }
    case 'hit':
      p.lean = -2.4;
      p.tilt = -0.18;
      p.nearArm = -0.35;
      p.farArm = -0.5;
      p.bob = 0.6;
      break;
    case 'dodge':
      p.lean = -3.2;
      p.crouch = 1.5;
      p.tilt = -0.1;
      p.farLeg = -0.4;
      break;
    case 'death':
      p.crouch = [4.5, 8][frame];
      p.tilt = [0.15, 0.35][frame];
      p.lean = [0.5, 1.5][frame];
      p.nearArm = [0.2, 0.6][frame];
      p.farArm = [0.1, 0.4][frame];
      p.nearKnee = [1.2, 1.6][frame];
      p.farKnee = [1.4, 1.8][frame];
      p.nearLeg = [0.6, 0.9][frame];
      p.farLeg = [0.4, 0.7][frame];
      p.weapon = 2.8;
      break;
    case 'victory':
    case 'levelup':
      p.nearArm = 2.95;
      p.nearElbow = 0.1;
      p.weapon = 0.05;
      p.bob = frame === 0 ? -1.2 : 0;
      p.farArm = frame === 0 ? 0.6 : 0.2;
      break;
  }
  return p;
}
