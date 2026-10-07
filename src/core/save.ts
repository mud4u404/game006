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
import { fits } from '../engine/wuxue';
import type { Loadout } from '../engine/wuxue';
import type { Slot } from '../content/types';
import { newGame, skipToYangzhou, type GameState } from './state';
import { dateStr } from './time';

export const SAVE_VERSION = 2;
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

/** 第 n 版升到第 n+1 版的办法。例：2: o => ({ ...o, v: 3, 新字段: 默认值 }) */
const MIGRATIONS: Record<number, (o: Raw) => Raw> = {};

/** 改版前的固定搭配：心法硬接、踏雪闪避、寒江拆招、惊鸿抢攻、断水绝招。旧存档照这个排，成算不变 */
const LEGACY: [Slot, string][] = [['neigong', 'xinfa'], ['qinggong', 'taxue'], ['main', 'hanjiang'], ['off', 'jinghong'], ['ult', 'duanshui']];
const legacyLoadout = (skills: GameState['skills']): Loadout =>
  Object.fromEntries(LEGACY.filter(([, id]) => skills[id])) as Loadout;

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
  if (rec.loadout === undefined) rec.loadout = legacyLoadout(s.skills ?? {});
  for (const k of Object.keys(def)) if (rec[k] === undefined) rec[k] = def[k];
  // 地点没了，送回这一回的起点
  if (!ROOMS.some(r => r.id === s.loc)) s.loc = s.chapter === 0 ? newGame().loc : skipToYangzhou().loc;
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
