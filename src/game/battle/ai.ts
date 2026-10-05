/**
 * 敌方 / 友方 AI
 * 经典行为：
 *  - 主动型：寻找期望收益最高的攻击；够不着就向最近的目标推进
 *  - 待命型：我方进入其威胁范围（或同组单位被攻击）才出动
 *  - 守点型：原地不动，只攻击射程内的目标（守王座的首领）
 *  - 劫掠者：冲向村庄并将其摧毁
 *  - 盗贼：抢夺宝箱后逃离战场
 *  - 「打不动就不打」：预计伤害为 0 时放弃物理攻击，只贴身卡位
 *  - 治疗者优先治疗受伤同伴
 */
import { ITEMS } from '@/data/items';
import type { SkillDef } from '@/data/types';
import { terrainCost } from '@/data/terrain';
import { getClass } from '@/data/classes';
import { maxHp, moveTypeOf, weaponOf, type Unit } from '../unit';
import type { Battle } from './battle';
import { forecast, calcStrike } from './combat';
import { DIRS, isFriend, manhattan, stopTiles, tilesInRange, type ReachNode } from './grid';

export type AiAction =
  | { type: 'attack'; target: Unit; skill?: SkillDef }
  | { type: 'cast'; skill: SkillDef; tx: number; ty: number }
  | { type: 'loot' }
  | { type: 'destroy' }
  | { type: 'escape' }
  | { type: 'wait' };

export interface AiDecision {
  unit: Unit;
  moveTo: [number, number];
  action: AiAction;
}

interface Option {
  node: ReachNode;
  action: AiAction;
  score: number;
}

/** 为单位做出决策 */
export function decide(b: Battle, u: Unit): AiDecision {
  const stay = (action: AiAction = { type: 'wait' }): AiDecision => ({ unit: u, moveTo: [u.x, u.y], action });
  if (!u.alive || u.done) return stay();

  const ai = u.ai ?? { type: 'aggressive' as const };
  const reach = b.reach(u);
  const here = reach.get(b.map.key(u.x, u.y))!;

  // ---- 唤醒判定 ----
  if (ai.type === 'wait' && b.turn >= ai.turn) u.awake = true;
  if (ai.type === 'hold' && !u.awake && playerInThreat(b, u)) u.awake = true;

  const canMove = !(ai.type === 'stationary') && u.awake;
  const nodes = canMove ? stopTiles(reach) : [here];

  // ---- 盗贼 ----
  if (ai.type === 'thief') {
    if (!u.loot) {
      const chests = b.chests.filter((c) => !c.opened);
      if (chests.length) {
        const on = nodes.find((n) => chests.some((c) => c.x === n.x && c.y === n.y));
        if (on) return { unit: u, moveTo: [on.x, on.y], action: { type: 'loot' } };
        return approach(b, u, nodes, chests.map((c) => [c.x, c.y] as [number, number]));
      }
    }
    const exit = ai.exit;
    const atExit = nodes.find((n) => n.x === exit[0] && n.y === exit[1]);
    if (atExit) return { unit: u, moveTo: [atExit.x, atExit.y], action: { type: 'escape' } };
    return approach(b, u, nodes, [exit]);
  }

  // ---- 劫掠者 ----
  if (ai.type === 'raider') {
    const vs = b.villages.filter((v) => !v.destroyed && !v.visited);
    if (vs.length) {
      const on = nodes.find((n) => vs.some((v) => v.x === n.x && v.y === n.y) && !b.unitAt(n.x, n.y));
      if (on) return { unit: u, moveTo: [on.x, on.y], action: { type: 'destroy' } };
      // 路上能打到人就顺手攻击（不偏离太多）
      const opt = bestCombatOption(b, u, nodes);
      if (opt && opt.score > 30) return { unit: u, moveTo: [opt.node.x, opt.node.y], action: opt.action };
      return approach(b, u, nodes, vs.map((v) => [v.x, v.y] as [number, number]));
    }
  }

  // ---- 治疗 ----
  const heal = bestHealOption(b, u, nodes);
  if (heal) return { unit: u, moveTo: [heal.node.x, heal.node.y], action: heal.action };

  // ---- 攻击 ----
  const opt = bestCombatOption(b, u, nodes);
  if (opt) return { unit: u, moveTo: [opt.node.x, opt.node.y], action: opt.action };

  if (!canMove) return stay();

  // ---- 推进 ----
  if (ai.type === 'target') {
    const t = ai.unit ? b.unit(ai.unit) : undefined;
    const goal: [number, number] | undefined = t && t.alive ? [t.x, t.y] : ai.tile;
    if (goal) return approach(b, u, nodes, [goal]);
  }
  const foes = b.active().filter((t) => !isFriend(t.team, u.team));
  if (!foes.length) return stay();
  // 治疗者跟随同伴，不主动冲锋
  if (isHealerOnly(u)) {
    const friends = b.active(u.team).filter((t) => t !== u && !isHealerOnly(t));
    if (friends.length) return approach(b, u, nodes, friends.map((f) => [f.x, f.y] as [number, number]), 1);
  }
  return approach(b, u, nodes, foes.map((f) => [f.x, f.y] as [number, number]));
}

function isHealerOnly(u: Unit): boolean {
  const w = weaponOf(u);
  return getClass(u.classId).tags.includes('healer') && (!w || w.type === 'staff');
}

/** 是否有敌对单位进入了它的威胁范围 */
function playerInThreat(b: Battle, u: Unit): boolean {
  const reach = b.reach({ ...u, moved: false, done: false } as Unit);
  const w = weaponOf(u);
  let maxR = w ? w.range[1] : 1;
  for (const s of b.skillsOf(u)) if (s.kind === 'magic') maxR = Math.max(maxR, s.range[1]);
  const foes = b.active().filter((t) => !isFriend(t.team, u.team));
  for (const n of stopTiles(reach)) {
    for (const f of foes) if (manhattan(n.x, n.y, f.x, f.y) <= maxR) return true;
  }
  return false;
}

/** 评估所有攻击选项（武器 + 攻击技能），返回最佳 */
function bestCombatOption(b: Battle, u: Unit, nodes: ReachNode[]): Option | null {
  let best: Option | null = null;
  const consider = (o: Option) => {
    if (!best || o.score > best.score) best = o;
  };
  const skills = b.skillsOf(u).filter((s) => (s.kind === 'magic' || s.kind === 'tech' || s.kind === 'debuff') && s.target === 'enemy');
  const w = weaponOf(u);

  for (const n of nodes) {
    const ghost = { ...u, x: n.x, y: n.y, moved: n.x !== u.x || n.y !== u.y } as Unit;
    const tileBonus = b.map.def(n.x, n.y).def * 0.15;

    // 武器攻击
    if (w) {
      for (const t of b.weaponTargets(u, n.x, n.y)) {
        const s = scoreAttack(b, ghost, t) + tileBonus;
        if (s > 0) consider({ node: n, action: { type: 'attack', target: t }, score: s });
      }
    }
    // 技能
    for (const sk of skills) {
      if (!b.canUseSkill(ghost, sk).ok) continue;
      if (sk.kind === 'debuff') {
        // 偶尔使用：对威胁大的目标施放
        for (const [tx, ty] of b.skillTargetTiles(ghost, sk, n.x, n.y)) {
          const t = b.unitAt(tx, ty);
          if (!t || t.status.some((s) => s.id === sk.status?.id)) continue;
          consider({ node: n, action: { type: 'cast', skill: sk, tx, ty }, score: 12 + tileBonus });
        }
        continue;
      }
      if (sk.area > 0 || sk.range[1] === 0) {
        for (const [tx, ty] of b.skillTargetTiles(ghost, sk, n.x, n.y)) {
          const ts = b.skillTargetsAt(ghost, sk, tx, ty);
          let sc = 0;
          for (const t of ts) {
            const c = calcStrike(b.map, ghost, t, sk);
            const exp = (c.dmg * c.hit) / 100;
            sc += exp + (c.dmg >= t.hp ? (40 * c.hit) / 100 : 0);
          }
          sc -= sk.mp * 0.4;
          if (sc > 0) consider({ node: n, action: { type: 'cast', skill: sk, tx, ty }, score: sc + tileBonus });
        }
      } else {
        for (const [tx, ty] of b.skillTargetTiles(ghost, sk, n.x, n.y)) {
          const t = b.unitAt(tx, ty);
          if (!t || isFriend(t.team, u.team)) continue;
          const sc = sk.kind === 'tech' ? scoreAttack(b, ghost, t, sk) : scoreSpell(b, ghost, t, sk);
          if (sc > 0) {
            const action: AiAction = sk.kind === 'tech' ? { type: 'attack', target: t, skill: sk } : { type: 'cast', skill: sk, tx, ty };
            consider({ node: n, action, score: sc - sk.mp * 0.4 + tileBonus });
          }
        }
      }
    }
  }
  return best;
}

function scoreSpell(b: Battle, u: Unit, t: Unit, sk: SkillDef): number {
  const c = calcStrike(b.map, u, t, sk);
  if (c.dmg <= 0) return -1;
  let s = (c.dmg * c.hit) / 100;
  if (c.dmg >= t.hp) s += (50 * c.hit) / 100;
  if (t.lord) s += 8;
  return s;
}

/** 攻击评分：期望伤害 + 击杀奖励 − 承受反击 */
function scoreAttack(b: Battle, u: Unit, t: Unit, sk?: SkillDef): number {
  const f = forecast(b.map, u, t, sk);
  const a = f.atk;
  // 打不动就不打
  if (a.dmg <= 0) return -1;
  const hitP = a.hit / 100;
  const critP = a.crit / 100;
  let dmgExp = a.dmg * a.hits * hitP * (1 + critP * 0.8);
  dmgExp = Math.min(dmgExp, t.hp);
  let s = dmgExp;
  if (a.dmg * a.hits >= t.hp) s += 50 * hitP;
  // 偏好无法反击、防御低、治疗与法师
  const tags = getClass(t.classId).tags;
  if (tags.includes('healer')) s += 6;
  if (tags.includes('mage')) s += 3;
  if (t.lord) s += 6;
  if (f.counter && a.dmg * a.hits < t.hp) {
    const c = f.counter;
    const cExp = (c.dmg * c.hit) / 100;
    s -= cExp * 0.6;
    if (c.dmg >= u.hp) s -= 30 * (c.hit / 100);
  } else if (!f.counter) {
    s += 4;
  }
  return s;
}

/** 治疗选项：同伴 HP < 70% */
function bestHealOption(b: Battle, u: Unit, nodes: ReachNode[]): Option | null {
  const heals = b.skillsOf(u).filter((s) => s.kind === 'heal' && !s.revive);
  if (!heals.length) return null;
  let best: Option | null = null;
  for (const n of nodes) {
    const ghost = { ...u, x: n.x, y: n.y, moved: n.x !== u.x || n.y !== u.y } as Unit;
    for (const sk of heals) {
      if (!b.canUseSkill(ghost, sk).ok) continue;
      for (const [tx, ty] of b.skillTargetTiles(ghost, sk, n.x, n.y)) {
        const ts = b.skillTargetsAt(ghost, sk, tx, ty).filter((t) => t.hp < maxHp(t) * 0.7);
        if (!ts.length) continue;
        const missing = ts.reduce((a, t) => a + (maxHp(t) - t.hp), 0);
        const score = missing + (n.x === u.x && n.y === u.y ? 2 : 0) + b.map.def(n.x, n.y).def * 0.1;
        if (!best || score > best.score) best = { node: n, action: { type: 'cast', skill: sk, tx, ty }, score };
      }
    }
  }
  return best;
}

/**
 * 向目标推进：用地形消耗计算到目标集合的距离场，选择距离最近的可停留格。
 * keep：与目标保持的距离（治疗者跟随时为 1）
 */
function approach(b: Battle, u: Unit, nodes: ReachNode[], goals: [number, number][], keep = 0): AiDecision {
  const field = distanceField(b, u, goals);
  let best = nodes[0];
  let bestScore = Infinity;
  for (const n of nodes) {
    const d = field.get(b.map.key(n.x, n.y)) ?? 9999;
    const adj = keep > 0 ? Math.abs(d - keep) : d;
    const score = adj * 10 - b.map.def(n.x, n.y).def * 0.05 + (n.x === u.x && n.y === u.y ? 0.01 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return { unit: u, moveTo: [best.x, best.y], action: { type: 'wait' } };
}

/** 多源 Dijkstra 距离场（忽略单位阻挡，只看地形） */
function distanceField(b: Battle, u: Unit, goals: [number, number][]): Map<number, number> {
  const mt = moveTypeOf(u);
  const dist = new Map<number, number>();
  const open: number[] = [];
  for (const [gx, gy] of goals) {
    // 目标格本身可能不可停留（被单位占据），以其相邻格为起点
    const k = b.map.key(gx, gy);
    dist.set(k, 0);
    open.push(k);
  }
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist.get(open[i])! < dist.get(open[bi])!) bi = i;
    const k = open.splice(bi, 1)[0];
    const [x, y] = b.map.fromKey(k);
    const d = dist.get(k)!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!b.map.inBounds(nx, ny)) continue;
      // 进入 (x,y) 的消耗由 (x,y) 的地形决定；反向传播时用当前格地形
      const c = terrainCost(b.map.at(nx, ny), mt);
      if (c === null) continue;
      const nk = b.map.key(nx, ny);
      const nd = d + c;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        open.push(nk);
      }
    }
  }
  return dist;
}

/** 友方 NPC 是否携带可用道具（预留） */
export function hasHealingItem(u: Unit): number {
  return u.items.findIndex((i) => ITEMS[i]?.consumable?.effect === 'heal');
}

export { tilesInRange };
