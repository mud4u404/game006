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
import { FACTIONS, NEWS, NPCS, REGIONS, ROOMS, npc, room, shiById } from '../content';
import type { Branch, Cond, NewsDef, NpcLife, ShiDef, ShiStep } from '../content/types';
import { test } from './dsl';
import { mulberry32, seedOf } from './rng';
import { learnShi } from './shishi';
import { worldOf, worldRng, type Know, type WorldState } from './shijie';
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
/** 打听时开口前的样子，按身份分几组：没写声口的人开口也不该都一个腔调（Issue #263）。
 * 一组里只放合身份的动作：出家人不掰指头、不吐草棍，做买卖的不咂嘴充江湖。推不出身份就归市井。 */
type Gang = 'sengdao' | 'guanchai' | 'shanghu' | 'jianghu' | 'shijing';
export const DATING_LEAD: Record<Gang, string[]> = {
  sengdao: ['双手合十又松开', '拨了两下念珠', '袍袖轻轻一收', '先念了一声佛号', '木鱼敲了半下又停住',
    '扫帚在石阶上顿了顿', '往院里瞟了一眼', '把香炉里的香灰拨平'],
  guanchai: ['清了清嗓子', '往门外扫了一眼', '手指在案上敲了两下', '把簿子合上', '上下打量了你一遍',
    '把帽檐扶了扶', '咳了一声', '朝门外的差役点了点头'],
  shanghu: ['把算盘拨了两下', '掂了掂秤砣', '从柜下摸出一本旧账', '把货单翻了一页', '朝后头的伙计招了招手',
    '把算筹收拢成一堆', '在袖口擦了擦手', '朝门口那挂幌子抬了抬下巴'],
  jianghu: ['手掌在刀柄上按了按', '往后退了半步', '眼睛在四周一扫', '把袖子往上捋了捋',
    '啐了一口', '肩膀一沉站住了脚', '朝同伴歪了歪头'],
  shijing: ['压低了声音', '左右看了看', '凑近了些', '想了想', '往四下里瞟了一眼', '咂了咂嘴', '叹了口气', '把声音放得很低',
    '朝你招招手', '先摆摆手说不该多嘴，到底没忍住', '掰着指头数了数', '吐掉嘴里的草棍']
};
/** 行当字样，先看人：名与 brief 里的说法拿得准 */
const GANG_WORD: [Gang, RegExp][] = [
  ['sengdao', /僧|尼|师太|长老|禅师|道人|道长|居士|佛号|禅|抄经|木鱼|念珠|合十|香灰|了尘/],
  ['guanchai', /捕头|巡检|衙|差役|税吏|书办|库吏|粮官|官兵|关卡|案卷|文书|捕快|兵丁/],
  ['shanghu', /掌柜|朝奉|账房|算盘|秤砣|行商|货担|点货|理货|绸缎|布庄|盐行|货栈/]
];
/** 其次看他常待的地方是什么市面 */
const GANG_TAG: [Gang, string][] = [
  ['sengdao', '寺观'], ['sengdao', '破庙'], ['guanchai', '衙门'],
  ['shanghu', '铺子'], ['jianghu', '码头'], ['jianghu', '官道'], ['jianghu', '荒地']
];
/** 走江湖相的，最后才看这一路（刀剑拳掌帮寨，这类字眼松，谁身上都沾） */
const GANG_LOOSE: [Gang, RegExp] = ['jianghu', /刀|剑|拳|掌|镖|帮|寨|贼|汉子|兄弟|地痞|猎户|掌门|弟子|护船|刃|货栈/];
/** 他属于哪一拨：行当字样，其次地点的 life.tags，最后江湖相；都看不出来归市井 */
export function gangOf(id: string): Gang {
  const n = npc(id);
  if (n) {
    const s = `${n.name}${n.brief ?? ''}`;
    for (const [g, re] of GANG_WORD) if (re.test(s)) return g;
    const tags = new Set(roomsOf(id).flatMap(r => room(r)?.life?.tags ?? []));
    for (const [g, t] of GANG_TAG) if (tags.has(t)) return g;
    if (GANG_LOOSE[1].test(s)) return GANG_LOOSE[0];
  }
  return 'shijing';
}
/** 这一天已经说过的老话。记在 S.asked 里（同一个字段、同样按日清），前缀别撞上人物 id */
const SAID = '旧话:';
function saidToday(): Set<string> {
  const asked = S.asked, out = new Set<string>();
  if (!asked) return out;
  const today = dayNo(S);
  for (const k of Object.keys(asked)) if (asked[k] === today && k.startsWith(SAID)) out.add(k.slice(SAID.length));
  return out;
}
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


/** 传闻池的话出在哪儿：话里提到的地区名、地点名（只认全内容里独一份的名字），取最先提到的 */
let keyTab: { k: string; region: string; place?: string }[] | undefined;
function newsKeys(): { k: string; region: string; place?: string }[] {
  if (!keyTab) {
    const byName = new Map<string, string[]>();
    for (const r of ROOMS) if (r.name.length >= 3) byName.set(r.name, [...(byName.get(r.name) ?? []), r.id]);
    keyTab = [];
    for (const [k, ids] of byName) if (ids.length === 1) keyTab.push({ k, region: regionOfRoom(ids[0]), place: ids[0] });
    for (const [rid, def] of Object.entries(REGIONS)) for (const k of [def.name, def.name.replace(/渡$/, '')]) if (k.length >= 2) keyTab.push({ k, region: rid });
    keyTab.push({ k: '京口', region: 'zj' });
  }
  return keyTab;
}
export function newsHits(n: NewsDef): { region: string; place?: string }[] {
  if (n.region || n.at) return [{ region: n.region ?? regionOfRoom(n.at!), place: n.at }];
  const hits: { i: number; k: string; region: string; place?: string }[] = [];
  for (const e of newsKeys()) { const i = n.text.indexOf(e.k); if (i >= 0) hits.push({ i, ...e }); }
  return hits.sort((x, y) => x.i - y.i || y.k.length - x.k.length);
}
/**
 * 话出在哪儿：写明了的，或者话里点了独一份的地点名，就是那儿（地点名是实打实的锚）；
 * 只提到地区名的，取候选人里有人住的那个地区（话里顺口提一句瓜洲的，不一定出在瓜洲）；都对不上，取候选人头一个所在的地区
 */
export function newsWhere(n: NewsDef, who: string[]): { region: string; place?: string } {
  const hits = newsHits(n);
  const anchor = n.region || n.at ? hits[0] : hits.find(h => h.place);
  if (anchor) return anchor;
  return hits.find(h => who.some(p => homeRegion(p) === h.region)) ?? { region: homeRegion(who[0] ?? '') };
}
/** 话说的就是他自己的事：点了他所在帮的名号，或者他守的地方的名字 */
function selfNamed(who: string, text: string): boolean {
  const l = lifeOf(who), f = FACTIONS.find(x => x.id === l?.faction);
  const names = [...(f ? [f.name, f.name.replace(/东舵|西舵|分舵|扬州/g, '')] : []), ...roomsOf(who).map(r => room(r).name)];
  return names.some(k => k.length >= 2 && text.includes(k));
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

/** 某个钟点在这处的人（不算物件）；不拨动游戏时钟。 */
function presentAt(place: string, min: number): string[] {
  return roomNpcs(place, min).filter(id => !npc(id)?.obj);
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
  const cand: { id: string; who: string[]; far: boolean; place: string }[] = [];
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
    let region = '', place: string | undefined;
    if (n.far) { const run = who.filter(isRunner); who = run.length ? run : ppl.filter(isRunner); }
    else {
      // 话只发给该知道的人：出在哪个地区，就只发给那一带的人；说的就是自家的事（话里点了他的帮、他守的地方），不给他
      ({ region, place } = newsWhere(n, who));
      who = who.filter(p => homeRegion(p) === region && !selfNamed(p, n.text));
    }
    if (who.length) cand.push({ id, who, far: !!n.far, place: place ?? (n.far ? '' : roomsOf(who[0])[0] ?? '') });
  }
  for (let i = 0; i < NEWS_PER_DAY && cand.length; i++) {
    const { id, who, far, place } = cand.splice(Math.floor(worldRng() * cand.length), 1)[0];
    w.rumor[id] = { id, ev: id, ph: '', day, place, juice: far ? 0.45 : 0.4, subj: [], ...(far ? { far: true as const } : {}) };
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
    if (!p.st && !p.at && !p.has) delete w.ppl[id];
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
  const slots = SLOTS.map(sl => ({
    night: sl.k === 'night',
    rooms: lifeRooms().map(r => presentAt(r, sl.min))
  }));
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
  /** know：说的是他知道的；idle：说他自己的日子；react：对你近来所做之事的一句；old：没写声口的人，说这一带传开的；none：没得说；again：今日问过了、没有可说的了 */
  src: 'know' | 'idle' | 'react' | 'old' | 'none' | 'again';
  /** 说的是哪条传闻 */
  rumor?: string;
  far?: boolean;
  /** 听谁说的 */
  from?: string;
}

/**
 * 开场白的挑法：只由（世界种子、人、日子）算出，不取世界的随机数（worldRng）。
 * 纯文字的挑选动了世界随机流，世界里别的随机跟着挪位（世事的时点、传闻的走样），同一个种子就不一字不差了；
 * 给谁补上声口、改了几句开场白，都不该改变江湖的走向。salt 是同一天里第几回问（头一回不加，老存档的开场白不变）
 */
function leadPick<T>(arr: readonly T[], npcId: string, salt = 0): T {
  return arr[Math.floor(mulberry32(salt ? seedOf(worldOf().seed, 'lead', npcId, dayNo(S), salt) : seedOf(worldOf().seed, 'lead', npcId, dayNo(S)))() * arr.length)];
}

/** 对你近来所做之事的一句反应：按他是哪一拨人（gangOf）各说各的口气；「少侠」只留给会这么叫的江湖人 */
type ReactLine = { if: Cond; text: Record<Gang, string>; reg?: string };
const REACT: ReactLine[] = [
  { if: { wounded: true }, text: {
    sengdao: '施主面带伤气，是与人动过手吧？老衲这里有清水，歇歇脚再走。',
    guanchai: '你这脸色不对，跟人动过手？在我这一片可别闹出人命来。',
    shanghu: '客官这脸色不好，是不是跟人动过手？伤着了先坐下喝口茶。',
    jianghu: '你这脸色不对，是不是跟人动过手？伤着了就别硬撑，江湖路长。',
    shijing: '你这脸色怎的这般难看？是跟人动过手了吧，快回去养着。' } },
  { if: { flag: 'boss', xia: 20 }, reg: 'yz', text: {
    sengdao: '渡口那一仗，贫僧也听说了。施主出手为人，功德不小。',
    guanchai: '渡口那一仗，衙里都知道了。你的名号，衙里是有数的。',
    shanghu: '渡口那一仗，满街都在传。有你在，咱们做买卖的也安心些。',
    jianghu: '渡口那一仗，我也听说了。你这样的后生，如今不多见了。',
    shijing: '渡口那一仗，这几日街上都在说你。' } },
  { if: { eming: 20 }, text: {
    sengdao: '施主近来杀气重，老衲劝你一句，得饶人处且饶人。',
    guanchai: '你近来的名声不大好听，衙里记着呢。好自为之。',
    shanghu: '近来听人说起你，口碑不太好。小店不敢多问，只盼你莫在这儿惹事。',
    jianghu: '近来你的名声不大好听。我不多问，只劝你一句：做事留三分。',
    shijing: '这几日街上都在嚼你的舌根，不太好听。我不多问，你自己当心。' } },
  { if: { xia: 30 }, text: {
    sengdao: '近来听香客说起，有人专管不平事，想来便是施主。善哉。',
    guanchai: '都说近来有人专管不平事，原来是你。这话我当差的不好多讲，心里有数。',
    shanghu: '都说近来有位少侠专管不平事，原来是你。往后这条街，托你照应了。',
    jianghu: '都说近来有位少侠专管不平事，原来是你。这话我不当面夸，心里是有数的。',
    shijing: '这几日街上都在说你，说你专管不平事。我们小老百姓，心里记着呢。' } },
  { if: { flag: 'boss' }, reg: 'yz', text: {
    sengdao: '听说黑风寨的事了结了。阿弥陀佛，此地百姓夜里可以睡个安稳觉。',
    guanchai: '黑风寨的头一把交椅，叫你拿下了？衙里正为这事头疼，多谢。',
    shanghu: '听说你拿下了黑风寨的头一把交椅，往后货道上太平些了。',
    jianghu: '听说你在渡口拿下了黑风寨的头一把交椅。这一带的人，夜里睡得安稳些了。',
    shijing: '听说黑风寨叫你收拾了？这一带的人，夜里睡得安稳些了。' } },
  { if: { shenfen: 'biaoshi' }, text: {
    sengdao: '吃镖局这碗饭，路上多是刀兵。施主千万保重。',
    guanchai: '吃镖局这碗饭的，过关过卡要手续齐全，有事来衙里言语一声。',
    shanghu: '吃镖局这碗饭的，路上要小心。我这儿有货要走，改日同你谈谈。',
    jianghu: '吃镖局这碗饭的，路上要小心。有什么消息，我替你留意着。',
    shijing: '吃镖局这碗饭的，听说天天在路上奔波，不容易。' } }
];

/**
 * 没有新料可说时的一个动作，按身份分几种（10-10 试玩：佩刀汉子和青衫书生第二回打听，是同一句关心话）。
 * 一句都不替他编：他只是不再多说。同一天里别人说过的那个动作，下一个人换一个
 */
export const SHRUG: Record<Gang, string[]> = {
  sengdao: ['合十垂目，不再多说。', '低头拨着念珠，没有再开口。', '摇摇头，只念了一声佛号。'],
  guanchai: ['摆摆手，示意没什么可说的了。', '把簿子一合，不再多说。', '板着脸摇了摇头。'],
  shanghu: ['摇摇头，低头拨起了算盘。', '摊摊手，没什么可说的了。', '笑了笑，转身去招呼别的客人。'],
  jianghu: ['冷哼一声，不再多说。', '摇摇头，把脸别向一边。', '耸了耸肩，没有再开口。'],
  shijing: ['摇摇头，不再多说。', '摆摆手，没什么可说的了。', '只笑了笑，没有再开口。']
};
const SHRUGGED = '动作:';
function shrugFor(npcId: string): string {
  const pool = SHRUG[gangOf(npcId)], today = dayNo(S), asked = S.asked ?? {};
  let h = today;
  for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) >>> 0;
  for (let i = 0; i < pool.length; i++) {
    const t = pool[(h + i) % pool.length];
    if (asked[SHRUGGED + t] !== today) return t;
  }
  return pool[h % pool.length];
}
const REACTED = '反应:';
/** 这句反应今天已经对别人说过了 */
const reactSaid = (t: string): boolean => (S.asked ?? {})[REACTED + t] === dayNo(S);

/** 他对你的这句反应：交情深的另说一句；只说和他同一带的事 */
function reactFor(npcId: string): string | null {
  const rel = S.rel[npcId] ?? '素不相识';
  if (REL_WARM.includes(rel)) return '你我也算熟人了，这些日子见你来来去去，心里总替你捏一把汗。有什么难处，只管开口。';
  return REACT.find(r => (!r.reg || homeRegion(npcId) === r.reg) && test(r.if))?.text[gangOf(npcId)] ?? null;
}

/** 他自己的日子：眼下说得出的几句（声口里 idle 成立的各条，内容顺序） */
function idleLines(life: NpcLife | undefined): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  (life?.voice.idle ?? []).forEach((b: Branch, i) => { if (b.text && test(b.if)) out.push({ key: `i${i}`, text: b.text }); });
  return out;
}

/** 今天对这个人的问话记录；隔日换新 */
function askLogOf(npcId: string, create: boolean): { d: number; u: string[] } | undefined {
  const today = dayNo(S), logs = S.askLog;
  if (logs) for (const k of Object.keys(logs)) if (logs[k].d !== today) delete logs[k];
  if (create) return ((S.askLog ||= {})[npcId] ||= { d: today, u: [] });
  return logs?.[npcId];
}

/** 下一句他还有什么可说的（不动记录）：自己的旧话在前，对你的反应在后；没有了为空 */
function nextLine(npcId: string, log: { u: string[] }): { key: string; kind: 'idle' | 'react'; text: string; shrug?: boolean } | null {
  const idle = idleLines(lifeOf(npcId)).find(l => !log.u.includes(l.key));
  if (idle) return { ...idle, kind: 'idle' };
  if (!log.u.includes('r')) {
    const t = reactFor(npcId);
    // 同一句关心话今天已对别人说过：不再照抄，这个人只是不再多说（按身份换动作）
    if (t) return reactSaid(t) ? { key: 'r', kind: 'react', text: shrugFor(npcId), shrug: true } : { key: 'r', kind: 'react', text: t };
  }
  return null;
}

/** 现在还能不能向他打听：今天没问过，或者问过了他还有话可说（按钮灰不灰看它） */
export function canAsk(npcId: string): boolean {
  const log = askLogOf(npcId, false);
  return !log || nextLine(npcId, log) !== null;
}

/**
 * 打听：问这个人知道什么（engine/world.ts 的「打听」，人人都有）。force 不管次数，也不管关系。
 * 头一回：写了声口的人，{名}{开口前的样子}，道：「{说法}」，听来的再接一句（听某某说的）；什么都没有就说他自己的日子。
 * 没写声口的人：先说他自己知道的，再说这一带传开的，都没有说「太平得很」。
 * 再问：先是他自己的旧话、闲话（声口里成立的各条，一条一回），再是他对你近来所做之事的一句反应；都说过了，就是「今日已问过」（按钮灰掉）
 */
export function ask(npcId: string, opt: { force?: boolean; who?: string } = {}): AskResult {
  const who = opt.who ?? npcName(npcId);
  const life = lifeOf(npcId);
  const first = !opt.force && !askLogOf(npcId, false);
  if (!opt.force) {
    const today = dayNo(S);
    const asked = (S.asked ||= {});
    for (const k of Object.keys(asked)) if (asked[k] !== today) delete asked[k];
    if (!first) {
      const log = askLogOf(npcId, true)!, nx = nextLine(npcId, log);
      if (!nx) return { text: `${who}今日已被你问过了，没有新话可说。`, src: 'again' };
      log.u.push(nx.key);
      if (nx.kind === 'react') (S.asked ||= {})[(nx.shrug ? SHRUGGED : REACTED) + nx.text] = today;
      if (nx.shrug) return { text: `${who}${nx.text}`, src: 'react' };
      return { text: `${who}${leadPick(life?.voice.lead ?? DATING_LEAD[gangOf(npcId)], npcId, log.u.length)}${life ? '，道：' : '：'}「${inner(nx.text)}」`, src: nx.kind };
    }
    asked[npcId] = today;
    askLogOf(npcId, true);
  }
  const log = opt.force ? undefined : askLogOf(npcId, true);
  // 分组是 Issue #263 的那层：没写声口的人按身份落进自己那一组，动作不跟市井混在一起
  const open = (): string => (life ? `${who}${leadPick(life.voice.lead, npcId)}，道：` : `${who}${leadPick(DATING_LEAD[gangOf(npcId)], npcId)}：`);
  const got = pickFor(npcId, !!opt.force);
  if (got) {
    tellYou(got.r, got.text);
    const from = got.k[3];
    return { text: `${open()}「${inner(got.text)}」${from ? `（听${npcName(from)}说的）` : ''}`, src: 'know', rumor: got.r.id, far: farFor(got.r, npcId), from };
  }
  if (life) {
    const idle = idleLines(life)[0];
    if (idle) { log?.u.push(idle.key); return { text: `${open()}「${idle.text}」`, src: 'idle' }; }
  }
  const line = hearsay({ skip: saidToday() });
  if (line) {
    (S.asked ||= {})[SAID + line] = dayNo(S);
    return { text: `${open()}「${inner(line)}」`, src: 'old' };
  }
  // 没得说也要按身份开口：从前这里写死了「想了想」，僧人官差商人都一个腔调（Issue #263）
  // 这一句不取世界随机：开口的样子只是句面上的动作，worldRng 是给传闻和世事用的。
  // 多抽一次不要紧，一多抽就等于伸手推了世事的骰子（tests/zoubian 走遍江湖那一条会跟着偏）。
  return { text: `${who}${plainPick(DATING_LEAD[gangOf(npcId)], npcId)}：「这几日太平得很，没听说什么。」`, src: 'none' };
}

/** 不动世界种子的挑法：同一个人同一天总挑到同一个，隔天换一个 */
function plainPick<T>(arr: T[], id: string): T {
  let h = dayNo(S);
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
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
 *
 * opt.skip 是给「打听」用的（Issue #263）：今日已经有人说过的老话别再拿给下一个人，说过的记在 S.asked。
 * 只在 ask() 里传，别的调用一律不传 —— 说书人的打赏和效果 news 那两句兼着把见闻簿上那件事往前推一步
 * （tellYou → learnShi），在那里换一句说，就等于替玩家改世事的进度。所以这一层不替它们做主。
 */
export function hearsay(opt: { skip?: ReadonlySet<string> } = {}): string | null {
  const w = worldOf(), today = dayNo(S), region = room(S.loc).region, heard = new Set(S.heard ?? []);
  let best: { r: RumorInst; text: string; s: number } | null = null;
  for (const r of Object.values(w.rumor)) {
    if (r.far || regionOf(r) !== region || youKnow(r, S, heard)) continue;
    const text = rumorText(r, 0);
    if (text === null || opt.skip?.has(text)) continue;
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
