/** 门派练功场：只算本回代价和进境，结算交给行动协议。 */
import { REALM_NEED, room, skillById } from '../content';
import type { Effect, FoeDef, SkillId } from '../content/types';
import { S, type GameState } from '../core/state';
import { dayNo } from '../core/time';
import { profMul } from './gengu';
import { retreatPlan } from './lilian';
import { allowance, TIELV_TEXT } from './shiguang';
import { activeOuter } from './wuxue';
import { act, type ActionReq, type ActionResult } from './xingdong';
import { personOf } from './ren';
import { tierCont, type Person } from './person';
import type { DuelRes } from './duel';

export const ZHUANG = { minutes: 240, efficiency: 1.2, minimum: 10, cap: 1.5, hp: 0.05 };
export const MUREN_LIMIT = 4;
export const zhuangId = (school: string): string => `zhudi:zhuang:${school}`;
export const murenId = (school: string, n: number): string => `zhudi:muren:${school}:${n}`;

/** 突破后的熟练不归零：将已经化成重数的那部分也计入。 */
export const totalProf = (s: GameState, id: SkillId): number => {
  const k = s.skills[id];
  return k ? REALM_NEED.slice(0, k.r).reduce((a, b) => a + b, 0) + k.p : 0;
};

export interface ZhuangPlan {
  ok: boolean;
  why?: string;
  effects: Effect[];
  grow: number;
  day: number;
  daily: string;
  key: string;
  note: string;
  skill?: string;
  used: number;
  gained: number;
}

/** 昼夜和门槛在开练时定下，不能到结算时借跨日重练。 */
export function zhuangPlan(s: GameState, at: string = s.loc): ZhuangPlan {
  const r = room(at), school = r?.lianzhuang ?? '';
  const day = dayNo(s), daily = zhuangId(school);
  const p: ZhuangPlan = { ok: true, effects: [], grow: 0, day, daily, key: `${daily}:${day}`, note: '', used: 0, gained: 0 };
  const deny = (why: string): ZhuangPlan => ({ ...p, ok: false, why });
  if (at !== s.loc || !school) return deny('此处没有练功桩。');
  if (s.sect?.school !== school) return deny('这是本门弟子练手的地方。');
  if (s.dayLog?.[daily] === day) return deny('今日已经练过桩了，明日再来。');
  const outer = activeOuter(s);
  if (!outer || outer.school !== school) return deny('先搭配一门本门外功，再上桩练手。');
  const base = r.lianzhuangBase ?? s.loadout.neigong;
  if (!base || totalProf(s, base) < ZHUANG.minimum) return deny(`基本功还不稳，先把${base ? skillById(base)?.name ?? '基本功' : '内功'}的累计熟练练到${ZHUANG.minimum}，才能上桩。`);
  p.skill = outer.id;
  p.effects = [{ type: 'time', add: ZHUANG.minutes }];
  if (s.min < 6 * 60 || s.min >= 18 * 60) { p.note = '夜里练桩，只养筋骨，不长熟练。'; return p; }
  if (!allowance(s)) { p.note = TIELV_TEXT; return p; }
  const remaining = Math.max(0, Math.floor(totalProf(s, base) * ZHUANG.cap) - totalProf(s, outer.id));
  if (!remaining) { p.note = '这门功夫已到基本功的一倍半，先把基本功练深些。'; return p; }
  // 只把实际激发的本门外功纳入分配；同样的历练消耗，换得的熟练多两成。
  const single = { ...s, loadout: { [s.loadout.weapon === outer.id ? 'weapon' : 'fist']: outer.id } };
  const ret = retreatPlan(single, ZHUANG.minutes / 1440);
  const mul = profMul(s, outer);
  const amount = Math.min(Math.round((ret.gains[0]?.[1] ?? 0) * ZHUANG.efficiency), Math.floor((remaining + 0.49) / mul));
  if (amount <= 0) { p.note = '这门功夫已到基本功的一倍半，先把基本功练深些。'; return p; }
  if (s.hp <= Math.ceil(s.hpMax * ZHUANG.hp)) return deny('气血不足，先歇一阵再上桩。');
  // 已到上限附近时不多扣历练：进境减少，实际消化的历练也按比例减少。
  const full = Math.round((ret.gains[0]?.[1] ?? 0) * ZHUANG.efficiency);
  p.used = full ? Math.min(ret.used, Math.ceil(ret.used * amount / full)) : 0;
  p.gained = Math.round(amount * mul);
  p.grow = ZHUANG.minutes / 1440;
  p.effects.push({ type: 'lilian', amount: -p.used }, { type: 'prof', skill: outer.id, amount }, { type: 'heal', hp: -Math.ceil(s.hpMax * ZHUANG.hp) });
  p.note = `练过两个时辰，${outer.name}熟练 +${p.gained}${p.used ? `，消化历练 ${p.used}` : '；没有历练可消化，进境有限'}。`;
  return p;
}

export function zhuangReq(): ActionReq {
  const p = zhuangPlan(S);
  return { who: 'player', verb: '练桩', target: S.loc, at: S.loc, key: p.key };
}

/** 木人场次按门派、开打日计算；换一个练功场也不能重新领四回。 */
export function murenCount(s: GameState, school: string): number {
  return Array.from({ length: MUREN_LIMIT }, (_, i) => s.dayLog?.[murenId(school, i)] === dayNo(s)).filter(Boolean).length;
}

interface MurenCopy { person: Person; hp: number; hpMax: number; key: string; skill?: string }
const copies = new WeakMap<FoeDef, MurenCopy>();
export const murenCopy = (f: FoeDef): MurenCopy | undefined => copies.get(f);

export function murenWhy(s: GameState): string | undefined {
  const school = room(s.loc).lianzhuang;
  if (!school) return '此处没有练功木人。';
  if (s.sect?.school !== school) return '这是本门弟子练手的地方。';
  if (murenCount(s, school) >= MUREN_LIMIT) return '木人被你打坏了，明日再修。';
  if (s.hp <= 1) return '气血不足，先歇一阵再来。';
  return undefined;
}

/** 开打一回先占本日名额；对手只是本回快照，不往内容表或存档里塞假人物。 */
export function openMuren(): { ok: boolean; why?: string; foe?: FoeDef } {
  const why = murenWhy(S);
  if (why) return { ok: false, why };
  const school = room(S.loc).lianzhuang!, day = dayNo(S), daily = murenId(school, murenCount(S, school));
  const key = `${daily}:${day}`, person = structuredClone(personOf(S)), outer = activeOuter(S);
  const f: FoeDef = {
    id: key, name: '木人', title: '练功木人', ini: '木', tone: 'gray', weapon: '木臂', ws: '掌',
    rank: tierCont(person), spar: true, nature: outer?.nature, reach: outer?.reach,
    tag: '练手', moves: outer?.moves?.map(m => m.name) ?? ['平推'], flourish: ['木臂一转'],
    tells: [
      { name: '直推', text: '木臂向前直推。', dom: 'li', after: '桩身一晃。' },
      { name: '横扫', text: '木臂横着扫来。', dom: 'su', after: '桩身一转。' },
      { name: '回绕', text: '木臂绕过来。', dom: 'qiao', after: '木臂收回。' }
    ],
    asides: ['木臂转了回来。'], opening: ['桩身一转，露出空处。'], intro: '你拨动木人，木臂照着你的路数转了起来。',
    win: '木臂停了下来。', lose: '你退了半步，木臂才停住。',
    results: {
      win: { tag: '练手', title: '练过木人', story: '木臂停住，你把方才的出手又想了一遍。' },
      lose: { tag: '练手', title: '收手歇息', story: '你退开来，靠着桩歇了一阵。' },
      yield: { tag: '练手', title: '收手歇息', story: '你收手退开，木臂慢慢停住。' }
    }
  };
  copies.set(f, { person, hp: S.hp, hpMax: S.hpMax, key, skill: outer?.school === school ? outer.id : undefined });
  const result = act({ who: 'player', verb: '打木人', target: S.loc, at: S.loc, key, effects: [] }, undefined, () => {
    (S.dayLog ??= {})[daily] = day;
  });
  return result.ok ? { ok: true, foe: f } : { ok: false, why: result.why };
}

/** 木人不凭空给江湖历练；只在打赢后、额度以内长熟练，和开打凭据共用一次结算。 */
export function settleMuren(f: FoeDef, res: DuelRes): ActionResult {
  const copy = copies.get(f)!;
  const def = copy.skill && skillById(copy.skill);
  const canGrow = res === 'win' && !!def && allowance(S) > 0;
  const effects: Effect[] = [{ type: 'time', add: 15 }];
  if (canGrow && def) effects.push({ type: 'prof', skill: def.id, amount: 10 });
  effects.push({ type: 'feed', tag: '江湖', text: canGrow ? `练过木人，${def && def.name}熟练有所长进。` : res === 'win' && !allowance(S) ? TIELV_TEXT : '木臂停住，你收手歇了一阵。' });
  return act({ who: 'player', verb: '木人结算', target: f.id, key: `${copy.key}:after`, effects }, undefined, () => {
    if (canGrow) S.real.grown = (S.real.grown ?? Math.max(0, dayNo(S) - S.real.startDay)) + 15 / 1440;
  });
}
