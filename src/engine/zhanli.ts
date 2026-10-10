/**
 * 战力与评语（docs/sheji-s5-s6.md S5）：人物页「斤两」一块用的东西。
 * 算法和掂斤两、交手是同一套（engine/person.ts 的 tierCont、tierOf）：战力数就是 tierCont 乘一百取整，
 * 对手的战力数也这样算，谁强谁弱因此对得上。
 */
import type { GameState } from '../core/state';
import { foeById, npc } from '../content';
import { cn } from '../core/util';
import { tierCont, tierName, tierOf, type Person } from './person';
import { personOf } from './ren';
import { foePerson, kanrenHurt } from './zhaoshi';
import { npcName } from './world';

/** 战力数：tierCont 乘一百，取整 */
export const zhanliShu = (p: Person): number => Math.round(tierCont(p) * 100);

/** 路数：练得最高的那门比另两门高出一重以上，就偏那一门；否则算均衡 */
export type Lu = 'outer' | 'inner' | 'light' | 'even';
export function luOf(p: Person): Lu {
  const v: [Lu, number][] = [['outer', p.outer], ['inner', p.neigong], ['light', p.qinggong]];
  v.sort((a, b) => b[1] - a[1]);
  return v[0][1] - v[1][1] >= 1 ? v[0][0] : 'even';
}

/**
 * 评语：路数 × 档次（不入流、三流、二流、一流、绝顶、宗师）共二十四句，低档前半写长处、后半写欠缺，
 * 到了绝顶、宗师只写气象。要写进游戏的字，改动请过 docs/wenfeng.md 的十二条。
 */
export const PINGYU: Record<Lu, [string, string, string, string, string, string]> = {
  outer: [
    '拳脚有几分蛮力，招数还没成形，遇上行家便要露怯。',
    '一招一式已有板眼，只是力道使得生硬，内息跟不上手。',
    '拳脚兵刃渐有火候，出手不再拖泥带水，身法还嫌迟滞。',
    '出手沉雄，招里藏着后劲，寻常好手近不得身。',
    '一招递出，落点总在对手破绽上，快慢轻重全凭心意。',
    '拳脚兵刃俱已不着痕迹，信手一递，千般变化都在里头。'
  ],
  inner: [
    '呼吸比常人绵长些，丹田里不过一星暖意，招式更谈不上。',
    '内息初成，一口气能撑得住三五十招，出手却不免松垮。',
    '内力绵绵不绝，挨得起打，只可惜出手少了几分锋芒。',
    '内功已有根底，气脉沉厚，招式虽朴，对手每每先乏。',
    '真气盈满，劲道含而不露，轻轻一推便有千钧之力。',
    '气息吞吐，暗合天地节律，举手投足之间，劲力自在其中。'
  ],
  light: [
    '脚下比旁人快上几分，只是气力不济，跑不远，也躲不久。',
    '身法已见轻灵，进退有些章法，出手却没有分量。',
    '身形灵动，腾挪不凡，对手难沾衣角，可惜内力尚浅。',
    '来去如风，落脚不惊尘土，动起手来总抢在对手前头。',
    '身法已入化境，对手只见衣角一晃，人已到了身后。',
    '凌波渡水，不沾尘泥，天下已少有追得上的人。'
  ],
  even: [
    '拳脚、内息、身法，样样粗浅，尚在门墙之外，须从根基起头。',
    '三样功夫各有几分火候，不偏不倚，只是哪一样也不算出挑。',
    '内外兼修，进退有度，已能在江湖上立一席之地。',
    '内外功夫相济，攻守俱稳，没有明显的短处，同辈里难寻敌手。',
    '拳脚、内力、身法浑然一体，无招可破，无隙可乘。',
    '诸般功夫熔于一炉，外功内功再分不开，抬手便是自家气象。'
  ]
};

/** 战力一块的头两句：战力数和档次，带伤另起一句（受伤不降战力数） */
export function zhanliLine(s: GameState): { power: number; line: string; hurt: string } {
  const p = personOf(s), t = tierOf(p), power = zhanliShu(p);
  const tier = t >= 5 ? tierName(t) : t === 0 ? `${tierName(0)}，${tierName(1)}未满` : `${tierName(t)}之上，${tierName(t + 1)}未满`;
  return { power, line: `战力${cn(power)}：${tier}。`, hurt: kanrenHurt(s) ? '眼下带着伤，战力数不减，真动起手来要吃亏。' : '' };
}

/** 一句评语 */
export const pingyuOf = (s: GameState): string => {
  const p = personOf(s);
  return PINGYU[luOf(p)][tierOf(p)];
};

/** 掂过斤两的人最多记这么多个 */
export const DIAO_MAX = 20;

/** 掂斤两时记下对手：同一人再掂，挪到最后；name 是当时玩家看到的称呼（对手本身就是眼前这人时，列人时仍按此刻他的称呼，不提前漏出没问过的名字） */
export function recordDiao(s: GameState, foeId: string, name: string): void {
  const list = (s.diao ??= []);
  const i = list.findIndex(x => x.id === foeId);
  if (i >= 0) {
    if (i === list.length - 1 && list[i].name === name) return;
    list.splice(i, 1);
  }
  list.push({ id: foeId, name });
  while (list.length > DIAO_MAX) list.shift();
}

export interface Renshi { id: string; name: string; power: number }
export interface RenGuo { strong: Renshi[]; even: Renshi[]; weak: Renshi[] }

/** 每栏最多列几个 */
export const REN_PER_COL = 3;
/** 差不到这么多档算相仿 */
export const XIANGFANG = 1 / 3;

/**
 * 认得的人谁强谁弱：只列交过手的（foeLog）和掂过斤两的（diao），按 tierCont 分三栏，每栏最多三个，
 * 栏内强的在前；都没有就是空（界面不显示这一块）
 */
export function renGuo(s: GameState): RenGuo {
  const names = new Map<string, string>();
  for (const x of s.diao ?? []) names.set(x.id, x.name);
  for (const id of Object.keys(s.foeLog ?? {})) if (!names.has(id)) names.set(id, '');
  const me = tierCont(personOf(s));
  const out: RenGuo = { strong: [], even: [], weak: [] };
  for (const [id, nm] of names) {
    const f = foeById(id);
    if (!f) continue;
    const c = tierCont(foePerson(f)), d = c - me;
    const row = { id, name: npc(id) ? npcName(id) : nm || f.name, power: Math.round(c * 100) };
    (d >= XIANGFANG ? out.strong : d <= -XIANGFANG ? out.weak : out.even).push(row);
  }
  for (const k of ['strong', 'even', 'weak'] as const) out[k] = out[k].sort((a, b) => b.power - a.power).slice(0, REN_PER_COL);
  return out;
}
