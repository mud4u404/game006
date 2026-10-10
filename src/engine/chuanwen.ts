/**
 * 传闻：话有来处（docs/huo-shijie.md 3.4，活的江湖第二版第一片之 1B）。
 * - 一件事的一步生一条传闻（RumorInst），传闻池（NEWS）里条件到了、有人会说的也生一条。文字不进存档，说的时候按出处现取。
 * - 人知道什么记在 w.ppl[id].know：事发时在场的、事情牵涉的、本帮的、那一带的枢纽（说书、叫化）先知道；
 *   以后每日白天、夜里两个时段，同处一地的人互相说，嘴碎的说得多；每传一手可能走一档样；不耸动的事十来日就忘。
 *   夜里说书人把最耸动的一件说给满座，帮里的人互通，叫化子什么都往分舵报。
 * - 外地的事只有跑码头的人（船夫、镖师、脚夫、外乡人）带得进来。
 * - 打听（ask）就是问这个人知道什么：挑你还不知道的，按耸动、离他近、新鲜排；用他的声口开口，听来的说一句听谁说的；
 *   什么都没有，说他自己的日子（voice.idle）。关系管说多少。一人一日问一回。
 * - 出关邸报（dibao）只写真事：你在这一带传开的、熟人托人带的、世事传到耳朵里的。
 * - 随机全出自世界的种子（engine/shijie.ts 的 worldRng），遍历顺序固定：同一个种子，传出来的一字不差。
 *
 * 注意：本文件和 engine/shijie.ts、core/state.ts 互相引用，顶层只放字面量常量，别的模块的东西只在函数里用。
 */
import { S, markSeen, pushFeed, type GameState } from '../core/state';
import { dayNo } from '../core/time';
import { NEWS, NPCS, ROOMS, npc, room, shiById } from '../content';
import type { Cond } from '../content/types';
import type { NpcLife, ShiDef, ShiStep } from '../content/types';
import { pickBranch, test } from './dsl';
import { seedOf } from './rng';
import { learnShi } from './shishi';
import { worldOf, worldPick, worldRng, type Know, type WorldState } from './shijie';
import { npcName, roomNpcs } from './world';

/** 一条传闻（存档里）：出自哪件事的哪一步、哪日、在哪、多耸动、牵涉谁 */
export interface RumorInst {
  id: string;
  /** 出自哪件事：世事 id，或传闻池的 'news:<文字的哈希>' */
  ev: string;
  /** 世事的哪一步（传闻池的为空串） */
  ph: string;
  /** 事发（或传出）的那一日（江湖日） */
  day: number;
  /** 事发（或传出）的地点；外地的事为空串 */
  place: string;
  /** 多耸动（零到一）：越耸动传得越快、记得越久 */
  juice: number;
  /** 牵涉的人、势力：说话的人就是其中之一时，用他自己的说法 */
  subj: string[];
  /** 外地的事：只有跑码头的带得进来 */
  far?: true;
  /** 说的是你（玩家插手推出来的一步） */
  about?: 'you';
  /** 机密：素不相识、点头之交不说（1B 的内容里还没用，留给事件模板） */
  secret?: true;
}

/** 那一带的枢纽：事一出就知道 */
const HUB = ['说书', '叫化'];
/** 跑码头的：外地的事只经他们 */
const RUNNER = ['船夫', '镖师', '脚夫', '外乡人'];
/** 一日两个时段：白天巳时，夜里戌时（说书人这时在望江楼，街上的店还没上门板） */
const SLOTS = [{ k: 'day', min: 600 }, { k: 'night', min: 1200 }];
/** 找目击者时多看一眼的钟点：亥时以后才出来的人（更夫）也看得见 */
const LATE = 1380;
/** 每传一手走一档样的几率；说书人在酒楼说书，一半走样 */
const DRIFT = 0.22;
const DRIFT_SHU = 0.5;
/** 玩家听过的传闻最多记几条 */
const HEARD_MAX = 300;
/** 没人知道、过了这么多日的世事传闻，从存档里清掉 */
const RUMOR_KEEP = 60;
/** 传闻池一日冒出几条；人人都忘了的老话，隔多少日才再被翻出来 */
const NEWS_PER_DAY = 2;
const NEWS_REVIVE = 30;
/** 打听时开口前的样子（没写声口的人用）：一圈问下来别都一个腔调 */
const DATING_LEAD = ['压低了声音', '左右看了看', '凑近了些', '想了想', '往四下里瞟了一眼', '咂了咂嘴', '叹了口气', '把声音放得很低',
  '朝你招招手', '先摆摆手说不该多嘴，到底没忍住', '掰着指头数了数', '吐掉嘴里的草棍'];
/** 关系：说多少 */
const REL_WARM = ['相谈甚欢', '知交', '结拜兄弟', '情缘', '相依为命', '师徒'];
const REL_NOD = ['点头之交'];

/* ---------- 读 ---------- */

/** 人的活气（NpcDef.life） */
export const lifeOf = (id: string): NpcLife | undefined => npc(id)?.life;
/** 有活气的人（内容顺序） */
const lifePeople = (): string[] => NPCS.filter(n => n.life).map(n => n.id);
export const isRunner = (id: string): boolean => RUNNER.includes(lifeOf(id)?.trade ?? '');

let roomsMap: Map<string, string[]> | undefined;
/** 这个人常待的地点（地点的 npcs、objs 里有他，作息写了几处的都算），内容顺序 */
export function roomsOf(id: string): string[] {
  if (!roomsMap) {
    roomsMap = new Map();
    for (const r of ROOMS) {
      for (const x of [...r.npcs, ...(r.objs ?? [])]) {
        const pid = typeof x === 'string' ? x : x.id;
        const list = roomsMap.get(pid) ?? [];
        if (!list.includes(r.id)) list.push(r.id);
        roomsMap.set(pid, list);
      }
    }
  }
  return roomsMap.get(id) ?? [];
}
const regionOfRoom = (id: string): string => ROOMS.find(r => r.id === id)?.region ?? '';
/** 这个人家在哪个地区（常待的头一处）；哪儿都不常待的为空 */
export const homeRegion = (id: string): string => { const r = roomsOf(id)[0]; return r ? regionOfRoom(r) : ''; };

/** 传闻出在哪个地区：世事看事情的地区，传闻池的看传出的地点；外地的事为空 */
export function regionOf(r: RumorInst): string {
  if (r.far) return '';
  if (!isNews(r)) return shiById(r.ev)?.region ?? '';
  return r.place ? regionOfRoom(r.place) : '';
}
const isNews = (r: RumorInst): boolean => r.ev.startsWith('news:');
/** 对这个人来说是外地的事 */
function farFor(r: RumorInst, who: string): boolean {
  if (r.far) return true;
  const reg = regionOf(r), home = homeRegion(who);
  return !!reg && !!home && reg !== home;
}
/** 他知道的传闻 */
export const knowsOf = (w: WorldState, id: string): Know[] => w.ppl[id]?.know ?? [];
const knows = (w: WorldState, id: string, rid: string): Know | undefined => w.ppl[id]?.know?.find(k => k[0] === rid);

/** 传闻池一条话的 id：文字的哈希（不用下标：内容包一增删，下标整体错位，旧存档里的传闻会说成另一句话） */
export const newsId = (text: string): string => 'news:' + seedOf(text).toString(36);
let newsMap: Map<string, string> | undefined;
function newsText(id: string): string | null {
  if (!newsMap?.has(id)) newsMap = new Map(NEWS.map(n => [newsId(n.text), n.text]));
  return newsMap.get(id) ?? null;
}

/** 世事的步排先后：顺着 next 链排，插手才到的结局排在最后 */
function stepRank(d: ShiDef, step: string): number {
  const chain: string[] = [];
  for (let k: string | undefined = d.first; k && d.steps[k] && !chain.includes(k); k = d.steps[k].next?.to) chain.push(k);
  const i = chain.indexOf(step);
  return i < 0 ? chain.length : i;
}
const juiceOf = (step: ShiStep): number => step.juice ?? (step.next ? 0.5 : 0.65);

/**
 * 这条传闻的说法：lv 是走样（零原样、一走了样、二面目全非）。说话的人是当事人、这一步写了他自己的说法的，用他的「我」。
 * 拿不到文字（内容改过、认不出来）返回空
 */
export function rumorText(r: RumorInst, lv: number, speaker?: string): string | null {
  if (isNews(r)) return newsText(r.ev);
  const step = shiById(r.ev)?.steps[r.ph];
  if (!step) return null;
  if (speaker && r.subj.includes(speaker) && step.self?.[speaker]) return step.self[speaker];
  const t = lv >= 2 ? step.news3 ?? step.news2 ?? step.news : lv === 1 ? step.news2 ?? step.news : step.news;
  return t ?? null;
}

/** 玩家已经知道这条传闻了：亲耳听过，或者见闻簿上那件事已经知道到这一步（或更后头） */
export function youKnow(r: RumorInst, s: GameState = S, heard?: Set<string>): boolean {
  if (heard ? heard.has(r.id) : s.heard?.includes(r.id)) return true;
  if (isNews(r)) return false;
  const st = s.shi?.[r.ev], d = shiById(r.ev);
  if (!st || st.seen === undefined || !d) return false;
  return stepRank(d, st.seen) >= stepRank(d, r.ph);
}

/* ---------- 学 ---------- */

/** 这个人收得下这条传闻吗：死了、走了的不收；外地的事只有跑码头的收 */
function canLearn(w: WorldState, who: string, r: RumorInst, day: number): boolean {
  const p = w.ppl[who];
  if (p?.st === 'dead' || (p?.st === 'gone' && (p.until === undefined || p.until > day))) return false;
  return !farFor(r, who) || isRunner(who);
}

/** 他听说了一条传闻。已经知道的不动（档只升不降：不会被更走样的说法盖掉）；返回是不是新学会的 */
export function learn(w: WorldState, who: string, rid: string, lv: number, day: number, from?: string): boolean {
  const r = w.rumor[rid];
  if (!r || knows(w, who, rid) || !canLearn(w, who, r, day)) return false;
  const k: Know = [rid, Math.max(0, Math.min(2, lv)) as 0 | 1 | 2, day];
  if (from) k.push(from);
  ((w.ppl[who] ||= {}).know ||= []).push(k);
  return true;
}

/** 传一手：走不走样 */
const drift = (lv: number, p: number): number => Math.min(2, lv + (worldRng() < p ? 1 : 0));

/* ---------- 生 ---------- */

/** 某个钟点在这处的人（不算物件）：临时把时辰拨过去，看完拨回来 */
function presentAt(place: string, min: number): string[] {
  const m0 = S.min;
  try {
    S.min = min;
    return roomNpcs(place).filter(id => !npc(id)?.obj);
  } finally { S.min = m0; }
}

/**
 * 世事走到一步（engine/shishi.ts 的 goStep 调）：写了 news 的步生一条传闻。
 * 知道的人：事发处白天、夜里在场的，这一带的枢纽（说书、叫化），牵涉的人，牵涉的势力里有活气的人。玩家插手推的记「说的是你」。
 * 返回传闻 id（没写 news 的步为空）
 */
export function shiRumor(d: ShiDef, to: string, at: number, hand: boolean): string | null {
  const step = d.steps[to];
  if (!step?.news) return null;
  const w = worldOf(), day = Math.floor(at / 1440);
  const id = `${d.id}.${to}.${day}`;
  if (w.rumor[id]) return id;
  const place = step.where ?? d.place ?? '';
  const subj = [...new Set([...(d.subj ?? []), ...(step.subj ?? [])])];
  w.rumor[id] = { id, ev: d.id, ph: to, day, place, juice: juiceOf(step), subj, ...(hand ? { about: 'you' as const } : {}) };
  const who: string[] = [];
  if (place) for (const m of [...SLOTS.map(x => x.min), LATE]) who.push(...presentAt(place, m));
  for (const p of lifePeople()) if (HUB.includes(lifeOf(p)!.trade) && homeRegion(p) === d.region) who.push(p);
  for (const x of subj) if (npc(x)) who.push(x);
  for (const p of lifePeople()) { const f = lifeOf(p)!.faction; if (f && subj.includes(f)) who.push(p); }
  for (const x of new Set(who)) learn(w, x, id, 0, day);
  return id;
}

/**
 * 传闻池（NEWS）里条件到了、有人会说的话，生成传闻（tickWorld 跨日时调）。
 * - 只生写了 who、不说玩家的（about 的只在邸报里说）；知道的人是行当、势力对得上 who 的有活气的人；
 *   外地的（far）只给跑码头的（对得上的优先，对不上的给所有跑码头的）。没人会说的不生，下回再看。
 * - 一日只冒出几条（NEWS_PER_DAY，按种子挑）：不然开局一日全冒出来，二十来日后一齐忘光，街上就只剩世事。
 * - 生过的留一个底，不重复生；人人都忘了、隔了一个月的老话，可以再被人翻出来（玩家听过的不再翻）
 */
export function seedNews(w: WorldState, day: number): void {
  const ppl = lifePeople(), heard = new Set(S.heard ?? []);
  let known: Set<string> | undefined;
  const cand: { id: string; who: string[]; far: boolean }[] = [];
  for (const n of NEWS) {
    if (!n.who?.length || n.about) continue;
    const id = newsId(n.text), old = w.rumor[id];
    if (old) {
      if (day - old.day < NEWS_REVIVE || heard.has(id)) continue;
      known ??= new Set(Object.values(w.ppl).flatMap(p => (p.know ?? []).map(k => k[0])));
      if (known.has(id)) continue;
    }
    if (!test(n.if)) continue;
    let who = ppl.filter(p => { const l = lifeOf(p)!; return n.who!.includes(l.trade) || (!!l.faction && n.who!.includes(l.faction)); });
    if (n.far) { const run = who.filter(isRunner); who = run.length ? run : ppl.filter(isRunner); }
    if (who.length) cand.push({ id, who, far: !!n.far });
  }
  for (let i = 0; i < NEWS_PER_DAY && cand.length; i++) {
    const { id, who, far } = cand.splice(Math.floor(worldRng() * cand.length), 1)[0];
    w.rumor[id] = { id, ev: id, ph: '', day, place: far ? '' : roomsOf(who[0])[0] ?? '', juice: far ? 0.45 : 0.4, subj: [], ...(far ? { far: true as const } : {}) };
    for (const x of who) learn(w, x, id, 0, day);
  }
}

/* ---------- 传 ---------- */

/** 他知道的、拿得到文字的传闻，最耸动的在前（越旧越淡） */
function hottest(w: WorldState, who: string, day: number): Know[] {
  const score = (k: Know): number => { const r = w.rumor[k[0]]; return r.juice - 0.03 * (day - r.day); };
  return knowsOf(w, who).filter(k => w.rumor[k[0]] && rumorText(w.rumor[k[0]], k[1]) !== null)
    .map((k, i) => ({ k, i, s: score(k) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.k);
}

let lifeRoomsCache: string[] | undefined;
/** 有活气的人所在地区的全部地点（内容顺序）：传话只在这些地方算 */
function lifeRooms(): string[] {
  if (!lifeRoomsCache) {
    const regs = new Set(lifePeople().map(homeRegion).filter(Boolean));
    lifeRoomsCache = ROOMS.filter(r => regs.has(r.region)).map(r => r.id);
  }
  return lifeRoomsCache;
}

/** 忘：过了 8 + 耸动 × 30 日就忘；没人知道、过了六十日的世事传闻清掉；玩家听过的跟着清 */
function forget(w: WorldState, day: number): void {
  const known = new Set<string>();
  for (const [id, p] of Object.entries(w.ppl)) {
    if (!p.know) continue;
    p.know = p.know.filter(k => { const r = w.rumor[k[0]]; return !!r && day - k[2] < 8 + r.juice * 30; });
    if (p.know.length) { for (const k of p.know) known.add(k[0]); continue; }
    delete p.know;
    if (!p.st && !p.at) delete w.ppl[id];
  }
  // 传闻池的不清：一条留一个底，免得条件一直成立时反复生
  for (const [id, r] of Object.entries(w.rumor)) if (!isNews(r) && !known.has(id) && day - r.day > RUMOR_KEEP) delete w.rumor[id];
  if (S.w === w && S.heard) S.heard = S.heard.filter(id => w.rumor[id]);
}

/** 同处一地：嘴碎的人把自己最耸动的一两件说给旁人。几率 = 嘴碎 ×（0.35 + 耸动 × 0.6），每传一手可能走一档样 */
function chat(w: WorldState, ids: string[], day: number): void {
  for (const sp of ids) {
    const life = lifeOf(sp);
    if (!life || !(life.talk > 0)) continue;
    for (const k of hottest(w, sp, day).slice(0, life.talk >= 0.6 ? 2 : 1)) {
      const r = w.rumor[k[0]];
      for (const ls of ids) {
        if (ls === sp || knows(w, ls, r.id)) continue;
        if (worldRng() < life.talk * (0.35 + 0.6 * r.juice)) learn(w, ls, r.id, drift(k[1], DRIFT), day, sp);
      }
    }
  }
}

/** 夜里说书：把满座还不全知道的、最耸动的一件说给满座听，人人听得到，一半走样 */
function storyteller(w: WorldState, ids: string[], day: number): void {
  for (const sp of ids) {
    if (lifeOf(sp)?.trade !== '说书') continue;
    for (const k of hottest(w, sp, day)) {
      const r = w.rumor[k[0]];
      const fresh = ids.filter(ls => ls !== sp && !knows(w, ls, r.id) && canLearn(w, ls, r, day));
      if (!fresh.length) continue;
      for (const ls of fresh) learn(w, ls, r.id, drift(k[1], DRIFT_SHU), day, sp);
      break;
    }
  }
}

/** 夜里帮里互通：牵涉本帮的事帮内都知道；各人另把最耸动的一两件说给帮里的人。叫化子什么都往丐帮报 */
function network(w: WorldState, day: number): void {
  const ppl = lifePeople().filter(p => { const st = w.ppl[p]?.st; return st !== 'dead' && st !== 'gone'; });
  const facs = [...new Set(ppl.map(p => lifeOf(p)!.faction).filter((f): f is string => !!f))];
  for (const f of facs) {
    const mem = ppl.filter(p => lifeOf(p)!.faction === f);
    if (mem.length < 2) continue;
    for (const a of mem) {
      for (const k of knowsOf(w, a).slice()) {
        if (!w.rumor[k[0]]?.subj.includes(f)) continue;
        for (const b of mem) if (b !== a) learn(w, b, k[0], k[1], day, a);
      }
    }
    chat(w, mem, day);
  }
  const gai = ppl.filter(p => lifeOf(p)!.faction === 'gai');
  for (const a of ppl.filter(p => lifeOf(p)!.trade === '叫化')) {
    for (const k of knowsOf(w, a).slice()) for (const b of gai) if (b !== a) learn(w, b, k[0], k[1], day, a);
  }
}

/**
 * 传一日（engine/shijie.ts 的 tickWorld 每补一日、且是当前存档时调）：先忘，再按白天、夜里两个时段传。
 * 在场的人按此刻的作息、处境算（补跑好几日时，按眼下的样子近似）
 */
export function spreadDay(w: WorldState, day: number): void {
  forget(w, day);
  const slots: { night: boolean; rooms: string[][] }[] = [];
  const m0 = S.min;
  try {
    for (const sl of SLOTS) {
      S.min = sl.min;
      slots.push({ night: sl.k === 'night', rooms: lifeRooms().map(r => roomNpcs(r).filter(id => !npc(id)?.obj)) });
    }
  } finally { S.min = m0; }
  for (const sl of slots) {
    for (const ids of sl.rooms) {
      if (ids.length < 2) continue;
      chat(w, ids, day);
      if (sl.night) storyteller(w, ids, day);
    }
    if (sl.night) network(w, day);
  }
}

/* ---------- 说给玩家听 ---------- */

/** 放进人物对白里的话：里层的引号换成『』（文风第十一条） */
export const inner = (t: string): string => t.replace(/「/g, '『').replace(/」/g, '』');

/** 玩家听到了一条：记下听过，见闻簿上那件事推到这一步（只往后推，不往回拨），写进见闻 */
function tellYou(r: RumorInst, text: string): void {
  const heard = (S.heard ||= []);
  if (!heard.includes(r.id)) { heard.push(r.id); if (heard.length > HEARD_MAX) heard.splice(0, heard.length - HEARD_MAX); }
  const st = S.shi?.[r.ev], d = shiById(r.ev);
  if (st && d) {
    if (st.at === r.ph) learnShi(r.ev);
    else {
      const rp = stepRank(d, r.ph);
      // 比眼下这一步还靠后的，是上一回的旧事，不拿它改见闻簿
      if (rp <= stepRank(d, st.at) && (st.seen === undefined || stepRank(d, st.seen) < rp)) markSeen(st, r.ph);
    }
  }
  // 当事人说的「我」话，记进见闻簿时改回旁人的说法，不然读起来像玩家自己的话
  const own = !isNews(r) && Object.values(shiById(r.ev)?.steps[r.ph]?.self ?? {}).includes(text);
  pushFeed('传闻', own ? rumorText(r, 0) ?? text : text);
}

/** 关系管说多少：素不相识、有过节的只说传开了的（耸动的）；点头之交起不说机密；相谈甚欢以上全说 */
function willTell(r: RumorInst, npcId: string): boolean {
  if (r.subj.includes(npcId)) return true;
  const rel = S.rel[npcId] ?? '素不相识';
  if (REL_WARM.includes(rel)) return true;
  if (r.secret) return false;
  return REL_NOD.includes(rel) || r.juice >= 0.4;
}

/** 他会跟你说的那一条：你还不知道的，按耸动、离他近、牵涉他的帮、新鲜排；外地事往后放 */
function pickFor(npcId: string, force: boolean): { r: RumorInst; k: Know; text: string } | null {
  const w = worldOf(), today = dayNo(S), heard = new Set(S.heard ?? []);
  const home = roomsOf(npcId), fac = lifeOf(npcId)?.faction;
  let best: { r: RumorInst; k: Know; text: string; s: number } | null = null;
  for (const k of knowsOf(w, npcId)) {
    const r = w.rumor[k[0]];
    if (!r || youKnow(r, S, heard) || (!force && !willTell(r, npcId))) continue;
    const text = rumorText(r, k[1], npcId);
    if (text === null) continue;
    const s = r.juice + (home.includes(r.place) ? 0.4 : 0) + (fac && r.subj.includes(fac) ? 0.4 : 0) - 0.03 * (today - r.day) - (farFor(r, npcId) ? 0.3 : 0);
    if (!best || s > best.s) best = { r, k, text, s };
  }
  return best;
}

export interface AskResult {
  text: string;
  /** know：说的是他知道的；idle：说他自己的日子；old：没写声口的人，说这一带传开的；none：没得说；again：今日问过了 */
  src: 'know' | 'idle' | 'old' | 'none' | 'again';
  /** 说的是哪条传闻 */
  rumor?: string;
  far?: boolean;
  /** 听谁说的 */
  from?: string;
}

/**
 * 打听：问这个人知道什么（engine/world.ts 的「打听」，人人都有）。一个人一天只问一回（force 不管，也不管关系）。
 * 写了声口的人：{名}{开口前的样子}，道：「{说法}」，听来的再接一句（听某某说的）；什么都没有就说他自己的日子。
 * 没写声口的人：先说他自己知道的，再说这一带传开的，都没有说「太平得很」
 */
export function ask(npcId: string, opt: { force?: boolean; who?: string } = {}): AskResult {
  const who = opt.who ?? npcName(npcId);
  if (!opt.force) {
    const today = dayNo(S);
    const asked = (S.asked ||= {});
    for (const k of Object.keys(asked)) if (asked[k] !== today) delete asked[k];
    if (asked[npcId] === today) return { text: `${who}摆摆手：「知道的都跟你说了，改日再来吧。」`, src: 'again' };
    asked[npcId] = today;
  }
  const life = lifeOf(npcId);
  const open = (): string => (life ? `${who}${worldPick(life.voice.lead)}，道：` : `${who}${worldPick(DATING_LEAD)}：`);
  const got = pickFor(npcId, !!opt.force);
  if (got) {
    tellYou(got.r, got.text);
    const from = got.k[3];
    return { text: `${open()}「${inner(got.text)}」${from ? `（听${npcName(from)}说的）` : ''}`, src: 'know', rumor: got.r.id, far: farFor(got.r, npcId), from };
  }
  if (life) {
    const idle = pickBranch(life.voice.idle)?.text;
    if (idle) return { text: `${open()}「${idle}」`, src: 'idle' };
  }
  const line = hearsay();
  if (line) return { text: `${open()}「${inner(line)}」`, src: 'old' };
  return { text: `${who}想了想：「这几日太平得很，没听说什么。」`, src: 'none' };
}

/** 盘问：捕快亮出腰牌，谁都得答话（docs/lizu.md：六扇门的特权）。不像打听那样一天一回，也不看交情 */
export function panwen(npcId: string, who: string = npcName(npcId)): string {
  const got = pickFor(npcId, true);
  if (got) tellYou(got.r, got.text);
  const line = got?.text ?? hearsay();
  if (!line) return `你亮出腰牌。${who}连连作揖：「官爷，小的什么也不知道，这几日太平得很。」`;
  return `你亮出腰牌。${who}不敢怠慢，一五一十地说了：「${inner(line)}」`;
}

/**
 * 江湖上的话：玩家所在地区传开的、你还不知道的、最耸动的一条（原样）。说书人的打赏、效果 news、没写声口的人的打听都用它。
 * 返回那句话，没得说为空（不再从传闻池里随手抽）
 */

/* ---------- 打听去处（docs/sheji-021-026.md 023 节） ---------- */

/** 时辰（24 小时制）对应的时辰名：子0 丑2 寅4 卯6 辰8 巳10 午12 未14 申16 酉18 戌20 亥22 */
const SHICHEN = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const shichenOf = (h: number): string => SHICHEN[Math.floor(h / 2) % 12];
/** 一段时辰（from 到 to，可跨午夜）说成一句：整段夜里→入夜，只到正午前→清早，整段白天→白日，否则「时辰到时辰」 */
function hourLabel(from: number, to: number): string {
  const wrap = to < from;
  if (wrap) return '入夜';
  if (from >= 19) return '入夜';
  if (to <= 12) return '清早';
  if (from >= 5 && to <= 19) return '白日';
  return `${shichenOf(from)}到${shichenOf(to)}`;
}

/** 去掉条件里的时辰（含 any 里的时辰），剩下的条件此刻成立的，才算「公开的去处」——带 shi/job/flag/quest 的，剧情没到不说（docs/sheji-021-026.md 023 节） */
function restCond(c?: Cond): Cond | undefined {
  if (!c) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(c) as (keyof Cond)[]) {
    if (k === 'hour') continue;
    const v = (c as Record<string, unknown>)[k];
    if (k === 'any' && Array.isArray(v)) {
      const arr = (v as Cond[]).map(s => { const { hour, ...rest } = s; return rest; }).filter(s => Object.keys(s).length > 0);
      if (arr.length) out.any = arr;
      continue;
    }
    out[k] = v;
  }
  return out as Cond;
}

/** 这个人的公开作息（at 里不标 secret、且除了时辰外其余条件此刻成立的）拼成一句去处；没有为空 */
export function whereaboutsOf(id: string): string {
  const n = npc(id);
  if (!n?.at) return '';
  const list = (Array.isArray(n.at) ? n.at : [n.at]).filter(a => !a.secret && test(restCond(a.if)));
  if (!list.length) return '';
  return list.map(a => {
    const name = room(a.room)?.name ?? a.room;
    if (!a.if?.hour) return `常在${name}`;
    return `${hourLabel(a.if.hour.from, a.if.hour.to)}在${name}`;
  }).join('，');
}

/** 这人还活着、没走远（dead / 未到期的 gone 不算，人物详情里不该列） */
function isAround(id: string): boolean {
  const p = worldOf().ppl[id];
  const st = p?.st;
  if (st === 'dead') return false;
  if (st === 'gone') { const u = p.until; return u !== undefined && u <= dayNo(S); }
  return true;
}

/** 这人能不能答得出 target 的去处：同势力、常待同一处、眼下同处一室。不读玩家与目标的交情——「问人」只列玩家认识的人，读了那句「不知道」就永远出不来 */
export function canTell(npcId: string, targetId: string): boolean {
  if (npcId === targetId) return false;
  const a = lifeOf(npcId), b = lifeOf(targetId);
  if (a?.faction && b?.faction && a.faction === b.faction) return true;
  const ra = new Set(roomsOf(npcId)), rb = new Set(roomsOf(targetId));
  for (const r of ra) if (rb.has(r)) return true;
  if (roomNpcs(S.loc).includes(targetId)) return true;
  return false;
}

/** 玩家认识、又有作息、还活着、不是物件、也不是被问的自己（人物详情里「问人」弹窗只列这些） */
export function askableTargets(): string[] {
  return NPCS.filter(n => n.at && !n.obj && isAround(n.id) && n.id !== S.sel && (S.rel[n.id] && (REL_NOD.includes(S.rel[n.id]) || REL_WARM.includes(S.rel[n.id])))).map(n => n.id);
}

export interface WhereResult { text: string; /** know=答得出，unknown=不认识这人，nosched=这人没个准地方 */ src: 'know' | 'unknown' | 'nosched' }

/** 同一句重复追问不刷屏：最近一条「传闻」已经是这句就不重复记进见闻簿 */
function tellFeed(text: string): void {
  const last = S.feed[S.feed.length - 1];
  if (last && last.t === '传闻' && last.x === text) return;
  pushFeed('传闻', text);
}

/**
 * 问 npcId：「某某平日在哪」。答的是作息的公开部分，事件打断时只有关心这事的人才说得出新去处（读他知道的传闻）。
 * 答得出来记进见闻簿（docs/sheji-021-026.md 023 节）。
 */
export function askWhere(npcId: string, targetId: string): WhereResult {
  const who = npcName(npcId), tname = npcName(targetId);
  if (!npc(targetId)?.at) return { text: `${who}摇摇头：「${tname}？他没个准地方，我可说不上来。」`, src: 'nosched' };
  if (!canTell(npcId, targetId)) return { text: `${who}想了想：「${tname}素不相识，他平日在哪，我哪里晓得。」`, src: 'unknown' };
  // 事件打断作息：知道这件事（他知道的传闻牵涉 target）的人才说得出新去处
  const p = worldOf().ppl[targetId];
  const today = dayNo(S);
  if (p?.at && p.at.until > today) {
    const knows = knowsOf(worldOf(), npcId).some(k => worldOf().rumor[k[0]]?.subj.includes(targetId));
    if (knows) {
      const where = room(p.at.room)?.name ?? p.at.room;
      const text = `${who}压低声音：「${tname}这几日不在常待的地方——${where}那边的人说，他叫事绊住了，在那儿能寻着。」`;
      tellFeed(text);
      return { text, src: 'know' };
    }
  }
  const base = whereaboutsOf(targetId);
  const text = base ? `${who}道：「${tname}平日的去处我知道——${base}。」` : `${who}道：「${tname}啊，他没个准地方，街面上常碰得着。」`;
  tellFeed(text);
  return { text, src: 'know' };
}


export function hearsay(): string | null {
  const w = worldOf(), today = dayNo(S), region = room(S.loc).region, heard = new Set(S.heard ?? []);
  let best: { r: RumorInst; text: string; s: number } | null = null;
  for (const r of Object.values(w.rumor)) {
    if (r.far || regionOf(r) !== region || youKnow(r, S, heard)) continue;
    const text = rumorText(r, 0);
    if (text === null) continue;
    const s = r.juice - 0.03 * (today - r.day);
    if (!best || s > best.s) best = { r, text, s };
  }
  if (!best) return null;
  tellYou(best.r, best.text);
  return best.text;
}

/* ---------- 出关邸报 ---------- */

/** 世事传到耳朵里的一句（engine/shishi.ts 的 tickShiFull） */
export interface HeardItem { text: string; ev: string; ph: string }
/** 邸报一条的来处：世事传到耳朵里的、这一带传开的、熟人托人带的 */
export type DibaoSrc = { kind: 'shi'; id: string; ph: string } | { kind: 'rumor'; id: string } | { kind: 'rel'; npc: string; id: string };
export interface DibaoItem { text: string; src: DibaoSrc; juice: number }

/** 熟人：点头之交以上、没有过节、不是阴阳两隔 */
const friendly = (v: string): boolean => REL_NOD.includes(v) || REL_WARM.includes(v);

/**
 * 出关邸报（engine/shiguang.ts 的 jingxiu）：你不在时的事，只写真事，按耸动排，最多五条；什么都没有就一条不写。
 * - 世事传到耳朵里的（tickShi 已经记进见闻）；
 * - 你所在的这一带 fromDay 以后传开的、你还不知道的；
 * - 熟人 fromDay 以后听说的、你还不知道的，托人带给你（后接「（某某托人带的话）」）。
 * 写进去的记作听过、写进见闻
 */
export function dibao(s: GameState, fromDay: number, heard: HeardItem[]): DibaoItem[] {
  const w = worldOf(s), region = room(s.loc).region, known = new Set(s.heard ?? []);
  const items: (DibaoItem & { r?: RumorInst; raw: string })[] = [];
  for (const h of heard) {
    const step = shiById(h.ev)?.steps[h.ph];
    items.push({ text: h.text, raw: h.text, src: { kind: 'shi', id: h.ev, ph: h.ph }, juice: step ? juiceOf(step) : 0.5 });
  }
  for (const r of Object.values(w.rumor)) {
    if (r.far || r.day < fromDay || regionOf(r) !== region || youKnow(r, s, known)) continue;
    const text = rumorText(r, 0);
    if (text !== null) items.push({ text, raw: text, src: { kind: 'rumor', id: r.id }, juice: r.juice, r });
  }
  for (const [id, v] of Object.entries(s.rel)) {
    if (!friendly(v)) continue;
    for (const k of knowsOf(w, id)) {
      const r = w.rumor[k[0]];
      if (!r || k[2] < fromDay || youKnow(r, s, known)) continue;
      const text = rumorText(r, k[1], id);
      if (text !== null) items.push({ text: `${text}（${npcName(id)}托人带的话）`, raw: text, src: { kind: 'rel', npc: id, id: r.id }, juice: r.juice, r });
    }
  }
  // 同一句话、同一条传闻只写一回
  const seen = new Set<string>();
  const once = (x: { raw: string; r?: RumorInst }): boolean => {
    const keys = [x.raw, ...(x.r ? [x.r.id] : [])];
    if (keys.some(k => seen.has(k))) return false;
    keys.forEach(k => seen.add(k));
    return true;
  };
  const out = items.map((x, i) => ({ x, i })).sort((a, b) => b.x.juice - a.x.juice || a.i - b.i).map(o => o.x).filter(once).slice(0, 5);
  for (const x of out) if (x.r) tellYou(x.r, x.text);
  return out.map(({ text, src, juice }) => ({ text, src, juice }));
}
