/**
 * 游戏进度与存档
 */
import { getClass } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { ITEMS } from '@/data/items';
import { newSaveFromCharacter, powerLevel, toSave, type UnitSave } from './unit';
import type { Battle } from './battle/battle';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameState {
  version: 1;
  /** 下一个要进行的章节序号（CHAPTERS 数组下标） */
  chapterIndex: number;
  /** 当前所处的流程阶段 */
  stage: 'intro' | 'camp' | 'battle' | 'outro' | 'ending';
  gold: number;
  party: UnitSave[];
  /** 公共仓库（可重复） */
  convoy: string[];
  flags: Record<string, boolean | number>;
  /** 羁绊点数 key = "a|b"（字典序） */
  bonds: Record<string, number>;
  /** 已观看的羁绊对话 "a|b|C" */
  supportsSeen: string[];
  campTalksSeen: string[];
  /** 秒 */
  playtime: number;
  difficulty: Difficulty;
  /** 秘密商店已解锁 */
  secretShop: boolean;
  record: { battles: number; kills: number; turns: number };
}

export function newGame(difficulty: Difficulty = 'normal'): GameState {
  return {
    version: 1,
    chapterIndex: 0,
    stage: 'intro',
    gold: 600,
    party: [],
    convoy: ['herb', 'herb', 'herb'],
    flags: {},
    bonds: {},
    supportsSeen: [],
    campTalksSeen: [],
    playtime: 0,
    difficulty,
    secretShop: false,
    record: { battles: 0, kills: 0, turns: 0 },
  };
}

export function member(s: GameState, id: string): UnitSave | undefined {
  return s.party.find((p) => p.id === id);
}

/** 角色加入队伍（已在队伍中则忽略） */
export function joinParty(s: GameState, id: string, from?: UnitSave) {
  if (member(s, id)) return;
  if (!CHARACTERS[id]) return;
  s.party.push(from ?? newSaveFromCharacter(id));
}

export function leaveParty(s: GameState, id: string) {
  const m = member(s, id);
  if (!m) return;
  // 装备与道具进仓库（专属道具一并保留）
  for (const it of [...m.items, m.equipment.weapon, m.equipment.armor, m.equipment.accessory]) {
    if (it && ITEMS[it]?.price !== undefined && !ITEMS[it]?.personal) s.convoy.push(it);
  }
  s.party = s.party.filter((p) => p.id !== id);
}

export function bondKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function countItem(s: GameState, id: string): number {
  let n = s.convoy.filter((i) => i === id).length;
  for (const p of s.party) n += p.items.filter((i) => i === id).length;
  return n;
}

/** 龙鳞残片收集数 */
export function dragonScales(s: GameState): number {
  return countItem(s, 'dragon_scale');
}

/* ------------------------------------------------------------------ */
/* 战斗结算                                                            */
/* ------------------------------------------------------------------ */

export interface BattleReport {
  gold: number;
  items: string[];
  joined: string[];
  fallen: string[];
  turns: number;
  kills: number;
}

/** 把战斗结果写回存档（胜利时调用） */
export function applyBattleResult(s: GameState, b: Battle, bondGains: Record<string, number>): BattleReport {
  const report: BattleReport = { gold: b.goldGained, items: [...b.convoyGained], joined: [], fallen: [], turns: b.turn, kills: 0 };
  for (const u of b.partyResults()) {
    const id = u.charId!;
    const prev = member(s, id);
    const save = toSave(u, prev);
    save.battles = (prev?.battles ?? 0) + 1;
    save.fallen = !u.alive;
    if (!u.alive) report.fallen.push(id);
    report.kills += u.kills - (prev?.kills ?? 0);
    if (prev) Object.assign(prev, save);
    else {
      s.party.push(save);
      report.joined.push(id);
    }
  }
  s.gold += b.goldGained;
  s.convoy.push(...b.convoyGained);
  for (const [k, v] of Object.entries(bondGains)) s.bonds[k] = (s.bonds[k] ?? 0) + v;
  Object.assign(s.flags, b.flags);
  s.record.battles += 1;
  s.record.kills += report.kills;
  s.record.turns += b.turn;
  return report;
}

/* ------------------------------------------------------------------ */
/* 教会                                                                */
/* ------------------------------------------------------------------ */

export function reviveCost(save: UnitSave): number {
  return 50 * powerLevel(save);
}

export function revive(s: GameState, id: string): boolean {
  const m = member(s, id);
  if (!m || !m.fallen) return false;
  const cost = reviveCost(m);
  if (s.gold < cost) return false;
  s.gold -= cost;
  m.fallen = false;
  return true;
}

/* ------------------------------------------------------------------ */
/* 商店 / 仓库                                                          */
/* ------------------------------------------------------------------ */

export function buy(s: GameState, itemId: string, price?: number): boolean {
  const it = ITEMS[itemId];
  const p = price ?? it?.price ?? 0;
  if (!it || p <= 0 || s.gold < p) return false;
  s.gold -= p;
  s.convoy.push(itemId);
  return true;
}

export function sellPrice(itemId: string): number {
  const it = ITEMS[itemId];
  if (!it || it.kind === 'treasure' || it.kind === 'promotion') return 0;
  if (it.price > 0) return Math.floor(it.price / 2);
  // 非卖品按稀有度估价
  return it.personal ? 0 : 400 * (it.rarity ?? 1);
}

export function sell(s: GameState, convoyIndex: number): boolean {
  const id = s.convoy[convoyIndex];
  const p = id ? sellPrice(id) : 0;
  if (p <= 0) return false;
  s.convoy.splice(convoyIndex, 1);
  s.gold += p;
  return true;
}

/** 从仓库拿到某人的背包 */
export function giveToMember(s: GameState, convoyIndex: number, id: string): boolean {
  const m = member(s, id);
  const it = s.convoy[convoyIndex];
  if (!m || !it || m.items.length >= 4) return false;
  s.convoy.splice(convoyIndex, 1);
  m.items.push(it);
  return true;
}

export function storeFromMember(s: GameState, id: string, bagIndex: number): boolean {
  const m = member(s, id);
  if (!m || bagIndex < 0 || bagIndex >= m.items.length) return false;
  s.convoy.push(m.items.splice(bagIndex, 1)[0]);
  return true;
}

/** 从仓库装备到某人（旧装备回到仓库） */
export function equipFromConvoy(s: GameState, convoyIndex: number, id: string): boolean {
  const m = member(s, id);
  const itemId = s.convoy[convoyIndex];
  const it = itemId ? ITEMS[itemId] : undefined;
  if (!m || !it) return false;
  const cls = getClass(m.classId);
  if (it.personal && it.personal !== m.id) return false;
  let slot: 'weapon' | 'armor' | 'accessory';
  if (it.weapon) {
    if (!cls.weapons.includes(it.weapon.type)) return false;
    slot = 'weapon';
  } else if (it.armor) {
    if (!cls.armors.includes(it.armor.type)) return false;
    slot = 'armor';
  } else if (it.accessory) slot = 'accessory';
  else return false;
  s.convoy.splice(convoyIndex, 1);
  const old = m.equipment[slot];
  if (old) s.convoy.push(old);
  m.equipment[slot] = itemId;
  return true;
}

export function unequip(s: GameState, id: string, slot: 'weapon' | 'armor' | 'accessory'): boolean {
  const m = member(s, id);
  if (!m || !m.equipment[slot]) return false;
  s.convoy.push(m.equipment[slot]!);
  m.equipment[slot] = undefined;
  return true;
}

/** 转职后，若当前装备不再可用则卸下 */
export function fixEquipment(s: GameState, id: string) {
  const m = member(s, id);
  if (!m) return;
  const cls = getClass(m.classId);
  const w = m.equipment.weapon ? ITEMS[m.equipment.weapon] : undefined;
  if (w?.weapon && !cls.weapons.includes(w.weapon.type)) unequip(s, id, 'weapon');
  const a = m.equipment.armor ? ITEMS[m.equipment.armor] : undefined;
  if (a?.armor && !cls.armors.includes(a.armor.type)) unequip(s, id, 'armor');
}

/** 从队伍或仓库中消耗一个道具 */
export function consumeItem(s: GameState, id: string): boolean {
  const i = s.convoy.indexOf(id);
  if (i >= 0) {
    s.convoy.splice(i, 1);
    return true;
  }
  for (const p of s.party) {
    const j = p.items.indexOf(id);
    if (j >= 0) {
      p.items.splice(j, 1);
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 存档                                                                */
/* ------------------------------------------------------------------ */

export const SAVE_SLOTS = 4;
const KEY = (slot: number) => `emberoath.save.${slot}`;

export interface SaveMeta {
  slot: number;
  chapterIndex: number;
  chapterTitle: string;
  playtime: number;
  savedAt: number;
  leaderLevel: number;
  partySize: number;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(slot: number, s: GameState, chapterTitle: string): boolean {
  const st = storage();
  if (!st) return false;
  const lead = s.party.find((p) => p.id === 'rein') ?? s.party[0];
  const meta: SaveMeta = {
    slot,
    chapterIndex: s.chapterIndex,
    chapterTitle,
    playtime: s.playtime,
    savedAt: Date.now(),
    leaderLevel: lead ? lead.level : 1,
    partySize: s.party.length,
  };
  try {
    st.setItem(KEY(slot), JSON.stringify({ meta, state: s }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: number): GameState | null {
  const st = storage();
  if (!st) return null;
  try {
    const raw = st.getItem(KEY(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as { state: GameState };
    return data.state;
  } catch {
    return null;
  }
}

export function listSaves(): (SaveMeta | null)[] {
  const st = storage();
  const out: (SaveMeta | null)[] = [];
  for (let i = 0; i < SAVE_SLOTS; i++) {
    try {
      const raw = st?.getItem(KEY(i));
      out.push(raw ? (JSON.parse(raw) as { meta: SaveMeta }).meta : null);
    } catch {
      out.push(null);
    }
  }
  return out;
}

export function deleteSave(slot: number) {
  try {
    storage()?.removeItem(KEY(slot));
  } catch {
    /* 忽略 */
  }
}

/* ------------------------------------------------------------------ */
/* 中断存档（战斗中途，读取后即删除）                                    */
/* ------------------------------------------------------------------ */

const SUSPEND_KEY = 'emberoath.suspend';

export interface SuspendData {
  state: GameState;
  battle: import('./battle/battle').BattleSnapshot;
  savedAt: number;
}

export function saveSuspend(state: GameState, battle: SuspendData['battle']): boolean {
  try {
    storage()?.setItem(SUSPEND_KEY, JSON.stringify({ state, battle, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadSuspend(): SuspendData | null {
  try {
    const raw = storage()?.getItem(SUSPEND_KEY);
    return raw ? (JSON.parse(raw) as SuspendData) : null;
  } catch {
    return null;
  }
}

export function clearSuspend() {
  try {
    storage()?.removeItem(SUSPEND_KEY);
  } catch {
    /* 忽略 */
  }
}
