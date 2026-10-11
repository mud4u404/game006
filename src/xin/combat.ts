/**
 * 练武场适配层：战斗结算仍由旧 Duel 执行，Person 负责身体与功力。
 * 在每场实例上调试尺度、按级取招、过滤过密破绽；不改旧引擎的默认值。
 * 新四项向旧五项的桥接是原型约定，不是新游戏的最终属性公式。
 */
import { Duel, RULES, type Ev, type Opt, type Pw, type RespKey } from '../engine/duel';
import { SCALE, type Person } from '../engine/person';
import { mulberry32 } from '../engine/rng';
import { pickFresh } from '../ui/fresh';
export interface Attributes { strength: number; insight: number; constitution: number; agility: number }
export interface Fighter { name: string; attrs: Attributes; level: number; inner: number; experience: number; energy: number }
export type Choice = RespKey | 'strike' | 'wait';
export type Tone = '吃力' | '相持' | '从容' | '写意';
export interface Move { level: number; name: string; motion: string; power: number }
export const MOVES: readonly Move[] = [
  { level: 1, name: '立马推拳', motion: '沉腰出拳', power: 1 },
  { level: 35, name: '回身横肘', motion: '回身送肘', power: 1.12 },
  { level: 75, name: '穿云双叩', motion: '双拳接连递进', power: 1.27 },
  { level: 130, name: '盘根托山', motion: '拳劲从腰背送出', power: 1.45 },
  { level: 200, name: '一线归元', motion: '一拳沿中路递出', power: 1.65 }
];
const RAW: Move = { level: 0, name: '乱打一拳', motion: '抡拳前扑', power: 0.85 };
export const ROUND_MS = 1500;
export const HITSTOP_MS = 240;
export const PERFORM_MS = 700;
export const ULT_MS = 1650;
export const clamp = (n: number, low: number, high: number): number => Math.max(low, Math.min(high, n));
const sigmoid = (n: number): number => 1 / (1 + Math.exp(-n));
const finite = (n: number, fallback: number): number => Number.isFinite(n) ? n : fallback;
export function clean(f: Fighter): Fighter {
  const attr = (n: number): number => Math.round(clamp(finite(n, 20), 10, 30));
  const lv = (n: number): number => Math.round(clamp(finite(n, 0), 0, 300));
  return { name: f.name, attrs: { strength: attr(f.attrs.strength), insight: attr(f.attrs.insight), constitution: attr(f.attrs.constitution), agility: attr(f.attrs.agility) }, level: lv(f.level), inner: lv(f.inner), experience: lv(f.experience), energy: clamp(finite(f.energy, 100), 0, 100) };
}
export const unlocked = (level: number): readonly Move[] => level < 1 ? [RAW] : MOVES.filter(m => m.level <= level);
export const realm = (f: Fighter): number => 0.6 * f.level + 0.25 * f.inner + 0.15 * f.experience;
export const tone = (gap: number): Tone => gap < -18 ? '吃力' : gap < 18 ? '相持' : gap < 100 ? '从容' : '写意';
export const windowMs = (gap: number, insight: number): number => Math.round(1200 + 4200 * sigmoid(gap / 55 + (insight - 20) / 12));
/** 命中、闪避、招架在旧普通出手的互斥三段中生效；特殊应对仍由旧 respond 结算。 */
export function probabilities(attacker: Fighter, defender: Fighter): { hit: number; dodge: number; parry: number; special: number; opening: number } {
  const gap = realm(attacker) - realm(defender);
  const hit = 0.04 + 0.88 * sigmoid(0.5 + gap / 42);
  const dodgeShare = sigmoid(0.1 + (defender.attrs.agility - attacker.attrs.agility) / 10);
  return { hit, dodge: (1 - hit) * dodgeShare, parry: (1 - hit) * (1 - dodgeShare), special: sigmoid(gap / 42), opening: (0.12 + 0.18 * sigmoid(gap / 50)) * sigmoid(gap / 45) };
}
export const HERO: Fighter = { name: '你', attrs: { strength: 20, insight: 20, constitution: 20, agility: 20 }, level: 80, inner: 80, experience: 35, energy: 100 };
export const FOES: readonly Fighter[] = [
  { name: '地痞', attrs: { strength: 24, insight: 16, constitution: 22, agility: 18 }, level: 0, inner: 0, experience: 10, energy: 100 },
  { name: '镖师', attrs: { strength: 22, insight: 18, constitution: 22, agility: 18 }, level: 80, inner: 80, experience: 50, energy: 100 },
  { name: '高手', attrs: { strength: 22, insight: 22, constitution: 20, agility: 16 }, level: 250, inner: 260, experience: 240, energy: 100 }
];
export interface Option { key: Choice; label: string; chance: number; cost: number; disabled: boolean; note: string }
export interface Prompt { kind: 'heavy' | 'opening'; title: string; text: string; duration: number; options: Option[] }
export interface Entry { round: number; kind: 'auto' | 'key' | 'tell' | 'end' | 'perform' | 'ult'; text: string; damage?: number; target?: 'hero' | 'foe' }
export type Result = 'win' | 'lose' | 'draw' | 'yield';
export interface Body { spec: Fighter; hp: number; hpMax: number; mp: number; charging: boolean; charge: number }
export const PERFORMS = [
  { level: 35, name: '回身震肘', word: '回肘', mp: 45, cd: 6, hits: 1, dmg: [100, 130] as [number, number], acc: 0.9, fx: [{ kind: 'weaken' as const, value: 15, rounds: 2 }] },
  { level: 130, name: '托山连劲', word: '托山', mp: 75, cd: 8, hits: 2, dmg: [85, 110] as [number, number], acc: 0.92, fx: [{ kind: 'break' as const, value: 20, rounds: 2 }] }
];
export const ULT_LEVEL = 75;
export const ULT_NAME = '贯劲一击';
/** 根骨接旧体魄/根骨，膂力独立进出手装备加成；旧胆魄固定常人，不冒充新增属性。 */
export function person(f: Fighter): Person {
  return { name: f.name, attr: { 体魄: f.attrs.constitution, 根骨: f.attrs.constitution, 身法: f.attrs.agility, 悟性: f.attrs.insight, 胆魄: 20 }, outer: Math.min(9, 1 + f.level / 40), neigong: Math.min(9, 1 + f.inner / 80), qinggong: Math.min(9, 1 + f.level / 80), grade: { outer: 0.9, neigong: 0.9, qinggong: 0.9 }, gongli: Math.max(0.1, f.inner / 100), gear: { chushou: (f.attrs.strength - 20) * 1.5 } };
}
const arenaScale = { ...SCALE, realmQ: 1.12, hpQ: 1.025, foeHp: 1.8, bigK: 2.8, hhPerRealm: 8, tiHp: 0.025, genHut: 0.01 };
class ArenaDuel extends Duel {
  readonly realmGap: number;
  constructor(hero: Fighter, foe: Fighter, rng: () => number) {
    super({ person: person(hero), mpMax: hero.inner, mp: hero.inner * hero.energy / 100, has: { block: hero.inner > 0, dodge: true, parry: hero.level >= 35, rush: hero.level >= 75 }, performs: PERFORMS.filter(p => p.level <= hero.level), ult: hero.level >= ULT_LEVEL ? { dmg: [230, 270], fx: [{ kind: 'busy', rounds: 1 }] } : undefined }, { person: person(foe), name: foe.name, spar: true, firstTell: 6, tells: foe.level ? ['li', 'su', 'qiao'] : ['li'], atkMul: 0.6 + 0.4 * foe.energy / 100, bigMul: 0.6 + 0.4 * foe.energy / 100 }, { rng, rules: { ...RULES }, sc: arenaScale });
    this.realmGap = realm(hero) - realm(foe);
    this.hpMax = Math.round(this.hpMax * 1.6); this.hp = this.hpMax;
    this.ehpMax = Math.round(this.ehpMax * 1.6); this.ehp = this.ehpMax;
    this.tier = realm(hero) / 60; this.eTier = realm(foe) / 60;
    this.mom = clamp(50 + 45 * Math.tanh(this.realmGap / 60), 5, 95);
  }
  override options(pw: Pw, side = false): Opt[] {
    return super.options(pw, side).map(o => {
      const raw = clamp(sigmoid(Math.log(o.raw / (1 - o.raw)) + this.realmGap / 45), 0.05, 0.95);
      return { ...o, raw, p: raw }; // 本场点到为止，旧内核 spar 不出虚招。
    });
  }
}
const responseNames: Record<RespKey, string> = { block: '沉腰硬接', dodge: '侧身闪避', parry: '引臂拆招', rush: '抢步反击' };
const responseNotes: Record<RespKey, string> = { block: '内劲护体 · 得手反震', dodge: '借脚下步子让开来势', parry: '回身横肘 · 得手还一拳', rush: '穿云双叩 · 得手重创' };
/** 这里是旧引擎的调参/叙述适配，tick、respond、perform、ult、蓄力和伤势全交给 Duel。 */
export class Battle {
  readonly duel: Duel;
  readonly heroSpec: Fighter;
  readonly foeSpec: Fighter;
  elapsed = 0;
  prompt: Prompt | null = null;
  result: Result | null = null;
  entries: Entry[] = [];
  private readonly prose: () => number;
  private readonly notices: () => number;
  private readonly used = new Set<string>();
  private readonly lastText = new Map<string, string>();
  private readonly base: { auto: [number, number]; atk: [number, number]; open: [number, number]; counter: Duel['counter']; big: number; dmgK: number };
  private lastOpening = -4;
  private lastChoice = -6;
  private nextDelay = 0;
  choicesDisplayed = 0;
  private heroMove: Move = RAW;
  private foeMove: Move = RAW;
  constructor(hero: Fighter, foe: Fighter, seed = 1) {
    this.heroSpec = clean(hero); this.foeSpec = clean(foe);
    this.duel = new ArenaDuel(this.heroSpec, this.foeSpec, mulberry32(seed));
    this.prose = mulberry32(seed ^ 0x51a7); this.notices = mulberry32(seed ^ 0x7f43);
    const d = this.duel;
    this.base = { auto: [...d.auto], atk: [...d.atk], open: [...d.open], counter: { block: [...d.counter.block], parry: [...d.counter.parry], rush: [...d.counter.rush] }, big: d.big, dmgK: d.dmgK };
  }
  get hero(): Body { const d = this.duel; return { spec: this.heroSpec, hp: d.hp, hpMax: d.hpMax, mp: d.mp, charging: d.charging, charge: d.charge }; }
  get foe(): Body { const d = this.duel; return { spec: this.foeSpec, hp: d.ehp, hpMax: d.ehpMax, mp: this.foeSpec.inner * this.foeSpec.energy / 100, charging: false, charge: 0 }; }
  get round(): number { return this.duel.round; }
  get gap(): number { return realm(this.heroSpec) - realm(this.foeSpec); }
  get nextRoundMs(): number { return (this.round < 3 ? 1200 : ROUND_MS) + this.nextDelay; }
  get phase(): string { return this.result ? '收势' : this.round < 3 ? '试探' : this.duel.log.ult || Math.min(this.hero.hp / this.hero.hpMax, this.foe.hp / this.foe.hpMax) < 0.5 ? '高潮' : '相持'; }
  private fresh(id: string, pool: readonly string[]): string {
    let next = pickFresh(this.used, id, pool, this.prose);
    // 句池用完重开时，也避开上一句；仍用旧 fresh 的不放回抽取。
    if (pool.length > 1 && next === this.lastText.get(id)) next = pickFresh(this.used, id, pool, this.prose);
    this.lastText.set(id, next); return next;
  }
  private move(f: Fighter, key: string): Move {
    const pool = unlocked(f.level);
    return pickFresh(this.used, key, pool, this.prose);
  }
  private log(kind: Entry['kind'], text: string, damage?: number, target?: Entry['target']): void {
    this.entries.push({ round: this.round, kind, text, damage, target });
    if (kind === 'key' && damage && damage > 0) this.elapsed += HITSTOP_MS;
  }
  /** 调整实例数据，不替代旧引擎的出手判定和效果解释器。 */
  private prepare(): void {
    const d = this.duel, p = probabilities(this.heroSpec, this.foeSpec), other = probabilities(this.foeSpec, this.heroSpec);
    const shift = (d.mom - 50);
    d.eDodge = p.dodge + shift * 0.002; d.eParry = p.parry + shift * 0.002;
    const dodge = Math.min(0.6, other.dodge);
    d.dodge = dodge - shift * 0.003; d.parryP = 1 - other.hit - dodge;
    const scale = (gap: number): number => 1 + 28 * sigmoid((gap - 140) / 20);
    const probe = this.round < 3 ? 0.85 : 1;
    const heroK = scale(this.gap) * probe, foeK = scale(-this.gap) * probe;
    const mul = (range: [number, number], k: number): [number, number] => [range[0] * k, range[1] * k];
    this.heroMove = this.move(this.heroSpec, 'hero-move'); this.foeMove = this.move(this.foeSpec, 'foe-move');
    d.auto = mul(this.base.auto, heroK * this.heroMove.power);
    d.atk = mul(this.base.atk, foeK * this.foeMove.power);
    d.big = this.base.big * foeK * this.foeMove.power;
    d.dmgK = this.base.dmgK * heroK;
    d.open = mul(this.base.open, heroK);
    for (const key of ['block', 'parry', 'rush'] as const) d.counter[key] = mul(this.base.counter[key], heroK);
  }
  private consume(events: Ev[]): void {
    for (const e of events) {
      switch (e.k) {
        case 'auto': {
          const who = e.who === 'me' ? '你' : this.foeSpec.name, other = e.who === 'me' ? this.foeSpec.name : '你';
          const mv = e.who === 'me' ? this.heroMove : this.foeMove;
          const t = tone(e.who === 'me' ? this.gap : -this.gap);
          const manner = { 吃力: '勉力', 相持: '', 从容: '从容', 写意: '信手' }[t];
          const result = e.res === 'hit' ? this.fresh(`hit-${e.who}`, [`点中${other}肩头`, `迫得${other}退步`, `落在${other}臂上`]) : e.res === 'dodge' ? this.fresh(`dodge-${e.who}`, [`${other}侧身让过`, `${other}退步避开`, `${other}身子一偏`]) : this.fresh(`parry-${e.who}`, [`${other}横臂架住`, `${other}托臂卸开`, `${other}顺势引偏`]);
          this.log(e.crit || e.charging ? 'key' : 'auto', `${who}${manner}使「${mv.name}」，${result}。${e.charging ? '聚到一半的劲力被打散，脚下踉跄。' : e.crit ? `${mv.motion}，拳劲透过来臂，衣袖啪地一响。` : ''}`, e.dmg, e.who === 'me' ? 'foe' : 'hero');
          break;
        }
        case 'tell': {
          if (this.choicesDisplayed >= 5 || this.round - this.lastChoice < 4) {
            this.consume(this.duel.respond(null)); this.duel.nextTell = Math.max(6, this.duel.nextTell); break;
          }
          const title = this.foeSpec.level ? `${this.foeSpec.name}沉肩聚劲` : '乱拳逼来';
          const text = this.foeSpec.level ? this.fresh('heavy-trained', ['前拳一收，后拳藏在肘底，脚下踏近。', '肩头微沉，手腕一翻，拳路忽然换了方向。', '前臂横拦，另一拳从身侧递出。']) : this.fresh('heavy-plain', ['对方扑近，抡起双拳一阵乱打。', '对方突然扑过来，双拳一齐砸下。', '对方趁你换步，抡拳朝前猛冲。']);
          this.prompt = { kind: 'heavy', title, text, duration: windowMs(this.gap, this.heroSpec.attrs.insight), options: e.opts.map(o => ({ key: o.k, label: responseNames[o.k], chance: o.p, cost: o.cost, disabled: o.dis, note: o.dis ? `内力不足，须 ${o.cost}` : responseNotes[o.k] })) };
          this.choicesDisplayed++; this.lastChoice = this.round;
          this.log('tell', text); break;
        }
        case 'opening':
          // 至少隔四合再提示一次；保留旧引擎露破绽，只按境界决定能否及时察觉。
          if (this.choicesDisplayed >= 5 || this.round - this.lastOpening < 6 || this.round - this.lastChoice < 4 || this.notices() > sigmoid(this.gap / 45)) { this.duel.dropOpening(); break; }
          this.lastOpening = this.round;
          this.choicesDisplayed++; this.lastChoice = this.round;
          this.duel.nextTell = Math.max(5, this.duel.nextTell);
          this.prompt = { kind: 'opening', title: '回拳稍滞', text: this.fresh('opening', [`${this.foeSpec.name}回拳时手腕一滞。`, `${this.foeSpec.name}换步稍慢，拳路露出一线。`, `${this.foeSpec.name}回臂护身，迟了半分。`]), duration: Math.round(windowMs(this.gap, this.heroSpec.attrs.insight) * 0.8), options: [{ key: 'strike', label: '趁隙出拳', chance: 1, cost: 0, disabled: false, note: '已是你的拳劲能递进去的时机' }, { key: 'wait', label: '稳住架子', chance: 1, cost: 0, disabled: false, note: '收住拳势，继续交锋' }] };
          this.log('tell', this.prompt.text); break;
        case 'resp': {
          const start = e.instinct ? '你来不及细想，凭本能' : '你';
          const action = e.key ? responseNames[e.key] : '护住要害';
          const end = e.ok ? e.dir === 'out' ? this.fresh('resp-out', ['来拳被引到身旁，你顺势还了一拳，点中肩窝。', '拳劲撞在一处，你站稳脚下，对方却退了两步。', '对方拳势一顿，你已穿臂递进，衣袖一抖，拳头送到。']) : this.fresh('resp-safe', ['来势擦身而过，脚下仍站得稳。', '对方的拳路被带开，沙土扬起，你已退到另一侧。', '你稳住呼吸，来拳已过，回身仍留着余地。']) : this.fresh('resp-fail', ['没能化开来劲，肩头挨了一下，鞋底拖出一道痕。', '慢了半拍，来拳已落在臂上，你扶住木桩才站稳。', '脚下虽退了半步，拳劲仍追到身前，胸口一阵酸麻。']);
          this.log('key', `${start}${action}。${end}`, e.dmg, e.dir === 'out' ? 'foe' : e.dir === 'in' ? 'hero' : undefined); break;
        }
        case 'open': this.log('key', this.fresh('open-hit', ['你踏进半步，拳头从来臂下穿过，点住肩窝。对方急收拳势，已迟了一线。', '你收腰送拳，趁回臂的一瞬递进。对方退步护身，衣袖已被拳劲震开。', '你贴住那道拳路，往前一送。对方肩头一震，再也顾不上回手。']), e.dmg, 'foe'); break;
        case 'openMiss': this.log('auto', this.fresh('open-miss', ['你收稳架子，那一线空隙已经合上。', '对方回臂护住身前，你未再追击。', '脚下重新站定，对方拳势已收。'])); break;
        case 'perform': {
          const p = PERFORMS.filter(p => p.level <= this.heroSpec.level)[e.i];
          this.log('perform', e.hit ? `你使「${p.name}」，${p.level < 100 ? '肘尖随转身送出，劲力沿来臂震入肩头。对方连退两步，拳势缓了下来。' : '拳劲一重接着一重，从腰背贯到手上。对方回臂护身，门户却被震开。'}` : `你使「${p.name}」，对方斜退避开，拳劲落在身前的沙地上。`, e.dmg, 'foe'); break;
        }
        case 'ult': this.log('ult', `你沉腰聚劲，使出「${ULT_NAME}」。拳头沿中路递出，衣袖骤然鼓起；来臂被震开，对方脚下再也站不住，沙土拖出两道长痕。`, e.dmg, 'foe'); break;
        case 'held': this.log('auto', '对方半身一僵，脚下顿住，一时接不上拳势。'); break;
        case 'end':
          this.result = e.res === 'flee' ? 'yield' : e.res;
          this.prompt = null;
          this.log('end', this.result === 'win' ? `${this.foeSpec.name}收拳退开，抱拳认负。你也停了手。` : this.result === 'yield' ? '你收拳退后，抱拳认输。对方也停了手。' : '你扶着木桩坐了下来，伤处须养几日。这场交手到此为止。');
          break;
        default: break;
      }
    }
  }
  tick(): void {
    if (this.result || this.prompt) return;
    this.prepare(); this.elapsed += this.nextRoundMs; this.nextDelay = 0; this.consume(this.duel.tick());
    if (!this.result && this.round >= 200 && !this.prompt) this.draw();
  }
  respond(choice: Choice | null, waited = 0): boolean {
    const p = this.prompt; if (!p || this.result) return false;
    if (waited >= p.duration) choice = null;
    if (choice !== null && !p.options.some(o => o.key === choice && !o.disabled)) return false;
    this.elapsed += clamp(waited, 0, p.duration); this.prompt = null;
    this.prepare(); this.consume(p.kind === 'opening' ? choice === 'strike' ? this.duel.takeOpening() : this.duel.dropOpening() : this.duel.respond(choice as RespKey | null));
    if (p.kind === 'heavy') {
      this.duel.nextTell = Math.max(6, this.duel.nextTell);
      if (choice && p.options.find(o => o.key === choice)?.cost === 0) this.nextDelay = 500;
    }
    if (!this.result && this.round >= 200 && !this.prompt) this.draw();
    return true;
  }
  private draw(): void { this.result = 'draw'; this.duel.over = true; this.duel.prompt = null; this.duel.opening = false; this.prompt = null; this.log('end', '双方未能取胜，约定暂歇。'); }
  yield(): void { if (!this.result) this.consume(this.duel.yieldUp()); }
  beginCharge(): boolean { if (this.result || this.prompt || this.duel.charging || this.duel.mp < 4) return false; this.duel.charging = true; return true; }
  releaseCharge(held: number): void {
    if (!this.duel.charging) return;
    this.duel.charging = false;
    if (!Number.isFinite(held) || held < 250 || this.duel.mp < 4) return;
    this.duel.mp -= 4; this.duel.addCharge(Math.min(0.8, held / 1500 * 0.8)); this.log('auto', '你凝神聚劲，内息缓缓沉到腰间。');
  }
  cancelCharge(): void { this.duel.charging = false; }
  perform(index: number, duration = PERFORM_MS): boolean {
    if (this.result || this.prompt || !this.duel.canPerform(index)) return false;
    this.prepare(); this.cancelCharge(); this.elapsed += duration; this.consume(this.duel.perform(index)); return true;
  }
  ultimate(duration = ULT_MS): boolean {
    if (this.result || this.prompt || !this.duel.ultSpec || this.duel.rage < 100) return false;
    this.prepare(); this.cancelCharge(); this.elapsed += duration; this.consume(this.duel.ult()); return true;
  }
}
export type Policy = 'manual' | 'idle';
export function simulate(hero: Fighter, foe: Fighter, seed = 1, policy: Policy = 'manual'): Battle {
  const b = new Battle(hero, foe, seed);
  for (let i = 0; i < 600 && !b.result; i++) {
    if (b.prompt) {
      const p = b.prompt;
      const choice = policy === 'idle' ? null : p.kind === 'opening' ? 'strike' : p.options.filter(o => !o.disabled).sort((a, c) => c.chance - a.chance)[0]?.key ?? null;
      b.respond(choice, policy === 'idle' ? p.duration : Math.min(1000, p.duration));
    } else {
      if (policy === 'manual') {
        b.duel.performs.forEach((_, index) => { if (!b.result) b.perform(index); });
        if (!b.result) b.ultimate();
      }
      if (!b.result && !b.prompt) b.tick();
    }
  }
  return b;
}
export interface Summary { games: number; wins: number; draws: number; winRate: number; rounds: number; seconds: number; oneRound: number }
export function batch(hero: Fighter, foe: Fighter, games = 1000, seed = 1, policy: Policy = 'manual'): Summary {
  const count = Math.round(clamp(finite(games, 1000), 1, 10000));
  let wins = 0, draws = 0, rounds = 0, elapsed = 0, oneRound = 0;
  for (let i = 0; i < count; i++) { const b = simulate(hero, foe, seed + i, policy); wins += Number(b.result === 'win'); draws += Number(b.result === 'draw'); rounds += b.round; elapsed += b.elapsed; oneRound += Number(b.round === 1); }
  return { games: count, wins, draws, winRate: wins / count, rounds: rounds / count, seconds: elapsed / count / 1000, oneRound: oneRound / count };
}
