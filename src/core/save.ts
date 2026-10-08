/**
 * 存档：读、写、迁移、备份、存档码。
 *
 * 铁律：任何情况下都不悄悄丢掉玩家的存档。
 * - 存档格式改了，就把 SAVE_VERSION 加一，在 MIGRATIONS 里补上从旧版升上来的一步，
 *   再在 tests/fixtures/saves/ 放一份旧版存档。tests/save.test.ts 会逐份读一遍。
 * - 读不出来的存档原样另存一份，不覆盖；标题画面会告诉玩家。
 * - 每天留一份备份，最多三份；重新开始前也先留一份。
 * - 内容里的 id 只增不删（tests/ids.test.ts 把关）；万一存档里的地点已经不存在，送回安全的地方。
 */
import { ROOMS, SKILLS } from '../content';
import { defaultLoadout, fits } from '../engine/wuxue';
import { syncBody } from '../engine/ren';
import { migrateRel } from '../engine/renqing';
import type { Loadout } from '../engine/wuxue';
import type { AttrKey, Slot } from '../content/types';
import { newGame, skipToYangzhou, type GameState } from './state';
import { dateStr } from './time';

export const SAVE_VERSION = 4;
export const KEY = 'jhyy-save-v2';
const META = 'jhyy-save-meta';
const BROKEN = 'jhyy-save-broken-';
const BAK = 'jhyy-bak-';
const BAK_RESTART = 'jhyy-bak-restart';
const BAK_KEEP = 3;

/** 和浏览器的 localStorage 一样的接口，测试时可以换成内存里的 */
export interface SaveStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
  readonly length: number;
}

let store: SaveStore | null = null;
const browserStore = (): SaveStore | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

/** 测试用：换一个存储 */
export const useStore = (s: SaveStore | null): void => { store = s; };
const st = (): SaveStore | null => store ?? browserStore();

type Raw = Record<string, unknown> & { v?: unknown };

/**
 * 第二版的搭配：主手、副手（还没有搭配的更早的存档，按当时的固定搭配排：心法、踏雪、寒江、惊鸿、断水）。
 * 第三版改成拳脚、兵刃两个位置（docs/zhuangbei.md 第二节）：主手、副手里的外功按门类分进去，
 * 同一类的两门，主手那门留下，另一门照样学会，只是不在位置上。青锋剑变成真正的兵器，拿在手里。
 */
const V2_LEGACY: [string, string][] = [['neigong', 'xinfa'], ['qinggong', 'taxue'], ['main', 'hanjiang'], ['off', 'jinghong'], ['ult', 'duanshui']];
function v2toV3(o: Raw): Raw {
  const skills = (o.skills ?? {}) as GameState['skills'];
  const old = (o.loadout ?? Object.fromEntries(V2_LEGACY.filter(([, id]) => skills[id]))) as Record<string, string>;
  const lo: Loadout = {};
  for (const slot of ['neigong', 'qinggong', 'ult'] as Slot[]) if (old[slot]) lo[slot] = old[slot];
  for (const id of [old.main, old.off]) {
    const def = id ? SKILLS.find(k => k.id === id) : undefined;
    const slot: Slot | undefined = def && fits(def, 'fist') ? 'fist' : def && fits(def, 'weapon') ? 'weapon' : undefined;
    if (slot && !lo[slot]) lo[slot] = id;
  }
  const items = { qingfeng: 1, ...((o.items ?? {}) as Record<string, number>) };
  return { ...o, v: 3, loadout: lo, items, gear: { weapon: 'qingfeng' } };
}

/**
 * 第四版：「人」（docs/foundation.md 第三版，大换血第二步）。
 * - 根基换刻度：旧的常人是 13、11、14、13、10，新的常人各二十，按相对常人的比例折算，四舍五入。
 * - 功力以年计：旧的内力上限去掉根基折进去的那一截，一百点算一年。
 * - 伤：新加，没有伤。
 * - 气血、内力上限由「人」算出来（读档时 repair 里算），当前值按原来的比例保留。
 */
const OLD_COMMON: Record<AttrKey, number> = { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 };
function v3toV4(o: Raw): Raw {
  const a = (o.attr ?? {}) as Record<AttrKey, number>;
  const attr = Object.fromEntries((Object.keys(OLD_COMMON) as AttrKey[]).map(k =>
    [k, Math.max(1, Math.min(50, Math.round((20 * (a[k] ?? OLD_COMMON[k])) / OLD_COMMON[k])))])) as Record<AttrKey, number>;
  const applied = (o.attrApplied as { mp?: number } | undefined)?.mp ?? 30 * ((a.根骨 ?? 11) - 11);
  const mpMax = Number(o.mpMax) || 300, hpMax = Number(o.hpMax) || 600;
  const gongli = Math.max(0.5, Math.round(((mpMax - applied) / 100) * 100) / 100);
  const { attrApplied: _drop, ...rest } = o;
  void _drop;
  // 比例先记下，repair 算出新的上限以后按比例还原
  return {
    ...rest, v: 4, attr, gongli, wounds: { hand: 0, foot: 0, inner: 0 },
    hpFrac: Math.max(0.01, Math.min(1, (Number(o.hp) || hpMax) / hpMax)), mpFrac: Math.max(0, Math.min(1, (Number(o.mp) || 0) / mpMax))
  };
}

/** 第 n 版升到第 n+1 版的办法 */
const MIGRATIONS: Record<number, (o: Raw) => Raw> = { 2: v2toV3, 3: v3toV4 };

/** 把读到的东西升到当前版本，补齐缺的字段，修掉指向已不存在内容的地方。不认识的版本直接抛错 */
export function migrate(input: unknown): GameState {
  if (!input || typeof input !== 'object') throw new Error('存档不是对象');
  let o = input as Raw;
  let v = typeof o.v === 'number' ? o.v : NaN;
  if (!(v >= 1)) throw new Error('存档没有版本号');
  if (v > SAVE_VERSION) throw new Error(`存档是第 ${v} 版，比游戏还新`);
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`没有从第 ${v} 版升级的办法`);
    o = step(o);
    v = o.v as number;
  }
  return repair(o as unknown as GameState);
}

function repair(s: GameState): GameState {
  const def = newGame() as unknown as Record<string, unknown>;
  const rec = s as unknown as Record<string, unknown>;
  // 同一版本里后来加的字段，用新游戏的默认值补上
  if (rec.loadout === undefined) rec.loadout = defaultLoadout(s.skills ?? {});
  for (const k of Object.keys(def)) if (rec[k] === undefined) rec[k] = def[k];
  // 关系称谓统一到关系阶梯；气血、内力上限由「人」算出来（都可以反复执行）
  migrateRel(s);
  for (const k of ['hand', 'foot', 'inner'] as const) s.wounds[k] = Math.max(0, Math.min(3, Math.round(Number(s.wounds[k]) || 0)));
  if (!(s.gongli > 0)) s.gongli = 0.5;
  syncBody(s);
  const fr = rec as { hpFrac?: number; mpFrac?: number };
  if (fr.hpFrac !== undefined) { s.hp = Math.max(1, Math.round(s.hpMax * fr.hpFrac)); delete fr.hpFrac; }
  if (fr.mpFrac !== undefined) { s.mp = Math.round(s.mpMax * fr.mpFrac); delete fr.mpFrac; }
  // 地点没了，送回这一回的起点
  if (!ROOMS.some(r => r.id === s.loc)) s.loc = s.chapter === 0 ? newGame().loc : skipToYangzhou().loc;
  // 手里的兵器已经不在行囊里了，就空着手
  if (s.gear.weapon && !(s.items[s.gear.weapon] > 0)) delete s.gear.weapon;
  // 搭配里指向没学会、或已经没有的武功，就空出来
  for (const [slot, id] of Object.entries(s.loadout) as [Slot, string][]) {
    const def = SKILLS.find(k => k.id === id);
    if (!def || !s.skills[id] || !fits(def, slot)) delete s.loadout[slot];
  }
  return s;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export interface ReadResult { state: GameState | null; broken: boolean }

/** 读存档。读不出来时原样另存一份，返回 broken，不会让新游戏把它悄悄覆盖掉 */
export function readSave(): ReadResult {
  const s = st();
  if (!s) return { state: null, broken: false };
  let t: string | null = null;
  try { t = s.getItem(KEY); } catch { return { state: null, broken: false }; }
  if (!t) return { state: null, broken: false };
  try {
    return { state: migrate(JSON.parse(t)), broken: false };
  } catch {
    keepBroken(s, t);
    return { state: null, broken: true };
  }
}

function keepBroken(s: SaveStore, raw: string): void {
  try {
    const keys = listKeys(s, BROKEN);
    if (keys.some(k => s.getItem(k) === raw)) return;
    s.setItem(BROKEN + Date.now(), raw);
  } catch { /* 存不下也不影响游戏 */ }
}

const listKeys = (s: SaveStore, prefix: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(prefix)) out.push(k); }
  return out.sort();
};

/** 每次写完存档后调用，云存档在这里挂上自己（见 net/sync.ts），存档本身不依赖网络 */
const listeners: ((state: GameState) => void)[] = [];
export const onSaved = (fn: (state: GameState) => void): void => { listeners.push(fn); };

/** 写存档，顺手留当天的备份 */
export function writeSave(state: GameState): void {
  for (const fn of listeners) try { fn(state); } catch { /* 云端出错不影响本机存档 */ }
  const s = st();
  if (!s) return;
  try {
    const json = JSON.stringify(state);
    s.setItem(KEY, json);
    s.setItem(META, JSON.stringify({ savedAt: Date.now(), v: SAVE_VERSION }));
    const day = BAK + today();
    if (!s.getItem(day)) {
      s.setItem(day, json);
      const old = listKeys(s, BAK).filter(k => k !== BAK_RESTART);
      for (const k of old.slice(0, Math.max(0, old.length - BAK_KEEP))) s.removeItem(k);
    }
  } catch { /* 隐私模式等情况下存不了，游戏照常进行 */ }
}

/** 最近一次存档的时间（毫秒），没有就是 0 */
export function savedAt(): number {
  try { return JSON.parse(st()?.getItem(META) ?? '{}').savedAt ?? 0; } catch { return 0; }
}

/** 当前进度被清空或替换之前调用；云存档在这里把它收进云上的历史 */
const replacing: ((old: GameState) => void)[] = [];
export const onReplacing = (fn: (old: GameState) => void): void => { replacing.push(fn); };

/** 把当前存档另存一份，留作「上次替换之前」的备份 */
function keepCurrent(s: SaveStore): void {
  const t = s.getItem(KEY);
  if (!t) return;
  s.setItem(BAK_RESTART, t);
  let old: GameState | null = null;
  try { old = migrate(JSON.parse(t)); } catch { /* 读不出来的就只留在本机 */ }
  if (old) for (const fn of replacing) try { fn(old); } catch { /* 云端出错不影响本机 */ }
}

/** 清空前先另存一份，误点了还能找回 */
export function clearSaveSafely(): void {
  const s = st();
  if (!s) return;
  try { keepCurrent(s); s.removeItem(KEY); } catch { /* 同上 */ }
}

/** 用导入的存档码或备份替换当前进度；当前进度先另存一份 */
export function replaceSave(state: GameState): void {
  const s = st();
  if (s) try { keepCurrent(s); } catch { /* 同上 */ }
  writeSave(state);
}

/** 一行看得懂的进度摘要：第一回 · 三月初九 · 沈孤舟 */
export const summary = (s: GameState): string => `${s.chapter === 0 ? '序章' : '第一回'} · ${dateStr(s)} · 沈${s.name}`;

/** 所有备份，新的在前：重新开始前的那份、每天的、读不出来时另存的 */
export function listBackups(): { key: string; label: string; state: GameState | null }[] {
  const s = st();
  if (!s) return [];
  const keys = [BAK_RESTART, ...listKeys(s, BAK).filter(k => k !== BAK_RESTART).reverse(), ...listKeys(s, BROKEN).reverse()];
  return keys.flatMap(k => {
    const t = s.getItem(k);
    if (!t) return [];
    let state: GameState | null = null;
    try { state = migrate(JSON.parse(t)); } catch { /* 读不出来的也列出来，可以导出给维护者 */ }
    const label = k === BAK_RESTART ? '上次重来或导入之前' : k.startsWith(BROKEN) ? '读不出来的旧存档' : '每日备份 ' + k.slice(BAK.length + 5);
    return [{ key: k, label, state }];
  });
}

export const rawBackup = (key: string): string | null => st()?.getItem(key) ?? null;

/* ---------- 存档码：换设备、清缓存前，复制一串字带走 ---------- */

const CODE_HEAD = 'JHYY:';

export function exportCode(state: GameState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return CODE_HEAD + btoa(bin);
}

/** 读存档码；也接受从备份里直接复制出来的原文。认不出来时抛出给玩家看的错误 */
export function importCode(code: string): GameState {
  const t = code.trim();
  let json: string;
  if (t.startsWith(CODE_HEAD)) {
    try {
      const bin = atob(t.slice(CODE_HEAD.length).replace(/\s+/g, ''));
      json = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    } catch { throw new Error('存档码不完整，请整段复制'); }
  } else if (t.startsWith('{')) json = t;
  else throw new Error('这不是存档码，存档码以 JHYY: 开头');
  try { return migrate(JSON.parse(json)); } catch { throw new Error('存档码不完整，请整段复制'); }
}
