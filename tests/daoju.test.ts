/**
 * 道具与纸娃娃（docs/zhuangbei.md 第三到第五节）。
 * - 规矩：道具的说明里写了能做什么，就真能做到（能机器判断的都在这里查）；
 * - 装备的数值按装备位和品级封顶，武功是根本、装备锦上添花：拿交手引擎量胜率；
 * - 穿戴、服用、细看、赠礼、典当都真的做得到，脱了又穿不白白回血。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ITEMS, NPCS, itemById, npc } from '../src/content';
import type { AttrKey, GearSlot, GearStats, ItemDef, ItemKind, NpcDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { Duel, SKILLED, simulate, type HeroSpec } from '../src/engine/duel';
import { standard, hpMaxOf, type Build, type Gear, type Person } from '../src/engine/person';
import { mulberry32 } from '../src/engine/rng';
import { personOf } from '../src/engine/ren';
import { GEAR_GRADES, GEAR_KEYS, GEAR_POINTS, GEAR_SLOT, SLOT_STATS, gearBonus, gearCap, gearPoints } from '../src/engine/zhuangbei';
import { giftable, giveGift, lookItem, pawn, pawnPrice, useBlock, useItem, wear } from '../src/engine/daoju';
import { act, verbsOf } from '../src/engine/world';

const KINDS: ItemKind[] = ['药', '酒食', '装备', '信物', '杂物'];
const SLOTS: GearSlot[] = ['兵器', '冠', '衣', '靴', '佩', '饰'];
const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];
const report = (errs: string[]): void => { expect(errs, '\n' + errs.join('\n')).toEqual([]); };

describe('道具：说明里写了能做什么，就真能做到', () => {
  it('每件道具都分了类；药、酒食有服用的效果，装备能穿戴，信物不卖', () => {
    const errs: string[] = [];
    for (const it of ITEMS) {
      const w = `道具 ${it.id}（${it.name}）`;
      if (!KINDS.includes(it.kind)) errs.push(`${w}：kind 要是 ${KINDS.join('、')} 之一`);
      if ((it.kind === '药' || it.kind === '酒食') && !it.use?.length) errs.push(`${w}：${it.kind}要写 use（服用、饮用的效果）`);
      if (it.use && it.kind !== '药' && it.kind !== '酒食') errs.push(`${w}：只有药、酒食能服用，别的类不写 use`);
      if (it.kind === '装备' && !it.equip) errs.push(`${w}：装备要写 equip（装备位）`);
      if (it.equip && it.kind !== '装备' && it.kind !== '信物') errs.push(`${w}：能穿戴的东西，kind 写装备（信物类的佩饰写信物）`);
      if (it.kind === '信物' && it.price !== undefined) errs.push(`${w}：信物、线索不卖，不写 price`);
      if (it.kind !== '信物' && !it.hidden && !(Number.isInteger(it.price) && it.price! > 0)) errs.push(`${w}：要写 price（买价，正整数，单位文），铺子卖它、当铺收它都按这个价`);
      for (const e of it.use ?? []) {
        // cure：治伤的药（跌打酒、内伤药，engine/shang.ts）
        if (!['heal', 'cure', 'feed', 'toast', 'flag', 'xinmo'].includes(e.type)) errs.push(`${w}：use 里只能写 heal、cure、feed、toast、flag、xinmo，不能写 ${e.type}`);
        if (e.type === 'heal' && !(e.hp || e.mp || e.hpFrac || e.mpFrac || e.hpAtLeast)) errs.push(`${w}：heal 没写回多少`);
      }
      it.look?.forEach((b, i) => { if (!b.text) errs.push(`${w}：look[${i}] 没有 text`); });
    }
    report(errs);
  });

  it('说明里许诺的动作做得到：「送人」「请人喝」就能赠礼，「卖」「当」就有价，「喝」「服用」就能吃，战斗里用得上的只有金疮药和飞蝗石', () => {
    const errs: string[] = [];
    for (const it of ITEMS) {
      const w = `道具 ${it.id}（${it.name}）`, d = it.desc;
      if (/送人|请人/.test(d) && it.kind === '信物') errs.push(`${w}：说明里写了能送人，信物却不能赠礼`);
      if (/卖(?!身)|当铺|典当/.test(d) && !pawnPrice(it)) errs.push(`${w}：说明里写了能卖，却没有 price（或是信物）`);
      if (/喝|服用|饮用/.test(d) && !it.use?.length) errs.push(`${w}：说明里写了能喝、能服用，却没有 use`);
      // 战斗界面（ui/fight.ts）只认金疮药（服用）和飞蝗石（暗器）
      if (/战斗中/.test(d) && !['jcy', 'fhs'].includes(it.id)) errs.push(`${w}：说明里写了战斗中能用，可战斗里只用得上金疮药和飞蝗石`);
      if (/穿|戴|佩/.test(d) && !it.equip && it.kind === '装备') errs.push(`${w}：说明里写了能穿戴，却没有 equip`);
    }
    report(errs);
  });

  it('兵器位写了兵器的类型和长短，别的装备位不写', () => {
    const errs: string[] = [];
    for (const it of ITEMS) {
      const e = it.equip;
      if (!e) continue;
      const w = `道具 ${it.id}（${it.name}）`;
      if (!SLOTS.includes(e.slot)) errs.push(`${w}：装备位「${e.slot}」不认识`);
      if (e.slot === '兵器' && (!e.weapon || !e.reach)) errs.push(`${w}：兵器要写 weapon（剑、刀……）和 reach（长、短）`);
      if (e.slot !== '兵器' && (e.weapon || e.reach)) errs.push(`${w}：只有兵器写 weapon、reach`);
    }
    report(errs);
  });

  it('人物喜欢的东西（likes）是存在的道具，而且送得出手（不是信物）', () => {
    const errs: string[] = [];
    for (const n of NPCS) for (const id of n.likes ?? []) {
      const it = itemById(id);
      if (!it) errs.push(`人物 ${n.id}：likes 里的道具「${id}」不存在`);
      else if (it.kind === '信物') errs.push(`人物 ${n.id}：likes 里的「${it.name}」是信物，送不出去`);
    }
    report(errs);
  });
});

describe('装备的数值：按装备位和品级封顶', () => {
  it('每件装备的点数不超过上限，只有它这个位置该有的几项，数都是正整数', () => {
    const errs: string[] = [];
    for (const it of ITEMS) {
      const e = it.equip;
      if (!e) continue;
      const w = `道具 ${it.id}（${it.name}）`;
      const st = e.stats ?? {};
      if (it.kind === '信物' && Object.keys(st).length) errs.push(`${w}：信物类的佩饰没有数值，只有剧情作用`);
      if (e.grade && !GEAR_GRADES.includes(e.grade)) errs.push(`${w}：装备的品级只有凡品到神品`);
      if (Object.keys(st).length && !e.grade) errs.push(`${w}：有数值就要写 grade（品级），上限跟着品级走`);
      for (const k of Object.keys(st) as (keyof GearStats)[]) if (!SLOT_STATS[e.slot].includes(k)) errs.push(`${w}：${e.slot}不给 ${k}，只给 ${SLOT_STATS[e.slot].join('、')}`);
      for (const [k, v] of Object.entries(st)) {
        if (k === 'attr') {
          for (const [a, n] of Object.entries(v as Partial<Record<AttrKey, number>>)) {
            if (!ATTRS.includes(a as AttrKey)) errs.push(`${w}：根基「${a}」不认识`);
            if (!(Number.isInteger(n) && n! > 0)) errs.push(`${w}：根基 ${a} 要是正整数`);
          }
        } else if (!(Number.isInteger(v) && (v as number) > 0)) errs.push(`${w}：${k} 要是正整数`);
      }
      const p = gearPoints(st), cap = gearCap(e.slot, e.grade);
      if (p > cap + 1e-9) errs.push(`${w}：${e.grade ?? '没写品级'}的${e.slot}最多 ${cap} 点，现在 ${p} 点（出手、护体、闪避一个百分点一点，根基一点一点，内力二十点一点）`);
    }
    report(errs);
  });

  it('品级越高上限越高，兵器最大、衣次之', () => {
    for (const slot of SLOTS) for (let i = 1; i < GEAR_GRADES.length; i++) expect(GEAR_POINTS[slot][GEAR_GRADES[i]]).toBeGreaterThanOrEqual(GEAR_POINTS[slot][GEAR_GRADES[i - 1]]);
    for (const g of GEAR_GRADES) {
      expect(GEAR_POINTS.兵器[g]).toBeGreaterThanOrEqual(GEAR_POINTS.衣[g]);
      for (const s of ['冠', '靴', '佩', '饰'] as GearSlot[]) expect(GEAR_POINTS.衣[g]).toBeGreaterThanOrEqual(GEAR_POINTS[s][g]);
    }
  });
});

/* ---------- 量胜率：武功是根本，装备锦上添花 ---------- */

const BUILDS: Build[] = ['outer', 'inner', 'light'];
const hero = (p: Person): HeroSpec => ({
  person: p,
  performs: [
    { name: '绝招一', mp: 45, cd: 3, hits: 1, dmg: [150, 190], acc: 0.85, fx: [] },
    { name: '绝招二', mp: 75, cd: 5, hits: 1, dmg: [220, 280], acc: 0.8, fx: [] }
  ],
  ult: { dmg: [520, 600], fx: [] }
});
/** 九种偏科配对，每对 n 场；同样的种子，只差身上的装备 */
function winRate(ht: number, ft: number, gear: Gear | undefined, n = 60, salt = 1): number {
  let w = 0, all = 0;
  for (const hb of BUILDS) for (const fb of BUILDS) for (let i = 0; i < n; i++) {
    const d = new Duel(hero({ ...standard(ht, hb), gear }), { person: standard(ft, fb), name: '对手', tells: ['li', 'su', 'qiao'] }, { rng: mulberry32(salt * 100003 + all * 7919 + 17) });
    if (simulate(d, SKILLED).res === 'win') w++;
    all++;
  }
  return w / all;
}
/** 把几件装备的数值加起来（假定兵器和兵刃武功对得上，按最好的情形算） */
function sum(list: ItemDef[]): Gear {
  const g: Required<Omit<Gear, 'attr'>> & { attr: Partial<Record<AttrKey, number>> } = { chushou: 0, huti: 0, shanbi: 0, neili: 0, attr: {} };
  for (const it of list) {
    const st = it.equip?.stats ?? {};
    g.chushou += st.chushou ?? 0; g.huti += st.huti ?? 0; g.shanbi += st.shanbi ?? 0; g.neili += st.neili ?? 0;
    for (const [a, v] of Object.entries(st.attr ?? {}) as [AttrKey, number][]) g.attr[a] = (g.attr[a] ?? 0) + v;
  }
  return g;
}
/** 内容里每个装备位挑点数最高的一件（只挑这几个品级） */
function bestOutfit(grades: string[]): ItemDef[] {
  return SLOTS.flatMap(slot => {
    const c = ITEMS.filter(it => it.equip?.slot === slot && it.equip.grade && grades.includes(it.equip.grade))
      .sort((a, b) => gearPoints(b.equip!.stats) - gearPoints(a.equip!.stats));
    return c.length ? [c[0]] : [];
  });
}
/** 每个位置都顶到上限，点数全放在最值钱的那一项上（闪避、出手最值钱，根基最不值） */
function capOutfit(g: 'DUMMY' | (typeof GEAR_GRADES)[number]): Gear {
  const P = (s: GearSlot): number => (g === 'DUMMY' ? 0 : GEAR_POINTS[s][g]);
  return { chushou: P('兵器'), huti: P('衣') + P('冠'), shanbi: P('靴'), attr: { 身法: P('佩') + P('饰') } };
}

describe('装备锦上添花：拿交手引擎量（docs/foundation.md 第三节第二条）', () => {
  it('同一个人，穿满凡品到良品装备，对同档对手胜率提高不超过十个百分点', () => {
    const outfit = bestOutfit(['凡品', '良品']);
    // 内容里六个位置都有凡品、良品可穿
    expect(outfit.map(it => it.equip!.slot).sort()).toEqual([...SLOTS].sort());
    for (const t of [1, 2]) {
      const base = winRate(t, t, undefined, 100, t);
      const worn = winRate(t, t, sum(outfit), 100, t);
      const cap = winRate(t, t, capOutfit('良品'), 100, t);
      expect(worn,`档次 ${t}：一身内容里最好的凡品、良品`).toBeGreaterThanOrEqual(base);
      expect(worn - base, `档次 ${t}：一身内容里最好的凡品、良品，胜率 ${base.toFixed(2)} → ${worn.toFixed(2)}`).toBeLessThanOrEqual(0.1);
      expect(cap - base, `档次 ${t}：一身顶到上限的良品，胜率 ${base.toFixed(2)} → ${cap.toFixed(2)}`).toBeLessThanOrEqual(0.1);
    }
  }, 120000);

  it('一身神品顶到上限，同档也只多十几个点；三流穿上也打不赢一流', () => {
    for (const t of [1, 2]) {
      const base = winRate(t, t, undefined, 100, 7 + t), shen = winRate(t, t, capOutfit('神品'), 100, 7 + t);
      expect(shen - base, `档次 ${t}：一身顶到上限的神品，胜率 ${base.toFixed(2)} → ${shen.toFixed(2)}`).toBeLessThanOrEqual(0.15);
    }
    expect(winRate(1, 3, capOutfit('神品'), 40, 9)).toBeLessThan(0.05);
  }, 120000);
});

/* ---------- 动作 ---------- */

describe('穿戴：六个装备位', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('穿上衣服，气血上限多了护体的那一截；当前气血按成数保留，脱了又穿不白白回血', () => {
    S.items.zb_pijia = 1;
    S.hp = Math.round(S.hpMax / 2);
    const hp0 = S.hp, max0 = S.hpMax;
    expect(wear('body', 'zb_pijia')).toBeNull();
    expect(S.gear.body).toBe('zb_pijia');
    expect(S.hpMax).toBe(hpMaxOf(personOf(S)));
    expect(S.hpMax / max0).toBeCloseTo(1.02, 2);
    expect(S.hp / S.hpMax).toBeCloseTo(hp0 / max0, 2);
    for (let i = 0; i < 20; i++) { wear('body', null); wear('body', 'zb_pijia'); }
    wear('body', null);
    expect(S.hpMax).toBe(max0);
    expect(S.hp).toBeLessThanOrEqual(hp0 + 1);
  });

  it('放错位置、行囊里没有的穿不上', () => {
    S.items.zb_douli = 1;
    expect(wear('body', 'zb_douli')).toContain('放不进');
    expect(wear('head', 'zb_pijia')).toContain('没有');
    expect(S.gear).toEqual({ weapon: 'qingfeng' });
    expect(wear('head', 'zb_douli')).toBeNull();
    expect(GEAR_SLOT.head).toBe('冠');
  });

  it('装备的数值并进「人」：护体、闪避、内力、后天根基；兵器的出手只在兵刃武功对得上时才算', () => {
    Object.assign(S.items, { zb_tieyanli: 1, zb_kuaixue: 1, zb_yangzhi: 1, zb_yinzhuo: 1, blade: 1 });
    const h0 = personOf(S);
    wear('head', 'zb_tieyanli'); wear('feet', 'zb_kuaixue'); wear('waist', 'zb_yangzhi'); wear('ring', 'zb_yinzhuo');
    const g = gearBonus(S);
    expect(g).toEqual({ chushou: 0, huti: 2, shanbi: 2, neili: 20, attr: { 根骨: 2, 悟性: 1 } });
    expect(S.mpMax).toBe(Math.round(h0.gongli * 100 * (1 + 0.01 * (S.attr.根骨 - 20))) + 20);
    // 黑风断首刀是刀，兵刃位是寒江剑法：拿着它出手用拳脚，刀再好也没用
    wear('weapon', 'blade');
    expect(gearBonus(S).chushou).toBe(0);
    // 兵刃位换成一门刀法，刀的出手才算上
    S.skills.mr_heifengdao = { r: 0, p: 0 };
    S.loadout.weapon = 'mr_heifengdao';
    expect(gearBonus(S).chushou).toBe(3);
    expect(personOf(S).gear?.chushou).toBe(3);
    // 被剧情拿走了（行囊里没有了），身上的也就不算
    S.items.zb_kuaixue = 0;
    expect(gearBonus(S).shanbi).toBe(0);
  });

  it('第四版存档的五个空位：纸娃娃的六个键都认得', () => {
    expect(GEAR_KEYS).toEqual(['weapon', 'head', 'body', 'feet', 'waist', 'ring']);
  });
});

describe('服用、饮用、细看', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('金疮药回三成气血，满了不必吃；行囊里少一件', () => {
    S.hp = 100;
    const n = S.items.jcy!;
    const r = useItem('jcy');
    expect(r.ok).toBe(true);
    expect(S.hp).toBe(100 + Math.round(S.hpMax * 0.3));
    expect(S.items.jcy).toBe(n - 1);
    expect(r.text).toContain('服用金疮药');
    S.hp = S.hpMax;
    expect(useBlock(itemById('jcy')!)).toBe('气血是满的');
    expect(useItem('jcy').ok).toBe(false);
    expect(S.items.jcy).toBe(n - 1);
  });

  it('花雕饮用回一成内力，记一句见闻；信物、装备不能服用', () => {
    S.items.huadiao = 1;
    S.mp = 0;
    expect(useItem('huadiao').ok).toBe(true);
    expect(S.mp).toBe(Math.round(S.mpMax * 0.1));
    expect(S.items.huadiao).toBe(0);
    expect(S.feed[0].x).toContain('泥封');
    expect(useItem('jade').ok).toBe(false);
    expect(useItem('qingfeng').ok).toBe(false);
  });

  it('细看：先是说明，线索随剧情多出一句', () => {
    expect(lookItem('jade').more).toBe('');
    S.flags.bei = true;
    expect(lookItem('jade').text).toContain('半个「寒」字');
    expect(lookItem('jade').more).toContain('石碑');
  });
});

describe('赠礼、典当', () => {
  beforeEach(() => setState(skipToYangzhou()));
  const liu = (): NpcDef => npc('liu')!;

  it('送了人物喜欢的（杏花），关系升一级；送别的只是客气收下；信物不送', () => {
    S.items.flower = 1; S.items.huadiao = 1;
    expect(S.rel.liu).toBe('素不相识');
    expect(giveGift(liu(), '柳寒舟', 'huadiao')).toContain('客客气气');
    expect(S.rel.liu).toBe('素不相识');
    expect(S.items.huadiao).toBe(0);
    expect(giveGift(liu(), '柳寒舟', 'flower')).toBe(liu().gift);
    expect(S.rel.liu).toBe('点头之交');
    expect(S.items.flower).toBe(0);
    expect(giftable(itemById('jade')!)).toBe(false);
    expect(giveGift(liu(), '柳寒舟', 'jade')).toBe('你身上没有合适的礼物。');
    expect(S.items.jade).toBe(1);
    // 身上穿着的那一件不送
    expect(giftable(itemById('qingfeng')!)).toBe(false);
  });

  it('从人物身上点「赠礼」，挑好那一件：花掉一点时间，回话照人物写的来', () => {
    S.items.flower = 2;
    const m = S.min;
    const r = act('liu', '赠礼', 'flower');
    expect(r.text).toBe(liu().gift);
    expect(S.items.flower).toBe(1);
    expect(S.min).not.toBe(m);
    expect(act('liu', '赠礼').text).toBe('你身上没有合适的礼物。');
  });

  it('当铺（service 有「当」）自动有「典当」；按买价四成收，信物不收，身上穿着的最后一件先卸下', () => {
    const shop: NpcDef = { id: 'test_dang', name: '朝奉', brief: '', look: '', verbs: ['交谈'], actions: { 交谈: [{ text: '' }] }, service: ['当'] };
    expect(verbsOf(shop)).toEqual(['交谈', '打听', '典当']);
    expect(verbsOf({ ...shop, service: ['医'] })).toEqual(['交谈', '打听']);
    expect(pawnPrice(itemById('blade')!)).toBe(Math.floor(3000 * 0.4));
    expect(pawnPrice(itemById('jade')!)).toBe(0);
    S.items.blade = 1;
    const s0 = S.silver;
    expect(pawn('朝奉', 'blade')).toContain(`银两 +${1200} 文`);
    expect(S.silver).toBe(s0 + 1200);
    expect(S.items.blade).toBe(0);
    expect(pawn('朝奉', 'jade')).toContain('不收');
    expect(S.items.jade).toBe(1);
    expect(pawn('朝奉', 'qingfeng')).toContain('卸下');
    expect(S.items.qingfeng).toBe(1);
    wear('weapon', null);
    expect(pawn('朝奉', 'qingfeng')).toContain('银两 +600 文');
  });
});
