/**
 * 剧情舞台：在 3D 战场上执行剧情指令（战斗中与剧情演出共用）
 */
import { CHARACTERS } from '@/data/characters';
import { CLASSES } from '@/data/classes';
import { NPCS } from '@/data/npcs';
import type { ActorPlacement, SceneCommand, Team } from '@/data/types';
import type { UnitModelSpec } from '@/render/contracts';
import type { BattleWorld } from '@/render/world';
import type { Engine } from '@/render/engine';
import { buildModelSpec } from '@/game/unit';
import type { Stage } from '@/ui/dialogue';
import { audio } from '@/audio';

/** 由「外观」（角色 id 或职业 id）得到模型规格 */
export function lookSpec(look: string, team: Team = 'player'): UnitModelSpec {
  const ch = CHARACTERS[look];
  if (ch) return buildModelSpec(ch.classId, team, undefined, ch.model);
  if (CLASSES[look]) return buildModelSpec(look, team);
  // 具名 NPC
  const n = NPCS[look];
  if (n) return buildModelSpec(n.classId, team, n.model);
  return buildModelSpec('soldier', team);
}

export class WorldStage implements Stage {
  private world: BattleWorld;
  private engine: Engine;
  /** 战斗中由战斗场景提供：根据 id 查找真实单位的视图 */
  constructor(world: BattleWorld, engine: Engine) {
    this.world = world;
    this.engine = engine;
  }

  spawnActor(a: ActorPlacement) {
    this.world.addUnit(a.id, lookSpec(a.look, a.team ?? 'player'), a.x, a.y, a.face ?? 's', { hp: 1, maxHp: 1, team: a.team ?? 'player' });
    const v = this.world.view(a.id);
    if (v) {
      v.visible = false; // 剧情演员不显示血条与光环
      v.model.setRing?.(false);
    }
  }

  async run(cmd: SceneCommand): Promise<void> {
    const w = this.world;
    switch (cmd.cmd) {
      case 'spawn':
        this.spawnActor(cmd.actor);
        await w.vfxPlay('spawn', w.tilePos(cmd.actor.x, cmd.actor.y, 0.4), w.tilePos(cmd.actor.x, cmd.actor.y, 0.4));
        break;
      case 'remove': {
        const v = w.view(cmd.actor);
        if (v) {
          if (cmd.fx) await w.vfxPlay(cmd.fx, w.anchor(cmd.actor), w.anchor(cmd.actor));
          w.removeUnit(cmd.actor);
        }
        break;
      }
      case 'move': {
        const v = w.view(cmd.actor);
        if (!v) break;
        const path = straightPath(v.x, v.y, cmd.to[0], cmd.to[1]);
        const p = w.moveAlong(cmd.actor, path, 0.75);
        if (cmd.wait !== false) await p;
        break;
      }
      case 'face':
        w.face(cmd.actor, cmd.dir);
        await w.wait(150);
        break;
      case 'anim':
        await w.play(cmd.actor, cmd.anim);
        break;
      case 'camera':
        w.focusTile(cmd.at[0], cmd.at[1]);
        if (cmd.zoom) w.rig.goal.distance = 17 / cmd.zoom;
        await w.wait(450);
        break;
      case 'shake':
        this.engine.shake(cmd.strength ?? 0.2, 450);
        audio.sfx('explosion', { volume: 0.5 });
        await w.wait(300);
        break;
      case 'flash':
        await this.engine.flash(cmd.color ?? '#ffffff', 350);
        break;
      case 'vfx': {
        const to = w.tilePos(cmd.at[0], cmd.at[1], 0.45);
        const from = cmd.from ? w.tilePos(cmd.from[0], cmd.from[1], 0.45) : to;
        await w.vfxPlay(cmd.id, from, to);
        break;
      }
      case 'tile':
        w.setTile(cmd.x, cmd.y, cmd.t);
        break;
      default:
        break;
    }
  }
}

/** 简单的直线路径（先横后纵） */
export function straightPath(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [[x0, y0]];
  let x = x0;
  let y = y0;
  while (x !== x1) {
    x += Math.sign(x1 - x);
    out.push([x, y]);
  }
  while (y !== y1) {
    y += Math.sign(y1 - y);
    out.push([x, y]);
  }
  return out;
}
