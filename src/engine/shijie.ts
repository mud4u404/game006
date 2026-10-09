/**
 * 世界状态（docs/huo-shijie.md 3.2，活的江湖第二版第一片之 1A）。
 * - 势力有实力、财力、据点、好恶、对你的账；地方有治安、繁荣、物价、主人、痕迹；人有处境（伤、牢、走）。
 * - 写在内容里的是本来的样子（FactionDef、RoomLife），存档里的是眼下的样子（GameState.w）。
 * - tickWorld：跨过一个江湖日跑一次，从 w.day 逐日补到今天（静修十日就跑十次）。只管慢变：
 *   实力、治安、物价慢慢回到本来，痕迹到期擦掉，伤好了，牢坐满了。
 * - 世界相关的随机全出自种子（worldRng）：同一个种子、同样的操作，跑出同一个江湖。世界相关的引擎文件里不许用浏览器自带的随机数（tests/huo.test.ts 查）。
 * - 数不进人物的嘴：治安、实力、好恶都不显示，只通过人的话、地方的痕迹、价钱让玩家感到（文风第四条）。
 *
 * 注意：core/state.ts 的 newGame 开局就要 initWorld，这里和 core/state.ts 互相引用。
 * 所以 initWorld 和它用到的东西只用函数声明和内容表，不用本文件顶层的常量（先读本文件时，常量还没赋值）。
 */
import { mulberry32, seedOf } from './rng';
import { FACTIONS, ROOMS, facById, npc, room } from '../content';
import type { PersonSt, Range, RoomLife, WorldCond, WorldEffect } from '../content/types';
import { S, type GameState } from '../core/state';
import { dayNo } from '../core/time';

/** 地方的痕迹：写进地点描写底下的一句。k 是种类，同一处同一种只留最新的一条；until 是哪一日擦掉（江湖日） */
export interface Mark { k: string; text: string; until: number }
export interface FacState {
  power: number; wealth: number; holds: string[];
  rel: Record<string, number>;
  /** 对你的账：恩为正、怨为负（负一百到一百） */
  you: number;
}
export interface PlaceState { order: number; prosper: number; price: number; owner?: string; marks: Mark[] }
/** 人的处境，只存变了的。st 到 until 那一日为止（不写 until 的，要等 free）；at 是事件打断作息：这几日在哪 */
export interface PersonState {
  st?: Exclude<PersonSt, 'ok'>;
  until?: number;
  at?: { room: string; slot?: 'day' | 'night'; until: number };
}
export interface WorldState {
  /** 世界种子：开局定下（seedOf(名字, 开局的现实时刻)） */
  seed: number;
  /** 种子随机已经取了几回：存进存档，重载以后接着往下取 */
  rn: number;
  /** 世界算到了哪一日（core/time.ts 的 dayNo）。tickWorld 从这里逐日补到今天 */
  day: number;
  fac: Record<string, FacState>;
  place: Record<string, PlaceState>;
  ppl: Record<string, PersonState>;
}

/** 坐牢的人在哪儿 */
export const JAIL = 'yz_fuya_lao';
/** 一口气最多补跑几日：再久的，前头的日子数早已回到本来，不必一日日算 */
export const TICK_CAP = 120;

const r2 = (x: number): number => Math.round(x * 100) / 100;
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

/** 一处地方本来的样子：没写 life 的地方（只在上面留过痕迹），按寻常街巷算 */
function baseOf(id: string): RoomLife {
  return ROOMS.find(r => r.id === id)?.life ?? { order: 60, prosper: 50, tags: [] };
}

/** 按内容铺出开局的世界：势力照 FactionDef，地方照 RoomLife；据点由地方的 owner 定 */
export function initWorld(seed: number, day: number): WorldState {
  const fac: Record<string, FacState> = {};
  for (const f of FACTIONS) fac[f.id] = { power: f.power, wealth: f.wealth, holds: [], rel: { ...(f.rel ?? {}) }, you: 0 };
  const place: Record<string, PlaceState> = {};
  for (const r of ROOMS) {
    if (!r.life) continue;
    place[r.id] = { order: r.life.order, prosper: r.life.prosper, price: r.life.price ?? 100, marks: [] };
    if (r.life.owner) {
      place[r.id].owner = r.life.owner;
      fac[r.life.owner]?.holds.push(r.id);
    }
  }
  return { seed: seed >>> 0, rn: 0, day, fac, place, ppl: {} };
}

/**
 * 存档里的世界补齐（core/save.ts 的 repair）：内容里后来添的势力、地方补上开局的样子，缺的字段补上。可以反复跑
 */
export function fillWorld(w: WorldState, seed: number, day: number): WorldState {
  const fresh = initWorld(seed, day);
  if (typeof w.seed !== 'number') w.seed = fresh.seed;
  if (typeof w.rn !== 'number') w.rn = 0;
  if (typeof w.day !== 'number') w.day = day;
  w.fac = w.fac && typeof w.fac === 'object' ? w.fac : {};
  w.place = w.place && typeof w.place === 'object' ? w.place : {};
  w.ppl = w.ppl && typeof w.ppl === 'object' ? w.ppl : {};
  for (const [id, f] of Object.entries(fresh.fac)) {
    const cur = w.fac[id];
    if (!cur) { w.fac[id] = f; continue; }
    if (!Array.isArray(cur.holds)) cur.holds = [];
    if (!cur.rel || typeof cur.rel !== 'object') cur.rel = {};
    if (typeof cur.you !== 'number') cur.you = 0;
  }
  for (const [id, p] of Object.entries(fresh.place)) {
    const cur = w.place[id];
    if (!cur) {
      w.place[id] = p;
      // 新添的据点：主人那边记上
      if (p.owner && w.fac[p.owner] && !w.fac[p.owner].holds.includes(id)) w.fac[p.owner].holds.push(id);
      continue;
    }
    if (!Array.isArray(cur.marks)) cur.marks = [];
  }
  return w;
}

/** 这个存档的世界；没有就按名字和开局时刻铺一个（测试里拼的半截存档也走得通） */
export function worldOf(s: GameState = S): WorldState {
  if (!s.w) s.w = initWorld(seedOf(s.name, s.real?.start ?? 0), dayNo(s));
  return s.w;
}

/* ---------- 随机归种子 ---------- */

/** 世界的随机数 [0, 1)：种子加上取过几回，算出这一回的；取一回记一回，存档重载后接着走 */
export function worldRng(): number {
  const w = worldOf();
  const r = mulberry32(seedOf(w.seed, w.rn))();
  w.rn++;
  return r;
}
/** 用世界的随机挑一个 */
export const worldPick = <T>(arr: readonly T[]): T => arr[Math.floor(worldRng() * arr.length)];

/* ---------- 慢变 ---------- */

/** 一处据点一日的进项：码头、盐号多，别的少 */
function income(id: string): number {
  const tags = baseOf(id).tags;
  return tags.includes('码头') || tags.includes('盐') ? 2 : 0.5;
}

/** 过一日：实力、治安、物价慢慢回到本来，痕迹到期擦掉，伤好了，牢坐满了。w.day 先加一再算 */
export function dayPass(w: WorldState): void {
  w.day++;
  for (const [id, f] of Object.entries(w.fac)) {
    const def = facById(id);
    if (!def) continue;
    // 据点养人：财力每日加进项、减一份开销
    f.wealth = r2(clamp(f.wealth + f.holds.reduce((a, h) => a + income(h), 0) - 1, 0, 100));
    // 被打下去的实力，每日往本来的数靠四分
    f.power = r2(clamp(f.power + (def.power - f.power) * 0.04, 0, 100));
  }
  for (const [id, p] of Object.entries(w.place)) {
    const b = baseOf(id);
    p.order = r2(clamp(p.order + (b.order - p.order) * 0.05, 0, 100));
    p.prosper = r2(clamp(p.prosper + (b.prosper - p.prosper) * 0.05, 0, 100));
    // 物价往本来（不写为一百）靠三分，封顶在五十到二百：手机上的数不能失控
    p.price = r2(clamp(p.price + ((b.price ?? 100) - p.price) * 0.03, 50, 200));
    p.marks = p.marks.filter(m => m.until > w.day);
  }
  for (const [id, p] of Object.entries(w.ppl)) {
    if (p.st && p.st !== 'dead' && p.until !== undefined && p.until <= w.day) { delete p.st; delete p.until; }
    if (p.at && p.at.until <= w.day) delete p.at;
    if (!p.st && !p.at) delete w.ppl[id];
  }
}

/** 江湖往前走：从世界算到的那一日逐日补到今天。界面每次画（ui/shell.ts）、静修（engine/shiguang.ts）都跑，可以反复跑 */
export function tickWorld(s: GameState = S): void {
  const w = worldOf(s), today = dayNo(s);
  if (w.day >= today) return;
  if (today - w.day > TICK_CAP) w.day = today - TICK_CAP;
  while (w.day < today) dayPass(w);
}

/* ---------- 读 ---------- */

/** 这处地方眼下归谁（没有活气的地方没有主人） */
export function ownerOf(place: string, s: GameState = S): string | undefined {
  const p = worldOf(s).place[place];
  return p ? p.owner : ROOMS.find(r => r.id === place)?.life?.owner;
}

/** 这个人眼下的处境：到期的不算 */
export function stOf(id: string, s: GameState = S): PersonSt {
  const p = worldOf(s).ppl[id];
  if (!p?.st) return 'ok';
  if (p.st === 'dead' || p.until === undefined || p.until > dayNo(s)) return p.st;
  return 'ok';
}

const nightAt = (min: number): boolean => { const h = Math.floor(min / 60); return h >= 21 || h < 5; };

/**
 * 此刻这个人在哪儿，由世界定：返回地点 id 是「只在这里」，null 是「哪儿都不在」，undefined 是「照作息」。
 * 先后：事件打断（at，在 until 那日之前、在那个时段）＞ 处境（坐牢只在府衙大牢；伤了、走了、死了哪儿都不在）＞ 作息
 */
export function whereNow(id: string, s: GameState = S): string | null | undefined {
  const p = worldOf(s).ppl[id];
  if (!p) return undefined;
  const today = dayNo(s);
  if (p.at && p.at.until > today && (!p.at.slot || (p.at.slot === 'night') === nightAt(s.min))) return p.at.room;
  const st = stOf(id, s);
  if (st === 'ok') return undefined;
  return st === 'jailed' ? JAIL : null;
}

/** 由世界放到这处的人（事件打断到这里的、坐牢的）：obj 为真只要物件 */
export function placedHere(roomId: string, obj: boolean, s: GameState = S): string[] {
  return Object.keys(worldOf(s).ppl).filter(id => !!npc(id)?.obj === obj && whereNow(id, s) === roomId);
}

/** 这处地方眼下的痕迹：没到期的，新的在前，最多两行 */
export function marksOf(place: string, s: GameState = S): string[] {
  const today = dayNo(s);
  return (worldOf(s).place[place]?.marks ?? []).filter(m => m.until > today).slice(0, 2).map(m => m.text);
}

const inRange = (v: number, r?: Range): boolean => !r || ((r.below === undefined || v < r.below) && (r.atLeast === undefined || v >= r.atLeast));

/** 条件 Cond.w（engine/dsl.ts 的 test 调它） */
export function testWorld(c: WorldCond, s: GameState = S): boolean {
  const w = worldOf(s);
  if (c.owner && !c.owner.is.includes(ownerOf(c.owner.place, s) ?? null)) return false;
  if (c.order && !inRange(w.place[c.order.place]?.order ?? baseOf(c.order.place).order, c.order)) return false;
  if (c.price && !inRange(w.place[c.price.place]?.price ?? 100, c.price)) return false;
  if (c.fac) {
    const f = w.fac[c.fac.id];
    if (!f || !inRange(f.power, c.fac.power) || !inRange(f.you, c.fac.you)) return false;
  }
  if (c.p && !c.p.st.includes(stOf(c.p.id, s))) return false;
  return true;
}

/* ---------- 写 ---------- */

/** 这处地方在存档里的样子；没写 life 的地方，头一回留痕迹时按寻常街巷铺上 */
function placeState(w: WorldState, id: string): PlaceState {
  if (!w.place[id]) {
    const b = baseOf(id);
    w.place[id] = { order: b.order, prosper: b.prosper, price: b.price ?? 100, marks: [] };
  }
  return w.place[id];
}

/** 换主人：据点从原来的主人那里划走，记到新主人名下 */
export function setOwner(w: WorldState, place: string, to: string | null): void {
  const p = placeState(w, place);
  for (const f of Object.values(w.fac)) f.holds = f.holds.filter(h => h !== place);
  if (to) { p.owner = to; w.fac[to]?.holds.push(place); } else delete p.owner;
}

/** 留一条痕迹：同一种只留最新的一条，每处最多两行（新的在前） */
export function addMark(w: WorldState, place: string, k: string, text: string, until: number): void {
  const p = placeState(w, place);
  p.marks = [{ k, text, until }, ...p.marks.filter(m => m.k !== k)].slice(0, 2);
}

/** 人的痕迹用的种类键：一个人一条 */
const personKey = (id: string): string => 'p:' + id;

/** 世界的效果（engine/dsl.ts 的 run 调它；存档迁移也用它，所以世界和「今天」都传进来） */
export function applyWorld(w: WorldState, e: WorldEffect, today: number): void {
  switch (e.op) {
    case 'owner': setOwner(w, e.place, e.to); break;
    case 'power': case 'wealth': {
      const f = w.fac[e.fac];
      if (f) f[e.op] = r2(clamp(f[e.op] + e.delta, 0, 100));
      break;
    }
    case 'order': case 'prosper': {
      const p = placeState(w, e.place);
      p[e.op] = r2(clamp(p[e.op] + e.delta, 0, 100));
      break;
    }
    case 'price': {
      const p = placeState(w, e.place);
      p.price = r2(clamp(p.price + e.delta, 50, 200));
      break;
    }
    case 'you': {
      const f = w.fac[e.fac];
      if (f) f.you = r2(clamp(f.you + e.delta, -100, 100));
      break;
    }
    case 'mark': addMark(w, e.place, e.k, e.text, today + e.days); break;
    case 'free': {
      delete w.ppl[e.npc];
      for (const p of Object.values(w.place)) p.marks = p.marks.filter(m => m.k !== personKey(e.npc));
      break;
    }
    case 'hurt': case 'jail': case 'gone': {
      const st = e.op === 'hurt' ? 'hurt' : e.op === 'jail' ? 'jailed' : 'gone';
      // 伤不写日子的，三日好；牢和走不写日子的，要等 free
      const days = e.days ?? (e.op === 'hurt' ? 3 : undefined);
      // 新的处境盖过原来的打断：伤了的人不再去守码头
      w.ppl[e.npc] = days === undefined ? { st } : { st, until: today + days };
      if (e.mark) addMark(w, e.mark.place, personKey(e.npc), e.mark.text, today + (days ?? 30));
      break;
    }
  }
}

/** 在当前存档上执行世界的效果 */
export function runWorld(e: WorldEffect, s: GameState = S): void { applyWorld(worldOf(s), e, dayNo(s)); }

/** 势力的名字（找不到的照写 id） */
export const facName = (id: string): string => facById(id)?.name ?? id;

/**
 * 一处地方此刻要交的钱：本处自己的船钱（RoomDef.fare），加上码头主人收的过路钱（life.toll，主人看 life.tollAt 那一处）。
 * 过路钱只在上船这一处收：人走进渡口、街市不收。没有船钱也没有过路钱的返回空
 * （owner 只在真有过路钱要交时写，界面用它说「某某的人守着」）
 */
export function tollOf(to: string, s: GameState = S): { fee: number; owner?: string; base: number; extra: number } | null {
  const r = room(to);
  const base = r.fare ?? 0;
  const owner = r.life?.toll ? ownerOf(r.life.tollAt ?? to, s) : undefined;
  const extra = owner ? r.life!.toll![owner] ?? 0 : 0;
  if (!base && !extra) return null;
  return { fee: base + extra, owner: extra ? owner : undefined, base, extra };
}
