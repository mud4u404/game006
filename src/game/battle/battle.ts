/**
 * 战斗状态机（纯逻辑，无渲染）
 * --------------------------------------------------------------
 * 表现层调用这里的行动方法，拿到描述性的结果后播放动画；
 * 剧情事件被放入 eventQueue，由表现层按顺序取出执行（对话由表现层显示，
 * 其他动作通过 applyAction 生效）。
 */
import { Rng } from '@/core/rng';
import { getClass } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import type {
  BattleAction,
  BattleEvent,
  ChapterDef,
  ChestDef,
  SkillDef,
  Team,
  Trigger,
  UnitPlacement,
  VictoryCond,
  VillageDef,
} from '@/data/types';
import type { TerrainId } from '@/render/contracts';
import {
  canEquip,
  createCharacterUnit,
  createGenericUnit,
  createUnitFromSave,
  maxHp,
  maxMp,
  skillList,
  stats,
  weaponOf,
  type Facing,
  type Unit,
  type UnitSave,
} from '../unit';
import { combatExp, gainExp, supportExp, type LevelUpResult } from '../progression';
import {
  BattleMap,
  DIRS,
  isFriend,
  manhattan,
  occupancy,
  pathTo,
  reachable,
  tilesInArea,
  tilesInRange,
  type Occupancy,
  type ReachNode,
} from './grid';
import { healAmount, resolveCombat, resolveSpellOn, setBondProvider, type BondBonus, type StrikeResult } from './combat';

export type Phase = Team;

export interface ChestState extends ChestDef {
  opened: boolean;
}

export interface VillageState {
  x: number;
  y: number;
  def: VillageDef;
  visited: boolean;
  destroyed: boolean;
}

export interface HiddenState extends ChestDef {
  found: boolean;
}

export interface ExpGain {
  uid: string;
  amount: number;
  before: number;
  levelUp: LevelUpResult | null;
}

export interface Loot {
  item?: string;
  gold?: number;
  /** 物品去向：随身 or 仓库 */
  to?: 'bag' | 'convoy';
}

export interface ActionOutcome {
  kind: 'attack' | 'spell' | 'heal' | 'buff' | 'item' | 'chest' | 'village' | 'steal' | 'talk' | 'wait' | 'revive' | 'destroy';
  actor: string;
  strikes: StrikeResult[];
  /** 治疗/辅助效果 */
  effects: { uid: string; heal?: number; mp?: number; status?: string; cured?: boolean; stat?: string; amount?: number; revived?: boolean }[];
  exp: ExpGain[];
  loot: Loot[];
  deaths: string[];
  skill?: SkillDef;
  target?: [number, number];
  message?: string;
}

export interface PhaseEffect {
  uid: string;
  kind: 'terrain' | 'rest' | 'regen' | 'poison' | 'burn' | 'mp' | 'wake' | 'status_end';
  amount: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 中断存档：战斗的完整状态（纯数据，可 JSON 序列化） */
export interface BattleSnapshot {
  chapterId: string;
  units: Unit[];
  turn: number;
  phase: Phase;
  rng: number;
  flags: Record<string, boolean | number>;
  fired: string[];
  chests: ChestState[];
  villages: { visited: boolean; destroyed: boolean }[];
  hidden: HiddenState[];
  victory: VictoryCond;
  objectiveText: string;
  goldGained: number;
  convoyGained: string[];
  joined: string[];
  fallen: string[];
  tiles: TerrainId[][];
  bondRanks?: Record<string, number>;
}

export interface DeployEntry {
  save: UnitSave;
  x: number;
  y: number;
}

export class Battle {
  readonly chapter: ChapterDef;
  readonly map: BattleMap;
  units: Unit[] = [];
  turn = 1;
  phase: Phase = 'player';
  rng: Rng;
  flags: Record<string, boolean | number>;
  fired = new Set<string>();
  eventQueue: BattleAction[] = [];
  chests: ChestState[];
  villages: VillageState[];
  hidden: HiddenState[];
  victory: VictoryCond;
  objectiveText: string;
  outcome: 'win' | 'lose' | null = null;
  loseReason = '';
  turnLimit: number;
  /** 本战获得：金币、进仓库的道具 */
  goldGained = 0;
  convoyGained: string[] = [];
  /** 战斗中加入的角色 uid */
  joined: string[] = [];
  /** 本场阵亡的我方角色 */
  fallen: string[] = [];
  /** 已解锁的羁绊等级：bondKey → 1(C)/2(B)/3(A) */
  bondRanks: Record<string, number> = {};
  /** 再动/撤销用 */
  private tileChanges: { x: number; y: number; t: TerrainId }[] = [];

  constructor(chapter: ChapterDef, deployed: DeployEntry[], partySaves: UnitSave[], flags: Record<string, boolean | number>, seed?: number) {
    this.chapter = chapter;
    this.map = new BattleMap(chapter.map.rows);
    this.rng = new Rng(seed);
    this.flags = { ...flags };
    this.victory = chapter.victory;
    this.objectiveText = chapter.objectiveText;
    this.turnLimit = chapter.turnLimit ?? 255;
    this.chests = (chapter.chests ?? []).map((c) => ({ ...c, opened: false }));
    this.villages = (chapter.villages ?? []).map((v) => ({ x: v.x, y: v.y, def: v, visited: false, destroyed: false }));
    this.hidden = (chapter.hidden ?? []).map((h) => ({ ...h, found: false }));

    setBondProvider((u) => this.bondBonus(u));
    const partyById = new Map(partySaves.map((s) => [s.id, s]));
    // 章节内固定的单位
    for (const p of chapter.units) {
      const save = p.team === 'player' && p.character ? partyById.get(p.character) : undefined;
      this.addUnit(p, save);
    }
    // 出击的队员
    for (const d of deployed) {
      if (this.units.some((u) => u.charId === d.save.id)) continue;
      const u = createUnitFromSave(d.save, 'player');
      u.x = d.x;
      u.y = d.y;
      u.facing = 'n';
      this.units.push(u);
    }
  }

  /** 相邻且已解锁羁绊的同伴提供的加成（每级：命中/回避 +5，伤害 +1；上限 +20/+20/+3） */
  bondBonus(u: Unit): BondBonus | null {
    if (!u.charId || !u.alive) return null;
    let r = 0;
    for (const [dx, dy] of DIRS) {
      const o = this.unitAt(u.x + dx, u.y + dy);
      if (!o || o.team !== u.team || !o.charId) continue;
      const key = u.charId < o.charId ? `${u.charId}|${o.charId}` : `${o.charId}|${u.charId}`;
      r += this.bondRanks[key] ?? 0;
    }
    if (!r) return null;
    return { hit: Math.min(20, r * 5), ev: Math.min(20, r * 5), dmg: Math.min(3, r) };
  }

  /** 生成中断存档 */
  snapshot(): BattleSnapshot {
    return JSON.parse(
      JSON.stringify({
        chapterId: this.chapter.id,
        units: this.units,
        turn: this.turn,
        phase: this.phase,
        rng: this.rng.state,
        flags: this.flags,
        fired: [...this.fired],
        chests: this.chests,
        villages: this.villages.map((v) => ({ visited: v.visited, destroyed: v.destroyed })),
        hidden: this.hidden,
        victory: this.victory,
        objectiveText: this.objectiveText,
        goldGained: this.goldGained,
        convoyGained: this.convoyGained,
        joined: this.joined,
        fallen: this.fallen,
        tiles: this.map.tiles,
        bondRanks: this.bondRanks,
      }),
    ) as BattleSnapshot;
  }

  /** 从中断存档恢复 */
  static restore(chapter: ChapterDef, snap: BattleSnapshot): Battle {
    const b = new Battle(chapter, [], [], snap.flags, 1);
    b.units = snap.units;
    b.turn = snap.turn;
    b.phase = snap.phase;
    b.rng.state = snap.rng;
    b.fired = new Set(snap.fired);
    b.chests = snap.chests;
    b.villages.forEach((v, i) => Object.assign(v, snap.villages[i] ?? {}));
    b.hidden = snap.hidden;
    b.victory = snap.victory;
    b.objectiveText = snap.objectiveText;
    b.goldGained = snap.goldGained;
    b.convoyGained = snap.convoyGained;
    b.joined = snap.joined;
    b.fallen = snap.fallen;
    snap.tiles.forEach((row, y) => row.forEach((t, x) => (b.map.tiles[y][x] = t)));
    b.bondRanks = snap.bondRanks ?? {};
    return b;
  }

  /* ================================================================ */
  /* 单位管理                                                          */
  /* ================================================================ */

  addUnit(p: UnitPlacement, save?: UnitSave): Unit {
    let u: Unit;
    if (save) {
      u = createUnitFromSave(save, p.team);
    } else if (p.character && CHARACTERS[p.character]) {
      u = createCharacterUnit(p.character, p.team, p.level);
      if (p.statMod) for (const k of Object.keys(p.statMod) as (keyof typeof p.statMod)[]) u.base[k] += p.statMod[k] ?? 0;
      if (p.equipment) u.equipment = { ...u.equipment, ...p.equipment };
      if (p.items) u.items = [...p.items];
      if (p.skills) u.skills = Array.from(new Set([...u.skills, ...p.skills]));
      u.hp = maxHp(u);
      u.mp = maxMp(u);
      if (p.boss) {
        u.boss = true;
        u.model = { ...u.model, scale: (u.model.scale ?? 1) * 1.1 };
      }
    } else {
      u = createGenericUnit({
        uid: p.id,
        classId: p.classId ?? 'soldier',
        level: p.level ?? 1,
        team: p.team,
        name: p.name,
        equipment: p.equipment,
        items: p.items,
        skills: p.skills,
        statMod: p.statMod,
        model: p.model,
        boss: p.boss,
        portrait: p.portrait,
        ai: p.ai,
        drop: p.drop,
      });
    }
    u.uid = p.id;
    if (p.name) u.name = p.name;
    if (p.portrait) u.portrait = p.portrait;
    if (p.drop) u.drop = p.drop;
    if (p.ai) u.ai = p.ai;
    if (p.boss) u.boss = true;
    if (p.model && save) u.model = { ...u.model, ...p.model };
    u.x = p.x;
    u.y = p.y;
    u.facing = p.face ?? (p.team === 'player' ? 'n' : 's');
    u.awake = !(p.ai && (p.ai.type === 'hold' || p.ai.type === 'wait'));
    this.units.push(u);
    return u;
  }

  unit(uid: string): Unit | undefined {
    return this.units.find((u) => u.uid === uid);
  }

  /** 场上存活的单位 */
  active(team?: Team): Unit[] {
    return this.units.filter((u) => u.alive && !u.gone && (!team || u.team === team));
  }

  unitAt(x: number, y: number): Unit | undefined {
    return this.units.find((u) => u.alive && !u.gone && u.x === x && u.y === y);
  }

  occ(): Occupancy {
    return occupancy(this.map, this.units);
  }

  lord(): Unit | undefined {
    return this.units.find((u) => u.lord && u.team === 'player');
  }

  /* ================================================================ */
  /* 查询                                                              */
  /* ================================================================ */

  reach(u: Unit): Map<number, ReachNode> {
    if (u.moved || u.done) {
      const m = new Map<number, ReachNode>();
      m.set(this.map.key(u.x, u.y), { x: u.x, y: u.y, cost: 0, prev: -1, stop: true });
      return m;
    }
    return reachable(this.map, this.occ(), u);
  }

  path(u: Unit, x: number, y: number): [number, number][] {
    return pathTo(this.map, this.reach(u), x, y);
  }

  /** 从 (fx,fy) 用武器可攻击到的敌人 */
  weaponTargets(u: Unit, fx = u.x, fy = u.y): Unit[] {
    const w = weaponOf(u);
    if (!w) return [];
    return this.active().filter(
      (t) => !isFriend(t.team, u.team) && weaponInRange(w.range, manhattan(fx, fy, t.x, t.y)),
    );
  }

  /** 技能可用性 */
  canUseSkill(u: Unit, s: SkillDef): { ok: boolean; reason?: string } {
    if (u.mp < s.mp && !isFreeCast(u, s)) return { ok: false, reason: '魔力值不足' };
    if (s.kind !== 'tech' && u.status.some((x) => x.id === 'silence')) return { ok: false, reason: '处于沉默状态' };
    if (s.stationary && u.moved) return { ok: false, reason: '需要原地吟唱（移动后不能使用）' };
    if (s.kind === 'tech' && !weaponOf(u)) return { ok: false, reason: '没有装备武器' };
    if (s.revive && this.revivable(u).length === 0) return { ok: false, reason: '没有可复苏的同伴' };
    return { ok: true };
  }

  /** 技能的施放距离（武技可能沿用武器射程） */
  skillRange(u: Unit, s: SkillDef): [number, number] {
    if (s.kind === 'tech' && s.weaponRange !== false && !(s.range[0] === 0 && s.range[1] === 0)) {
      const w = weaponOf(u);
      if (w) return [w.range[0], w.range[1]];
    }
    return s.range;
  }

  /** 技能作用的单位 */
  skillTargetsAt(u: Unit, s: SkillDef, tx: number, ty: number): Unit[] {
    const area = s.area;
    const tiles = tilesInArea(this.map, tx, ty, area);
    const units = tiles.map(([x, y]) => this.unitAt(x, y)).filter((t): t is Unit => !!t);
    if (s.target === 'self') return [u];
    if (s.target === 'enemy') return units.filter((t) => !isFriend(t.team, u.team) && t !== u);
    // ally：包括自己（范围治疗）
    return units.filter((t) => isFriend(t.team, u.team));
  }

  /** 技能可选的目标格 */
  skillTargetTiles(u: Unit, s: SkillDef, fx = u.x, fy = u.y): [number, number][] {
    const [mn, mx] = this.skillRange(u, s);
    if (s.target === 'self' || (mn === 0 && mx === 0)) return [[fx, fy]];
    const tiles = tilesInRange(this.map, fx, fy, mn, mx);
    if (s.revive) return tiles.filter(([x, y]) => !this.unitAt(x, y) && this.passableFor(x, y));
    // 至少命中一个合法目标
    const ghost = { ...u, x: fx, y: fy } as Unit;
    return tiles.filter(([x, y]) => {
      const ts = this.skillTargetsAt(ghost, s, x, y);
      if (s.area === 0) {
        const t = this.unitAt(x, y);
        if (!t || !ts.includes(t)) return false;
        if (s.kind === 'heal' && t.hp >= maxHp(t)) return false;
        return true;
      }
      return ts.length > 0;
    });
  }

  passableFor(x: number, y: number): boolean {
    const t = this.map.def(x, y);
    return t.cost.foot !== null;
  }

  /** 本场可复苏的阵亡同伴 */
  revivable(u: Unit): Unit[] {
    return this.units.filter((t) => !t.alive && !t.gone && t.team === u.team && t.team === 'player');
  }

  chestAt(x: number, y: number): ChestState | undefined {
    return this.chests.find((c) => c.x === x && c.y === y && !c.opened);
  }

  villageAt(x: number, y: number): VillageState | undefined {
    return this.villages.find((v) => v.x === x && v.y === y && !v.visited && !v.destroyed);
  }

  canOpenChest(u: Unit): boolean {
    if (!this.chestAt(u.x, u.y)) return false;
    return !!getClass(u.classId).canOpenChests || u.items.includes('chest_key');
  }

  stealTargets(u: Unit): Unit[] {
    if (!getClass(u.classId).canSteal) return [];
    const myAgi = stats(u).agi;
    return this.adjacent(u).filter(
      (t) => t.team === 'enemy' && stats(t).agi <= myAgi && t.items.some((i) => ITEMS[i]?.kind !== 'weapon'),
    );
  }

  adjacent(u: Unit, fx = u.x, fy = u.y): Unit[] {
    const out: Unit[] = [];
    for (const [dx, dy] of DIRS) {
      const t = this.unitAt(fx + dx, fy + dy);
      if (t && t !== u) out.push(t);
    }
    return out;
  }

  talkTargets(u: Unit): Unit[] {
    return this.adjacent(u).filter((t) => this.findTalk(u, t));
  }

  findTalk(a: Unit, b: Unit): BattleEvent | undefined {
    return this.chapter.events.find(
      (e) =>
        e.when.on === 'talk' &&
        !this.fired.has(e.id) &&
        this.condOk(e) &&
        ((e.when.a === a.uid && e.when.b === b.uid) || (e.when.a === b.uid && e.when.b === a.uid)),
    );
  }

  /* ================================================================ */
  /* 行动                                                              */
  /* ================================================================ */

  /** 移动（不结束行动）。返回路径 */
  move(u: Unit, x: number, y: number): [number, number][] {
    if (u.x === x && u.y === y) {
      u.origin = { x, y };
      return [[x, y]];
    }
    const reach = this.reach(u);
    const node = reach.get(this.map.key(x, y));
    if (!node || !node.stop) throw new Error(`无法移动到 (${x},${y})`);
    const path = pathTo(this.map, reach, x, y);
    u.origin = { x: u.x, y: u.y };
    const [px, py] = path.length >= 2 ? path[path.length - 2] : [u.x, u.y];
    u.facing = facingFrom(x - px, y - py, u.facing);
    u.x = x;
    u.y = y;
    u.moved = true;
    // 遇到隐藏的敌人等情况在此扩展
    this.fire({ on: 'enter', area: [x, y, x, y] }, u);
    return path;
  }

  /** 撤销移动（尚未行动时） */
  undoMove(u: Unit) {
    if (u.acted || u.done || !u.origin) return;
    u.x = u.origin.x;
    u.y = u.origin.y;
    u.moved = false;
    u.origin = undefined;
  }

  private emptyOutcome(kind: ActionOutcome['kind'], u: Unit): ActionOutcome {
    return { kind, actor: u.uid, strikes: [], effects: [], exp: [], loot: [], deaths: [] };
  }

  /** 普攻或单体武技 */
  attack(u: Unit, target: Unit, skill?: SkillDef): ActionOutcome {
    const out = this.emptyOutcome('attack', u);
    out.skill = skill;
    out.target = [target.x, target.y];
    if (skill) this.payMp(u, skill);
    turnToward(u, target);
    turnToward(target, u);
    const strikes = resolveCombat(this.map, u, target, this.rng, skill);
    out.strikes = strikes;
    this.afterStrikes(out, [u, target]);
    // 经验：双方各自按造成的伤害结算（仅我方获得经验）
    this.grantCombatExp(out, u, [target], strikes);
    this.grantCombatExp(out, target, [u], strikes);
    this.finishAction(u);
    return out;
  }

  /** 范围技能 / 法术 / 治疗 / 辅助 */
  cast(u: Unit, skill: SkillDef, tx: number, ty: number, reviveUid?: string): ActionOutcome {
    const isHeal = skill.kind === 'heal';
    const isBuff = skill.kind === 'buff';
    const out = this.emptyOutcome(isHeal ? 'heal' : isBuff ? 'buff' : 'spell', u);
    out.skill = skill;
    out.target = [tx, ty];
    this.payMp(u, skill);
    if (tx !== u.x || ty !== u.y) u.facing = facingFrom(tx - u.x, ty - u.y, u.facing);

    if (skill.revive) {
      out.kind = 'revive';
      const t = this.units.find((x) => x.uid === reviveUid) ?? this.revivable(u)[0];
      if (t) {
        t.alive = true;
        t.hp = Math.ceil(maxHp(t) / 2);
        t.x = tx;
        t.y = ty;
        t.status = [];
        t.done = true;
        this.fallen = this.fallen.filter((f) => f !== t.uid);
        out.effects.push({ uid: t.uid, revived: true, heal: t.hp });
        this.pushExp(out, u, supportExp(u, 30));
      }
      this.finishAction(u);
      return out;
    }

    const targets = this.skillTargetsAt(u, skill, tx, ty);
    if (isHeal) {
      let total = 0;
      for (const t of targets) {
        const amt = Math.min(healAmount(u, skill), maxHp(t) - t.hp);
        t.hp += amt;
        total += amt;
        out.effects.push({ uid: t.uid, heal: amt });
      }
      if (targets.length) this.pushExp(out, u, supportExp(u, total));
    } else if (isBuff) {
      for (const t of targets) {
        if (skill.id === 'cure') {
          t.status = t.status.filter((s) => !['poison', 'sleep', 'silence', 'slow'].includes(s.id));
          out.effects.push({ uid: t.uid, cured: true });
        } else if (skill.status) {
          const ex = t.status.find((s) => s.id === skill.status!.id);
          if (ex) ex.turns = Math.max(ex.turns, skill.status.turns);
          else t.status.push({ id: skill.status.id, turns: skill.status.turns });
          out.effects.push({ uid: t.uid, status: skill.status.id });
        }
      }
      if (targets.length) this.pushExp(out, u, supportExp(u, 10 + targets.length * 4));
    } else if (skill.kind === 'tech') {
      // 范围武技：对每个目标单独结算，不会被反击
      for (const t of targets) {
        const r = resolveCombat(this.map, u, t, this.rng, { ...skill, noCounter: true });
        out.strikes.push(...r);
      }
      this.afterStrikes(out, [u, ...targets]);
      this.grantCombatExp(out, u, targets, out.strikes);
    } else {
      for (const t of targets) out.strikes.push(resolveSpellOn(this.map, u, t, skill, this.rng));
      this.afterStrikes(out, [u, ...targets]);
      if (skill.kind === 'debuff') this.pushExp(out, u, supportExp(u, 10));
      else this.grantCombatExp(out, u, targets, out.strikes);
    }
    this.finishAction(u);
    return out;
  }

  private payMp(u: Unit, s: SkillDef) {
    if (isFreeCast(u, s)) return;
    u.mp = Math.max(0, u.mp - s.mp);
  }

  /** 使用道具 */
  useItem(u: Unit, index: number, target: Unit = u): ActionOutcome {
    const out = this.emptyOutcome('item', u);
    const id = u.items[index];
    const it = ITEMS[id];
    if (!it?.consumable) throw new Error('该道具不能使用');
    const c = it.consumable;
    switch (c.effect) {
      case 'heal': {
        const amt = Math.min(c.amount ?? 0, maxHp(target) - target.hp);
        target.hp += amt;
        out.effects.push({ uid: target.uid, heal: amt });
        break;
      }
      case 'elixir': {
        const amt = maxHp(target) - target.hp;
        target.hp = maxHp(target);
        target.mp = maxMp(target);
        out.effects.push({ uid: target.uid, heal: amt });
        break;
      }
      case 'mp': {
        const amt = Math.min(c.amount ?? 0, maxMp(target) - target.mp);
        target.mp += amt;
        out.effects.push({ uid: target.uid, mp: amt });
        break;
      }
      case 'cure':
        target.status = target.status.filter((s) => !['poison', 'sleep', 'silence', 'slow'].includes(s.id));
        out.effects.push({ uid: target.uid, cured: true });
        break;
      case 'stat_up':
        if (c.stat) {
          target.base[c.stat] += c.amount ?? 1;
          if (c.stat === 'hp') target.hp += c.amount ?? 0;
          if (c.stat === 'mp') target.mp += c.amount ?? 0;
          out.effects.push({ uid: target.uid, stat: c.stat, amount: c.amount ?? 1 });
        }
        break;
      default:
        throw new Error('该道具不能在战斗中使用');
    }
    u.items.splice(index, 1);
    this.finishAction(u);
    return out;
  }

  /** 开启脚下的宝箱 */
  openChest(u: Unit): ActionOutcome {
    const out = this.emptyOutcome('chest', u);
    const c = this.chestAt(u.x, u.y);
    if (!c) throw new Error('这里没有宝箱');
    if (!getClass(u.classId).canOpenChests) {
      const ki = u.items.indexOf('chest_key');
      if (ki < 0) throw new Error('需要宝箱钥匙');
      u.items.splice(ki, 1);
    }
    c.opened = true;
    out.loot.push(this.giveLoot(u, c.item, c.gold));
    this.fire({ on: 'chest', x: c.x, y: c.y }, u);
    this.finishAction(u);
    return out;
  }

  /** 拜访村庄 */
  visit(u: Unit): ActionOutcome {
    const out = this.emptyOutcome('village', u);
    const v = this.villageAt(u.x, u.y);
    if (!v) throw new Error('这里没有可拜访的村庄');
    v.visited = true;
    if (v.def.item || v.def.gold) out.loot.push(this.giveLoot(u, v.def.item, v.def.gold));
    this.fire({ on: 'visit', x: v.x, y: v.y }, u);
    this.finishAction(u);
    return out;
  }

  /** 偷窃（敌方随身的非武器道具） */
  steal(u: Unit, target: Unit): ActionOutcome {
    const out = this.emptyOutcome('steal', u);
    const idx = target.items.findIndex((i) => ITEMS[i]?.kind !== 'weapon');
    if (idx < 0) throw new Error('没有可偷的东西');
    const item = target.items.splice(idx, 1)[0];
    if (target.drop === item) target.drop = undefined;
    out.loot.push(this.giveLoot(u, item));
    this.pushExp(out, u, 10);
    this.finishAction(u);
    return out;
  }

  /** 交谈 */
  talk(u: Unit, target: Unit): ActionOutcome {
    const out = this.emptyOutcome('talk', u);
    const ev = this.findTalk(u, target);
    if (!ev) throw new Error('没有可以交谈的内容');
    turnToward(u, target);
    turnToward(target, u);
    this.fired.add(ev.id);
    this.eventQueue.push(...ev.do);
    // 交谈不消耗行动（经典规则：交谈后仍可行动），但本作为了节奏统一，交谈后可继续攻击
    return out;
  }

  /** 待机（结束行动） */
  wait(u: Unit, facing?: Facing): ActionOutcome {
    const out = this.emptyOutcome('wait', u);
    if (facing) u.facing = facing;
    this.finishAction(u, false);
    return out;
  }

  /** 敌方：摧毁村庄 */
  destroyVillage(u: Unit): ActionOutcome {
    const out = this.emptyOutcome('destroy', u);
    const v = this.villages.find((v) => v.x === u.x && v.y === u.y && !v.destroyed && !v.visited);
    if (v) {
      v.destroyed = true;
      this.setTile(v.x, v.y, 'ruins');
      out.message = '村庄被摧毁了……';
    }
    this.finishAction(u);
    return out;
  }

  /** 敌方盗贼：抢夺宝箱 */
  lootChest(u: Unit): ActionOutcome {
    const out = this.emptyOutcome('chest', u);
    const c = this.chestAt(u.x, u.y);
    if (c) {
      c.opened = true;
      u.loot = { item: c.item, gold: c.gold };
      if (c.item) u.drop = c.item;
      out.message = `${u.name}抢走了宝箱里的东西！`;
    }
    this.finishAction(u);
    return out;
  }

  /** 战斗中换装：背包里的装备与当前装备交换（不消耗行动） */
  equipFromBag(u: Unit, bagIndex: number): boolean {
    const id = u.items[bagIndex];
    const it = id ? ITEMS[id] : undefined;
    if (!it || !canEquip(u, it)) return false;
    const slot = it.weapon ? 'weapon' : it.armor ? 'armor' : 'accessory';
    const old = u.equipment[slot];
    u.equipment[slot] = id;
    u.items.splice(bagIndex, 1);
    if (old) u.items.push(old);
    // 体力上限可能因装备变化，保持比例
    u.hp = Math.min(u.hp, maxHp(u));
    return true;
  }

  /** 单位撤离战场（敌方盗贼逃脱等） */
  escape(u: Unit) {
    u.gone = true;
    u.done = true;
    this.checkOutcome();
  }

  setTile(x: number, y: number, t: TerrainId) {
    this.map.tiles[y][x] = t;
    this.tileChanges.push({ x, y, t });
  }

  takeTileChanges(): { x: number; y: number; t: TerrainId }[] {
    const c = this.tileChanges;
    this.tileChanges = [];
    return c;
  }

  private giveLoot(u: Unit, item?: string, gold?: number): Loot {
    const loot: Loot = { item, gold };
    if (gold) this.goldGained += gold;
    if (item) {
      if (u.team === 'player' && u.items.length < 4 && ITEMS[item]?.kind !== 'treasure') {
        u.items.push(item);
        loot.to = 'bag';
      } else {
        this.convoyGained.push(item);
        loot.to = 'convoy';
      }
    }
    return loot;
  }

  private pushExp(out: ActionOutcome, u: Unit, amount: number) {
    if (u.team !== 'player' || !u.alive) return;
    const before = u.exp;
    const lv = gainExp(u, amount, this.rng);
    out.exp.push({ uid: u.uid, amount, before, levelUp: lv });
  }

  private grantCombatExp(out: ActionOutcome, me: Unit, targets: Unit[], strikes: StrikeResult[]) {
    if (me.team !== 'player' || !me.alive) return;
    let total = 0;
    for (const t of targets) {
      const mine = strikes.filter((s) => s.attacker === me.uid && s.defender === t.uid);
      if (!mine.length) continue;
      const dmg = mine.reduce((a, s) => a + s.dmg, 0);
      const anyHit = mine.some((s) => s.hit);
      const killed = mine.some((s) => s.killed);
      total += combatExp(me, t, dmg, killed, anyHit);
    }
    if (total > 0) this.pushExp(out, me, clamp(total, 1, 100));
  }

  /** 处理死亡、掉落、事件 */
  private afterStrikes(out: ActionOutcome, involved: Unit[]) {
    for (const s of out.strikes) {
      const d = this.unit(s.defender);
      if (d) this.fire({ on: 'hp', unit: d.uid, below: 0 }, d);
    }
    for (const u of involved) {
      if (!u.alive && !out.deaths.includes(u.uid)) {
        out.deaths.push(u.uid);
        this.onDeath(u, out);
      }
    }
    for (const s of out.strikes) {
      if (s.killed) {
        const killer = this.unit(s.attacker);
        if (killer) killer.kills++;
      }
    }
  }

  private onDeath(u: Unit, out: ActionOutcome) {
    u.done = true;
    // 掉落
    if (u.team === 'enemy') {
      const killer = this.unit(out.strikes.find((s) => s.defender === u.uid && s.killed)?.attacker ?? out.actor);
      if (u.drop && killer && killer.team === 'player') out.loot.push(this.giveLoot(killer, u.drop));
      if (u.loot?.gold && killer && killer.team === 'player') out.loot.push(this.giveLoot(killer, undefined, u.loot.gold));
    }
    if (u.team === 'player' && u.charId) this.fallen.push(u.uid);
    this.fire({ on: 'defeat', unit: u.uid }, u);
    if (u.team === 'enemy') {
      const n = this.active('enemy').length;
      this.fire({ on: 'remaining', count: n }, u);
    }
    // hold 型的同组单位被惊动
    this.wakeGroup(u);
    // 击破事件若改变了胜利条件（如 Boss 第二形态），须在判定胜负之前生效
    for (const a of this.eventQueue) if (a.do === 'objective' && a.victory) this.victory = a.victory;
    this.checkOutcome();
  }

  private wakeGroup(u: Unit) {
    const g = u.ai && u.ai.type === 'hold' ? u.ai.group : undefined;
    if (!g) return;
    for (const o of this.units) if (o.ai && o.ai.type === 'hold' && o.ai.group === g) o.awake = true;
  }

  /** 行动结束：检查隐藏宝物、占领、脱出 */
  private finishAction(u: Unit, acted = true) {
    if (acted) u.acted = true;
    u.done = true;
    u.origin = undefined;
    if (!u.alive) return;
    // 被攻击的 hold 单位醒来
    if (u.team === 'player') {
      const hid = this.hidden.find((h) => !h.found && h.x === u.x && h.y === u.y);
      if (hid && !acted) {
        hid.found = true;
        const loot = this.giveLoot(u, hid.item, hid.gold);
        this.lastHidden = { uid: u.uid, loot };
      }
    }
    this.checkOutcome();
  }

  /** 最近一次发现的隐藏宝物（表现层读取后清空） */
  lastHidden: { uid: string; loot: Loot } | null = null;

  /* ================================================================ */
  /* 阶段                                                              */
  /* ================================================================ */

  /** 开始某阵营的阶段，返回阶段开始效果 */
  startPhase(phase: Phase): PhaseEffect[] {
    this.phase = phase;
    const fx: PhaseEffect[] = [];
    for (const u of this.active(phase)) {
      const mh = maxHp(u);
      const t = this.map.def(u.x, u.y);
      // 地形回复 / 灼烧
      if (t.heal && u.hp < mh) {
        const a = Math.min(mh - u.hp, Math.max(1, Math.round((mh * t.heal) / 100)));
        u.hp += a;
        fx.push({ uid: u.uid, kind: 'terrain', amount: a });
      }
      if (t.burn) {
        const a = Math.min(u.hp - 1, Math.max(1, Math.round((mh * t.burn) / 100)));
        if (a > 0) {
          u.hp -= a;
          fx.push({ uid: u.uid, kind: 'burn', amount: a });
        }
      }
      // 以逸待劳：上一阶段未移动也未行动 → 按等级回复
      if (u.idle && u.hp < mh && this.turn > 1) {
        const a = Math.min(mh - u.hp, Math.max(2, Math.round(mh * 0.08) + Math.floor(u.level / 3)));
        u.hp += a;
        fx.push({ uid: u.uid, kind: 'rest', amount: a });
      }
      // 饰品
      const acc = u.equipment.accessory ? ITEMS[u.equipment.accessory]?.accessory : undefined;
      if (acc?.special === 'regen' && u.hp < mh) {
        const a = Math.min(mh - u.hp, Math.max(1, Math.round(mh * 0.1)));
        u.hp += a;
        fx.push({ uid: u.uid, kind: 'regen', amount: a });
      }
      if (acc?.special === 'mp_regen' && u.mp < maxMp(u)) {
        const a = Math.min(maxMp(u) - u.mp, 3);
        u.mp += a;
        fx.push({ uid: u.uid, kind: 'mp', amount: a });
      }
      // 中毒
      if (u.status.some((s) => s.id === 'poison')) {
        const a = Math.min(u.hp - 1, Math.max(1, Math.round(mh * 0.1)));
        if (a > 0) {
          u.hp -= a;
          fx.push({ uid: u.uid, kind: 'poison', amount: a });
        }
      }
      // 状态计时
      const sleeping = u.status.some((s) => s.id === 'sleep');
      for (const s of u.status) s.turns -= 1;
      const before = u.status.length;
      u.status = u.status.filter((s) => s.turns > 0);
      if (u.status.length < before) fx.push({ uid: u.uid, kind: 'status_end', amount: 0 });
      u.moved = false;
      u.acted = false;
      u.done = false;
      u.origin = undefined;
      // 沉睡中的单位本阶段无法行动
      if (sleeping && u.status.some((s) => s.id === 'sleep')) u.done = true;
    }
    if (phase === 'player') {
      this.checkTurnOutcome();
    }
    this.fire({ on: 'turn', turn: this.turn, phase });
    return fx;
  }

  /** 结束某阵营阶段：记录「以逸待劳」 */
  endPhase(phase: Phase) {
    for (const u of this.active(phase)) {
      u.idle = !u.moved && !u.acted;
      u.done = true;
    }
  }

  /** 下一阶段：player → ally（若有）→ enemy → 下一回合 */
  nextPhase(): Phase {
    this.endPhase(this.phase);
    let next: Phase;
    if (this.phase === 'player') next = this.active('ally').length ? 'ally' : 'enemy';
    else if (this.phase === 'ally') next = 'enemy';
    else {
      next = 'player';
      this.turn += 1;
    }
    return next;
  }

  /* ================================================================ */
  /* 胜负                                                              */
  /* ================================================================ */

  checkOutcome() {
    if (this.outcome) return;
    const lord = this.lord();
    if (lord && !lord.alive) return this.lose(`${lord.name}倒下了……`);
    for (const d of this.chapter.defeat ?? []) {
      if (d.type === 'unit') {
        const u = this.unit(d.unit);
        if (u && !u.alive) return this.lose(`${u.name}倒下了……`);
      }
    }
    const v = this.victory;
    switch (v.type) {
      case 'rout':
        if (this.active('enemy').length === 0) this.win();
        break;
      case 'boss': {
        const b = this.unit(v.unit);
        if (b && !b.alive) this.win();
        break;
      }
      case 'seize': {
        if (lord && lord.alive && lord.x === v.x && lord.y === v.y && lord.done) this.win();
        break;
      }
      case 'escape': {
        const who = v.unit ? this.unit(v.unit) : lord;
        const [x1, y1, x2, y2] = v.area;
        if (who && who.alive && who.done && who.x >= x1 && who.x <= x2 && who.y >= y1 && who.y <= y2) this.win();
        break;
      }
      default:
        break;
    }
  }

  /** 我方阶段开始时检查：坚守回合数、回合上限 */
  private checkTurnOutcome() {
    if (this.outcome) return;
    if (this.victory.type === 'survive' && this.turn > this.victory.turns) return this.win();
    for (const d of this.chapter.defeat ?? []) {
      if (d.type === 'turns' && this.turn > d.turns) return this.lose('超过了回合限制……');
    }
    if (this.turn > this.turnLimit) this.lose('超过了回合上限……');
  }

  win() {
    if (!this.outcome) this.outcome = 'win';
  }

  lose(reason: string) {
    if (!this.outcome) {
      this.outcome = 'lose';
      this.loseReason = reason;
    }
  }

  /* ================================================================ */
  /* 事件                                                              */
  /* ================================================================ */

  private condOk(e: BattleEvent): boolean {
    if (!e.if) return true;
    if (e.if.startsWith('!')) return !this.flags[e.if.slice(1)];
    return !!this.flags[e.if];
  }

  /** 触发：把满足条件的事件动作放入队列 */
  fire(trig: Trigger, subject?: Unit) {
    for (const e of this.chapter.events) {
      if (!e.repeat && this.fired.has(e.id)) continue;
      if (!this.condOk(e)) continue;
      if (!matches(e.when, trig, subject, this)) continue;
      this.fired.add(e.id);
      this.eventQueue.push(...e.do);
    }
  }

  /** 执行一个非对话动作 */
  applyAction(a: BattleAction): Unit[] {
    const spawned: Unit[] = [];
    switch (a.do) {
      case 'say':
        break;
      case 'spawn':
        for (const p of a.units) {
          // 被占据时就近寻找空位
          const [x, y] = this.freeTileNear(p.x, p.y);
          spawned.push(this.addUnit({ ...p, x, y }));
        }
        break;
      case 'join': {
        const u = this.unit(a.unit);
        if (u) {
          u.team = 'player';
          u.ai = undefined;
          u.awake = true;
          u.model = { ...u.model, team: 'player' };
          if (u.charId && CHARACTERS[u.charId]) {
            u.model = { ...u.model, ...CHARACTERS[u.charId].model, team: 'player' };
          }
          if (!this.joined.includes(u.uid)) this.joined.push(u.uid);
        }
        break;
      }
      case 'leave': {
        const u = this.unit(a.unit);
        if (u) {
          u.gone = true;
          this.checkOutcome();
        }
        break;
      }
      case 'item':
        this.convoyGained.push(a.item);
        break;
      case 'gold':
        this.goldGained += a.amount;
        break;
      case 'flag':
        this.flags[a.flag] = a.value ?? true;
        break;
      case 'ai': {
        const u = this.unit(a.unit);
        if (u) {
          u.ai = a.ai;
          u.awake = !(a.ai.type === 'hold' || a.ai.type === 'wait');
        }
        break;
      }
      case 'tile':
        this.setTile(a.x, a.y, a.t);
        break;
      case 'win':
        this.win();
        break;
      case 'lose':
        this.lose(a.reason ?? '任务失败……');
        break;
      case 'objective':
        this.objectiveText = a.text;
        if (a.victory) this.victory = a.victory;
        this.checkOutcome();
        break;
      case 'heal': {
        const u = this.unit(a.unit);
        if (u) {
          u.hp = maxHp(u);
          u.mp = maxMp(u);
        }
        break;
      }
      case 'camera':
        break;
    }
    return spawned;
  }

  freeTileNear(x: number, y: number): [number, number] {
    if (!this.unitAt(x, y) && this.passableFor(x, y)) return [x, y];
    for (let r = 1; r < 6; r++) {
      for (const [tx, ty] of tilesInRange(this.map, x, y, r, r)) {
        if (!this.unitAt(tx, ty) && this.passableFor(tx, ty)) return [tx, ty];
      }
    }
    return [x, y];
  }

  /* ================================================================ */
  /* 结算                                                              */
  /* ================================================================ */

  /** 战后我方角色的存档数据（HP 全回复由营地处理） */
  partyResults(): Unit[] {
    return this.units.filter((u) => u.team === 'player' && u.charId);
  }

  /** 单位是否还能行动 */
  canAct(u: Unit): boolean {
    return u.alive && !u.gone && !u.done && u.team === this.phase;
  }

  skillsOf(u: Unit): SkillDef[] {
    return skillList(u)
      .map((id) => SKILLS[id])
      .filter((s): s is SkillDef => !!s);
  }
}

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

export function weaponInRange(range: [number, number], d: number): boolean {
  return d >= range[0] && d <= range[1];
}

export function facingFrom(dx: number, dy: number, fallback: Facing): Facing {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'e' : 'w';
  return dy > 0 ? 's' : 'n';
}

export function turnToward(u: Unit, t: Unit) {
  u.facing = facingFrom(t.x - u.x, t.y - u.y, u.facing);
}

/** 武器附带技能：施放不消耗 MP */
export function isFreeCast(u: Unit, s: SkillDef): boolean {
  const w = u.equipment.weapon ? ITEMS[u.equipment.weapon]?.weapon : undefined;
  return !!w?.castSkill && w.castSkill === s.id && !u.skills.includes(s.id);
}

function matches(when: Trigger, trig: Trigger, subject: Unit | undefined, b: Battle): boolean {
  switch (when.on) {
    case 'start':
      return trig.on === 'start';
    case 'turn':
      return trig.on === 'turn' && trig.turn === when.turn && (when.phase ?? 'player') === trig.phase;
    case 'defeat':
      return trig.on === 'defeat' && trig.unit === when.unit;
    case 'enter': {
      if (trig.on !== 'enter' || !subject) return false;
      if (when.unit && subject.uid !== when.unit) return false;
      if (when.team && subject.team !== when.team) return false;
      if (!when.team && !when.unit && subject.team !== 'player') return false;
      const [x1, y1, x2, y2] = when.area;
      return subject.x >= x1 && subject.x <= x2 && subject.y >= y1 && subject.y <= y2;
    }
    case 'talk':
      return false; // 由 talk() 直接处理
    case 'hp': {
      if (trig.on !== 'hp' || !subject || subject.uid !== when.unit) return false;
      return subject.alive && subject.hp <= maxHp(subject) * when.below;
    }
    case 'visit':
      return trig.on === 'visit' && trig.x === when.x && trig.y === when.y;
    case 'remaining':
      return trig.on === 'remaining' && trig.count <= when.count && b.active('enemy').length <= when.count;
    case 'chest':
      return trig.on === 'chest' && trig.x === when.x && trig.y === when.y;
  }
}
