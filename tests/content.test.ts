/**
 * 内容数据校验。新增或修改 src/content 下的任何文件后都要通过：npm run validate
 * 报错信息会指出是哪个文件里的哪一条数据有问题。
 */
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, EYES, FOES, ITEMS, JOBS, NPCS, QUESTS, REGIONS, ROOMS, SHI, SKILLS, STORIES, NEWS } from '../src/content';
import type { Branch, Cond, Effect, FxDef } from '../src/content/types';
import type { ContentPack } from '../src/content/types';
import { FORBIDDEN_NAMES } from './forbidden-names';
import { MODERN_WORDS, NEWS_MAX_LEN, SPOILER_ALLOWED_PACKS, SPOILER_WORDS } from './style-rules';
import { ACTIVE_MAX, EFFICIENCY_BAND, JIANGHU_RULE, REALM_STEP, SCHOOL_STYLE, loosen, CATEGORIES, FX_PER_PERFORM, FX_RULES, GRADES, NATURES, OUTER, PASSIVE_MAX, REACHES, SCHOOLS, ULT_MAX, WOUNDS } from '../src/content/skills';
import { passiveCost, performBudget, performEfficiency, performExpected, ultBudget } from '../src/engine/wuxue';
import { REL_WORDS } from '../src/engine/renqing';
import { SHENFEN } from '../src/engine/shenfen';

const roomIds = new Set(ROOMS.map(r => r.id));
const npcIds = new Set(NPCS.map(n => n.id));
const itemIds = new Set(ITEMS.map(i => i.id));
const skillIds = new Set(SKILLS.map(s => s.id));
const foeIds = new Set(FOES.map(f => f.id));
const storyIds = new Set(STORIES.map(s => s.id));
const quests = new Map(QUESTS.map(q => [q.id, q]));
const jobIds = new Set(JOBS.map(j => j.id));
const DEFAULT_VERBS = new Set(['观察', '赠礼', '请教', '切磋', '偷窃']);
const PLACEHOLDERS = new Set(['given', 'name', 'story', 'news']);

function checkCond(c: Cond | undefined, where: string, errs: string[]): void {
  if (!c) return;
  if (c.quest && !quests.has(c.quest.id)) errs.push(`${where}：条件里的任务「${c.quest.id}」不存在`);
  if (c.item && !itemIds.has(c.item.id)) errs.push(`${where}：条件里的物品「${c.item.id}」不存在`);
  if (c.noItem && !itemIds.has(c.noItem)) errs.push(`${where}：条件里的物品「${c.noItem}」不存在`);
  if (c.rel && !npcIds.has(c.rel.npc)) errs.push(`${where}：条件里的人物「${c.rel.npc}」不存在`);
  for (const w of [...(c.rel?.is ?? []), ...(c.rel?.not ?? [])]) if (!REL_WORDS.includes(w)) errs.push(`${where}：关系「${w}」不在关系阶梯里（见 engine/renqing.ts），味道写进 rel 效果的 note`);
  if (c.learned && !skillIds.has(c.learned)) errs.push(`${where}：条件里的武功「${c.learned}」不存在`);
  if (c.notLearned && !skillIds.has(c.notLearned)) errs.push(`${where}：条件里的武功「${c.notLearned}」不存在`);
  if (c.realm && !skillIds.has(c.realm.skill)) errs.push(`${where}：条件里的武功「${c.realm.skill}」不存在`);
  if (c.canLearn && !skillIds.has(c.canLearn)) errs.push(`${where}：条件里的武功「${c.canLearn}」不存在`);
  if (c.sect && !SCHOOL_STYLE[c.sect.school]) errs.push(`${where}：条件里的门派「${c.sect.school}」没有定位（见 SCHOOL_STYLE）`);
  if (c.yue !== undefined) yueRead.add(c.yue);
  if (c.shenfen !== undefined && !SHENFEN[c.shenfen]) errs.push(`${where}：条件里的身份「${c.shenfen}」不存在（见 engine/shenfen.ts）`);
  for (const id of [c.job, c.jobOpen]) if (id !== undefined && !jobIds.has(id)) errs.push(`${where}：条件里的差事「${id}」不存在`);
  if (c.shi) {
    const d = SHI.find(x => x.id === c.shi!.id);
    if (!d) errs.push(`${where}：条件里的世事「${c.shi.id}」不存在`);
    else for (const k of [...(c.shi.at ?? []), ...(c.shi.not ?? [])]) if (!d.steps[k]) errs.push(`${where}：世事「${d.id}」没有「${k}」这一步`);
  }
  c.any?.forEach((x, i) => checkCond(x, `${where} any[${i}]`, errs));
}

/** 约：定下的约、读约的条件、了结的约，最后对一遍账 */
const yueSet = new Set<string>(), yueRead = new Set<string>(), yueDone = new Set<string>();
/** 差事：有人发（job）、有人收（jobDone），最后对一遍账 */
const jobTaken = new Set<string>(), jobDoneSet = new Set<string>();

function checkEffects(list: Effect[] | undefined, where: string, errs: string[]): void {
  for (const e of list || []) {
    const w = `${where}（${e.type}）`;
    switch (e.type) {
      case 'quest': {
        const q = quests.get(e.id);
        if (!q) errs.push(`${w}：任务「${e.id}」不存在`);
        else if (e.stage < 0 || e.stage >= q.stages.length) errs.push(`${w}：任务「${e.id}」没有第 ${e.stage} 阶段`);
        break;
      }
      case 'track': if (!quests.has(e.id)) errs.push(`${w}：任务「${e.id}」不存在`); break;
      case 'item': if (!itemIds.has(e.id)) errs.push(`${w}：物品「${e.id}」不存在`); break;
      case 'rel':
        if (!npcIds.has(e.npc)) errs.push(`${w}：人物「${e.npc}」不存在`);
        for (const x of [e.value, ...(e.from ?? [])]) if (!REL_WORDS.includes(x)) errs.push(`${w}：关系「${x}」不在关系阶梯里（见 engine/renqing.ts），味道写进 note`);
        break;
      case 'prof': case 'learn': if (!skillIds.has(e.skill)) errs.push(`${w}：武功「${e.skill}」不存在`); break;
      case 'move': if (!roomIds.has(e.to)) errs.push(`${w}：地点「${e.to}」不存在`); break;
      case 'fight': if (!foeIds.has(e.foe)) errs.push(`${w}：对手「${e.foe}」不存在`); break;
      case 'story': if (!storyIds.has(e.id)) errs.push(`${w}：剧情「${e.id}」不存在`); break;
      case 'sect': if (!SCHOOL_STYLE[e.school]) errs.push(`${w}：门派「${e.school}」没有定位（见 SCHOOL_STYLE）`); break;
      case 'yue':
        yueSet.add(e.id);
        if (!npcIds.has(e.npc)) errs.push(`${w}：人物「${e.npc}」不存在`);
        if (!roomIds.has(e.at)) errs.push(`${w}：地点「${e.at}」不存在`);
        if (!(e.inDays >= 1 && Number.isInteger(e.inDays))) errs.push(`${w}：inDays 要是一以上的整数`);
        if (!e.text) errs.push(`${w}：要写 text，告诉玩家约的是什么`);
        checkEffects(e.miss, `${w} 的 miss`, errs);
        break;
      case 'yueDone': yueDone.add(e.id); break;
      case 'shenfen': if (!SHENFEN[e.id]) errs.push(`${w}：身份「${e.id}」不存在（见 engine/shenfen.ts）`); break;
      case 'shi': {
        const d = SHI.find(x => x.id === e.id);
        if (!d) errs.push(`${w}：世事「${e.id}」不存在`);
        else if (e.to !== undefined && !d.steps[e.to]) errs.push(`${w}：世事「${e.id}」没有「${e.to}」这一步`);
        break;
      }
      case 'job': case 'jobDone': case 'jobFail':
        if (!jobIds.has(e.id)) errs.push(`${w}：差事「${e.id}」不存在`);
        (e.type === 'job' ? jobTaken : e.type === 'jobDone' ? jobDoneSet : new Set<string>()).add(e.id);
        break;
      default: break;
    }
  }
}

function checkBranches(bs: Branch[] | undefined, where: string, errs: string[], needFallback: boolean): void {
  if (!bs) return;
  if (!bs.length) errs.push(`${where}：分支列表是空的`);
  bs.forEach((b, i) => {
    checkCond(b.if, `${where}[${i}]`, errs);
    checkEffects(b.do, `${where}[${i}]`, errs);
    // 门派武功有前置、师门、门规，学不学得成要先判断，并给学不成的情形留一个分支（见 docs/menpai.md 第七节）
    for (const e of b.do || []) {
      if (e.type !== 'learn') continue;
      const k = SKILLS.find(x => x.id === e.skill);
      if (k && k.school !== JIANGHU_RULE.school && b.if?.canLearn !== e.skill) errs.push(`${where}[${i}]：教「${k.name}」的分支要带条件 canLearn: '${e.skill}'，学不成的情形另写一个分支`);
    }
  });
  if (needFallback && bs.length && bs[bs.length - 1].if) errs.push(`${where}：最后一个分支必须不带 if，保证总有回应`);
}

const report = (errs: string[]): void => { expect(errs, '\n' + errs.join('\n')).toEqual([]); };

describe('内容包', () => {
  it('各类 id 在所有内容包之间不重复', () => {
    const errs: string[] = [];
    const dup = (kind: string, ids: string[]): void => {
      const seen = new Set<string>();
      for (const id of ids) { if (seen.has(id)) errs.push(`${kind} id 重复：${id}`); seen.add(id); }
    };
    dup('对手', FOES.map(f => f.id));
    dup('剧情', STORIES.map(x => x.id));
    dup('任务', QUESTS.map(q => q.id));
    dup('物品', ITEMS.map(i => i.id));
    report(errs);
  });

  it('人物的 at 指向存在的地点', () => {
    const errs: string[] = [];
    for (const n of NPCS) {
      for (const at of [n.at ?? []].flat()) {
        if (!roomIds.has(at.room)) errs.push(`人物 ${n.id}：at 指向不存在的地点「${at.room}」`);
        checkCond(at.if, `人物 ${n.id} 的 at`, errs);
      }
    }
    report(errs);
  });
});

describe('地点', () => {
  it('id 唯一、出口有效且往返相通、区域已登记', () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    for (const r of ROOMS) {
      if (seen.has(r.id)) errs.push(`地点 id 重复：${r.id}`);
      seen.add(r.id);
      if (!REGIONS[r.region]) errs.push(`地点 ${r.id}：区域「${r.region}」没有在 content/index.ts 的 REGIONS 里登记`);
      if (r.map.some(v => v < 5 || v > 95)) errs.push(`地点 ${r.id}：地图坐标要在 5 到 95 之间`);
      for (const [dir, to] of r.exits) {
        if (!dir) errs.push(`地点 ${r.id}：出口缺少方位`);
        if (!roomIds.has(to)) { errs.push(`地点 ${r.id}：出口指向不存在的地点「${to}」`); continue; }
        const back = ROOMS.find(x => x.id === to)!;
        if (!back.exits.some(([, id]) => id === r.id)) errs.push(`地点 ${r.id} → ${to} 是单向的：${to} 也要有回到 ${r.id} 的出口`);
      }
    }
    report(errs);
  });

  it('人物、物品存在且类型正确；条件分支有兜底', () => {
    const errs: string[] = [];
    for (const r of ROOMS) {
      for (const x of r.npcs) {
        const id = typeof x === 'string' ? x : x.id;
        const n = NPCS.find(m => m.id === id);
        if (!n) errs.push(`地点 ${r.id}：人物「${id}」不存在`);
        else if (n.obj) errs.push(`地点 ${r.id}：「${id}」是物品，应写在 objs 里`);
        if (typeof x !== 'string') checkCond(x.if, `地点 ${r.id} 的人物 ${id}`, errs);
      }
      for (const x of r.objs || []) {
        const id = typeof x === 'string' ? x : x.id;
        const n = NPCS.find(m => m.id === id);
        if (!n) errs.push(`地点 ${r.id}：物品「${id}」不存在`);
        else if (!n.obj) errs.push(`地点 ${r.id}：「${id}」是人物，应写在 npcs 里`);
        if (typeof x !== 'string') checkCond(x.if, `地点 ${r.id} 的物品 ${id}`, errs);
      }
      if (Array.isArray(r.desc)) checkBranches(r.desc, `地点 ${r.id} 的 desc`, errs, true);
      if (Array.isArray(r.road)) checkBranches(r.road, `地点 ${r.id} 的 road`, errs, true);
      checkBranches(r.onEnter, `地点 ${r.id} 的 onEnter`, errs, false);
    }
    report(errs);
  });

  it('同一区域内所有地点互相走得到', () => {
    const errs: string[] = [];
    for (const region of Object.keys(REGIONS)) {
      const rs = ROOMS.filter(r => r.region === region);
      if (!rs.length) continue;
      const seen = new Set([rs[0].id]);
      const queue = [rs[0].id];
      while (queue.length) {
        const id = queue.shift()!;
        const cur = ROOMS.find(r => r.id === id)!;
        for (const [, to] of cur.exits) if (!seen.has(to)) { seen.add(to); queue.push(to); }
      }
      rs.filter(r => !seen.has(r.id)).forEach(r => errs.push(`区域 ${region}：地点 ${r.id} 走不到`));
    }
    report(errs);
  });
});

describe('人物与物品', () => {
  it('字段齐全，动作都有回应', () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    for (const n of NPCS) {
      const w = `人物 ${n.id}`;
      if (seen.has(n.id)) errs.push(`人物 id 重复：${n.id}`);
      seen.add(n.id);
      if (n.obj && !n.icon) errs.push(`${w}：物品需要 icon`);
      if (!n.obj && (!n.ini || !n.tone)) errs.push(`${w}：人物需要 ini（头像字）和 tone（配色）`);
      if (!n.look) errs.push(`${w}：缺少 look（观察时的描写）`);
      const verbNames = n.verbs.map(v => (typeof v === 'string' ? v : v.verb));
      n.verbs.forEach(v => { if (typeof v !== 'string') checkCond(v.if, `${w} 的动作「${v.verb}」`, errs); });
      if (new Set(verbNames).size !== verbNames.length) errs.push(`${w}：verbs 里有重复的动作`);
      for (const v of verbNames) {
        if (!DEFAULT_VERBS.has(v) && !n.actions[v]) errs.push(`${w}：动作「${v}」没有写 actions`);
      }
      for (const [v, bs] of Object.entries(n.actions)) {
        if (!verbNames.includes(v as never)) errs.push(`${w}：actions 里的「${v}」没有列在 verbs 里，玩家点不到`);
        checkBranches(bs, `${w} 的「${v}」`, errs, true);
      }
      checkCond(n.altName?.if, `${w} 的 altName`, errs);
    }
    report(errs);
  });

  it('没有放到任何地点的人物会被指出', () => {
    const placed = new Set(ROOMS.flatMap(r => [...r.npcs, ...(r.objs || [])].map(x => (typeof x === 'string' ? x : x.id))));
    const orphans = NPCS.filter(n => !placed.has(n.id)).map(n => n.id);
    expect(orphans, `这些人物没有出现在任何地点：${orphans.join('、')}`).toEqual([]);
  });
});

describe('基础设施', () => {
  /**
   * 负责人试玩：「现在的地图，玩家连个治病疗伤的地方都没有」。
   * 医馆、客栈、兵器铺、当铺、杂货铺由人物的 service 标出（示范 src/content/packs/jichu.ts），缺了、名不副实，这里变红。
   */
  type Npc = (typeof NPCS)[number];
  type Service = NonNullable<Npc['service']>[number];
  /** 扬州是首府，五样都要；其余地区（包括以后新开的苏州等地）至少要有医馆和客栈 */
  const NEED: Record<string, Service[]> = Object.fromEntries(Object.keys(REGIONS).filter(r => ROOMS.some(x => x.region === r))
    .map(r => [r, r === 'yz' ? ['医', '宿', '兵', '当', '杂'] : ['医', '宿']]));
  const ALL_FX = JSON.stringify({ ROOMS, NPCS, STORIES, FOES, ENCOUNTERS });
  const idOf = (x: string | { id: string }): string => (typeof x === 'string' ? x : x.id);
  /** 人物在哪些地点：地点的 npcs、objs，或者人物自己写的 at */
  const placesOf = (n: Npc): string[] => [
    ...ROOMS.filter(r => [...r.npcs, ...(r.objs ?? [])].some(x => idOf(x) === n.id)).map(r => r.id),
    ...[n.at ?? []].flat().map(a => a.room)
  ];
  const regionOf = (room: string): string | undefined => ROOMS.find(r => r.id === room)?.region;
  const branchesOf = (n: Npc): Branch[] => Object.values(n.actions).flatMap(bs => bs ?? []);
  const has = (b: Branch, f: (e: Effect) => boolean): boolean => (b.do ?? []).some(f);
  const pays = (b: Branch): boolean => has(b, e => e.type === 'silver' && e.delta < 0);
  const boughtItems = (b: Branch): string[] => (pays(b) ? (b.do ?? []).flatMap(e => (e.type === 'item' && e.delta > 0 ? [e.id] : [])) : []);
  const servers = NPCS.filter(n => n.service?.length);

  it('扬州五样齐全；其余每个地区至少有医馆和客栈', () => {
    const errs: string[] = [];
    for (const [region, need] of Object.entries(NEED)) {
      const have = new Set(servers.filter(n => placesOf(n).some(r => regionOf(r) === region)).flatMap(n => n.service ?? []));
      for (const s of need) if (!have.has(s)) errs.push(`区域 ${region}（${REGIONS[region]?.name ?? ''}）：没有提供「${s}」的人`);
    }
    report(errs);
  });

  it('带 service 的人真的放在某个地点上', () => {
    const errs: string[] = [];
    for (const n of servers) {
      const ps = placesOf(n);
      if (!ps.length) errs.push(`人物 ${n.id}：标了 service，却没有放进任何地点（写进地点的 npcs，或者用 at）`);
      for (const p of ps) if (!regionOf(p)) errs.push(`人物 ${n.id}：所在的地点「${p}」不存在`);
    }
    report(errs);
  });

  it('服务名副实：医能治伤，宿能歇一宿，兵卖兵器，当收东西给钱，杂卖东西', () => {
    const errs: string[] = [];
    for (const n of servers) {
      const bs = branchesOf(n), w = `人物 ${n.id}（${n.name}）`;
      for (const s of n.service ?? []) {
        if (s === '医' && !bs.some(b => has(b, e => e.type === 'cure' || e.type === 'heal'))) errs.push(`${w}：标了「医」，却没有一个分支用 cure 或 heal`);
        if (s === '宿' && !bs.some(b => has(b, e => e.type === 'heal') && has(b, e => e.type === 'time'))) errs.push(`${w}：标了「宿」，却没有一个分支同时用 heal 和 time（住一宿要回气血、过时辰）`);
        if (s === '兵') {
          const sold = bs.flatMap(boughtItems);
          if (!sold.length) errs.push(`${w}：标了「兵」，却没有一个分支收钱卖东西`);
          for (const id of sold) if (!ITEMS.find(i => i.id === id)?.equip) errs.push(`${w}：标了「兵」，卖的「${id}」不是兵器（物品要带 equip）`);
        }
        // 当铺的「典当」由引擎统一提供（engine/daoju.ts，按买价四成收）；不要再一件一个按钮地写，免得和通用的「典当」重复、价钱对不上
        if (s === '当' && Object.keys(n.actions).some(v => v !== '典当' && v.startsWith('当'))) errs.push(`${w}：标了「当」就自动有「典当」，不要再写「当某某」这样一件一个的动作`);
        if (s === '杂' && !bs.some(b => boughtItems(b).length)) errs.push(`${w}：标了「杂」，却没有一个分支收钱卖东西`);
      }
      // 没伤的人不该花冤枉钱：收钱治伤的分支要带 wounded: true，没伤的情形另写一个分支
      bs.forEach(b => { if (pays(b) && has(b, e => e.type === 'cure') && b.if?.wounded !== true) errs.push(`${w}：收钱治伤的分支要带条件 wounded: true，没伤时另写一句「没伤」`); });
    }
    // cure 的 levels：不写为全治，写了要是一以上的整数
    const levels = new Set([...ALL_FX.matchAll(/"type":"cure","levels":([^,}]+)/g)].map(m => m[1]));
    for (const v of levels) if (!(Number.isInteger(Number(v)) && Number(v) >= 1)) errs.push(`cure 效果的 levels 写成了 ${v}：要是一以上的整数，全治就不写`);
    report(errs);
  });
});

describe('任务、剧情、对手', () => {
  it('任务走得完：每一阶段都有内容能推进到下一阶段（不留断头任务）', () => {
    // 草上飞的教训：任务有三个阶段，却没有任何内容能推进到最后一段，玩家卡死
    const all = JSON.stringify({ ROOMS, NPCS, STORIES, FOES });
    const errs: string[] = [];
    for (const q of QUESTS) {
      const reached = [...all.matchAll(new RegExp(`"type":"quest","id":"${q.id}","stage":(\\d+)`, 'g'))].map(m => Number(m[1]));
      if (!reached.length) errs.push(`任务 ${q.id}「${q.name}」：没有任何内容开启它`);
      for (let s = 0; s < q.stages.length - 1; s++) if (!reached.some(x => x > s)) errs.push(`任务 ${q.id}「${q.name}」：第 ${s} 阶段「${q.stages[s].title}」之后，没有任何内容能推进下去，玩家会卡死`);
    }
    report(errs);
  });

  it('任务阶段的目的地存在', () => {
    const errs: string[] = [];
    for (const q of QUESTS) q.stages.forEach((s, i) => { if (s.to && !roomIds.has(s.to)) errs.push(`任务 ${q.id} 第 ${i} 阶段：目的地「${s.to}」不存在`); });
    report(errs);
  });

  it('剧情卡片的跳转和效果有效', () => {
    const errs: string[] = [];
    for (const s of STORIES) {
      if (!s.cards.length) errs.push(`剧情 ${s.id}：没有卡片`);
      s.cards.forEach((c, i) => {
        if (!c.choices.length) errs.push(`剧情 ${s.id} 第 ${i} 张：没有选项`);
        else if (c.choices.every(ch => ch.if)) errs.push(`剧情 ${s.id} 第 ${i} 张：选项都带条件，条件都不成立时玩家会卡住；至少留一个不带 if 的`);
        c.choices.forEach((ch, k) => {
          const w = `剧情 ${s.id} 第 ${i} 张第 ${k} 个选项`;
          if (ch.next !== undefined && ch.next !== -1 && (ch.next < 0 || ch.next >= s.cards.length)) errs.push(`${w}：next 指向不存在的卡片`);
          checkCond(ch.if, w, errs);
          checkEffects(ch.do, w, errs);
        });
      });
    }
    report(errs);
  });

  it('对手的档次、重招和结算有效', () => {
    const errs: string[] = [];
    for (const f of FOES) {
      const w = `对手 ${f.id}`;
      if (!f.tells.length) errs.push(`${w}：至少要有一招重招（tells）`);
      for (const t of f.tells) if (!['li', 'su', 'qiao'].includes(t.dom)) errs.push(`${w} 的「${t.name}」：dom 只能写 li、su、qiao`);
      if (!(f.rank >= 0 && f.rank <= 5)) errs.push(`${w}：rank（档次）要在 0 到 5 之间`);
      if (f.weak !== undefined && !(f.weak > 0 && f.weak <= 1)) errs.push(`${w}：weak 要在 0 到 1 之间`);
      if (!f.moves.length || !f.flourish.length || !f.opening.length || !f.asides.length) errs.push(`${w}：moves、flourish、opening、asides 都不能为空`);
      for (const [k, r] of Object.entries(f.results)) {
        if (!r) continue;
        if (!r.silent && (!r.tag || !r.title || !r.story || !r.button)) errs.push(`${w} 的结算 ${k}：非 silent 的结算需要 tag、title、story、button`);
        checkEffects(r.do, `${w} 的结算 ${k}`, errs);
        checkEffects(r.then, `${w} 的结算 ${k} 的 then`, errs);
        if (r.after && k !== 'win') errs.push(`${w} 的结算 ${k}：胜负以后（after）只写在 win 上`);
        if (r.after) {
          if (!r.after.plea) errs.push(`${w}：胜负以后要写 plea（对手倒下以后说的话）`);
          if (r.after.opts.length < 2) errs.push(`${w}：胜负以后至少两条路`);
          r.after.opts.forEach((o, i) => {
            const ow = `${w} 胜负以后的第 ${i + 1} 条路`;
            if (!o.label || !o.say || !o.later) errs.push(`${ow}：要写 label、say、later（later 写这件事以后在哪里回来）`);
            checkCond(o.if, ow, errs);
            checkEffects(o.do, ow, errs);
          });
        }
      }
      if (!f.spar && !f.script && !f.results.lose) errs.push(`${w}：会输的战斗需要 lose 结算`);
      // 备战：每一项要有叙述；知彼单项最多打八五折（低一档的人备战做满，胜率不超过六成）；帮手一共最多替你打掉四成半
      let share = 0;
      (f.prep ?? []).forEach((p, i) => {
        const pw = `${w} 的备战 ${i}`;
        checkCond(p.if, pw, errs);
        checkEffects(p.win, `${pw} 的 win`, errs);
        if (!p.text) errs.push(`${pw}：要写 text，开打时告诉玩家这项准备起了作用`);
        for (const k of ['atk', 'big'] as const) if (p[k] !== undefined && (p[k]! < 0.85 || p[k]! > 1)) errs.push(`${pw}：${k} 要在 0.85 到 1 之间`);
        if (p.ally) {
          const a = p.ally;
          if (!a.name || !a.say.length) errs.push(`${pw}：帮手要写 name 和 say`);
          if (!(a.share >= 0.1 && a.share <= 0.3)) errs.push(`${pw}：帮手的 share 要在 0.1 到 0.3 之间`);
          if (!a.at.length || a.at.some((x, j) => !Number.isInteger(x) || x < 1 || (j > 0 && x <= a.at[j - 1]))) errs.push(`${pw}：帮手的 at 是从小到大的合数`);
          share += a.share;
        }
      });
      if (share > 0.45) errs.push(`${w}：帮手一共最多替你打掉四成半气血`);
    }
    report(errs);
  });

  it('路遇有效：剧情、地区、地点都存在；历练不超过上限', () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    for (const e of ENCOUNTERS) {
      const w = `路遇 ${e.id}`;
      if (seen.has(e.id)) errs.push(`${w}：id 重复`);
      seen.add(e.id);
      const st = STORIES.find(x => x.id === e.story);
      if (!st) errs.push(`${w}：剧情「${e.story}」不存在`);
      if (!e.region.length) errs.push(`${w}：至少写一个地区`);
      for (const r of e.region) if (!REGIONS[r]) errs.push(`${w}：地区「${r}」不存在`);
      for (const t of e.to ?? []) {
        const r = ROOMS.find(x => x.id === t);
        if (!r) errs.push(`${w}：地点「${t}」不存在`);
        else if (!e.region.includes(r.region)) errs.push(`${w}：地点「${t}」不在它的地区里`);
      }
      if (e.weight !== undefined && !(e.weight > 0)) errs.push(`${w}：weight 要大于 0`);
      checkCond(e.if, w, errs);
      // 一条路上最多拿到的历练：每张卡片取给得最多的那个选项，加起来
      if (st) {
        const most = st.cards.reduce((sum, c) => sum + Math.max(0, ...c.choices.map(ch => (ch.do ?? []).reduce((a, x) => a + (x.type === 'lilian' ? x.amount : 0), 0))), 0);
        const cap = e.once ? 200 : 40;
        if (most > cap) errs.push(`${w}：一次最多给历练 ${most}，${e.once ? '奇遇' : '能反复遇的路遇'}不超过 ${cap}`);
      }
    }
    report(errs);
  });

  it('传闻条件有效', () => {
    const errs: string[] = [];
    NEWS.forEach((n, i) => checkCond(n.if, `传闻 ${i}`, errs));
    report(errs);
  });
});

describe('武功', () => {
  const len = (t: string | undefined, min: number, max: number): boolean => !!t && t.length >= min && t.length <= max;

  function checkFx(list: FxDef[] | undefined, w: string, errs: string[], passive = false): void {
    for (const fx of list || []) {
      const rule = FX_RULES[fx.kind];
      if (!rule) { errs.push(`${w}：效果「${fx.kind}」不存在`); continue; }
      if (passive) {
        if (!rule.passive) { errs.push(`${w}：「${fx.kind}」不能做被动效果，被动只能用 guard、haste、heal、rage`); continue; }
        if (fx.value === undefined || fx.value < rule.passive[0] || fx.value > rule.passive[1]) errs.push(`${w}：被动「${fx.kind}」的 value 要在 ${rule.passive.join(' 到 ')} 之间`);
        continue;
      }
      if (rule.value && (fx.value === undefined || fx.value < rule.value[0] || fx.value > rule.value[1])) errs.push(`${w}：「${fx.kind}」的 value 要在 ${rule.value.join(' 到 ')} 之间`);
      if (!rule.value && fx.value !== undefined) errs.push(`${w}：「${fx.kind}」不用写 value`);
      if (rule.rounds && (fx.rounds === undefined || fx.rounds < rule.rounds[0] || fx.rounds > rule.rounds[1])) errs.push(`${w}：「${fx.kind}」的 rounds 要在 ${rule.rounds.join(' 到 ')} 之间`);
      if (!rule.rounds && fx.rounds !== undefined) errs.push(`${w}：「${fx.kind}」是一次性效果，不用写 rounds`);
      if (fx.chance !== undefined && (fx.chance < 0.1 || fx.chance > 1)) errs.push(`${w}：「${fx.kind}」的 chance 要在 0.1 到 1 之间`);
    }
  }

  it('字段齐全，取值合规，数值不超品级预算', () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    const grades = new Set(GRADES.map(g => g[0]));
    const ids = new Set(SKILLS.map(k => k.id));
    for (const k of SKILLS) {
      const w = `武功 ${k.id}`;
      if (seen.has(k.id)) errs.push(`武功 id 重复：${k.id}`);
      seen.add(k.id);
      if (!/^[a-z][a-z0-9_]*$/.test(k.id)) errs.push(`${w}：id 只能用小写字母、数字和下划线`);
      if (!len(k.name, 2, 8)) errs.push(`${w}：名字要 2 到 8 个字`);
      if (!grades.has(k.grade)) errs.push(`${w}：品级「${k.grade}」不存在`);
      if (!CATEGORIES.includes(k.category)) errs.push(`${w}：分类「${k.category}」不存在`);
      if (!SCHOOLS.includes(k.school)) errs.push(`${w}：门派「${k.school}」不在 src/content/skills.ts 的 SCHOOLS 里`);
      if (!NATURES.includes(k.nature)) errs.push(`${w}：性质「${k.nature}」不存在`);
      if (!len(k.desc, 10, 120)) errs.push(`${w}：desc 要 10 到 120 个字`);
      if (!len(k.learn, 2, 30)) errs.push(`${w}：learn（怎样学到）要 2 到 30 个字`);
      const outer = OUTER.includes(k.category);
      if (outer && (!k.reach || !REACHES.includes(k.reach))) errs.push(`${w}：拳脚、兵刃必须写 reach（长、短、徒手）`);
      const moves = k.moves || [];
      if (outer && (moves.length < 6 || moves.length > 12)) errs.push(`${w}：拳脚、兵刃要写 6 到 12 招，现在是 ${moves.length} 招`);
      if (!outer && moves.length > 12) errs.push(`${w}：招式最多 12 招`);
      if (new Set(moves.map(m => m.name)).size !== moves.length) errs.push(`${w}：招名有重复`);
      if (outer && moves.length && moves.filter(m => !m.realm).length < 3) errs.push(`${w}：至少要有 3 招一开始就会（不写 realm）`);
      moves.forEach(m => {
        const mw = `${w} 的招式「${m.name}」`;
        if (!len(m.name, 2, 8)) errs.push(`${mw}：招名要 2 到 8 个字`);
        if (!len(m.text, 8, 60)) errs.push(`${mw}：描写要 8 到 60 个字`);
        if (m.realm !== undefined && (m.realm < 0 || m.realm > 8)) errs.push(`${mw}：realm 要在 0 到 8 之间`);
        if (m.wound && !WOUNDS.includes(m.wound)) errs.push(`${mw}：伤势「${m.wound}」不存在`);
      });
      const ps = k.performs || [];
      if (ps.length && !outer) errs.push(`${w}：只有拳脚、兵刃可以有绝招（performs）`);
      if (ps.length > 3) errs.push(`${w}：绝招最多 3 个`);
      ps.forEach(p => {
        const pw = `${w} 的绝招「${p.name}」`;
        const cap = ACTIVE_MAX[k.grade], loosen = 1 + 0.08 * (p.realm ?? 0);
        if (!len(p.name, 2, 8) || !len(p.text, 8, 80)) errs.push(`${pw}：招名要 2 到 8 个字，描写要 8 到 80 个字`);
        if (p.realm !== undefined && (p.realm < 0 || p.realm > 8)) errs.push(`${pw}：realm 要在 0 到 8 之间`);
        if (p.mp < 20 || p.mp > 150) errs.push(`${pw}：耗内力要在 20 到 150 之间`);
        if (p.cd < 1 || p.cd > 5) errs.push(`${pw}：调息合数要在 1 到 5 之间`);
        if (![0, 1, 2, 3].includes(p.hits)) errs.push(`${pw}：连击数只能是 0 到 3`);
        if (p.hits === 0 && !p.fx?.length) errs.push(`${pw}：连击数为 0 的绝招必须带效果`);
        if (p.acc < 0.5 || p.acc > 0.9) errs.push(`${pw}：命中率要在 0.5 到 0.9 之间`);
        if (p.hits > 0 && (p.dmg[0] < 10 || p.dmg[0] > p.dmg[1] || p.dmg[1] > 400)) errs.push(`${pw}：伤害区间要满足 10 ≤ 下限 ≤ 上限 ≤ 400`);
        if ((p.fx?.length ?? 0) > FX_PER_PERFORM[k.grade]) errs.push(`${pw}：${k.grade}的绝招最多带 ${FX_PER_PERFORM[k.grade]} 种效果`);
        const lock = Math.max(0, ...(p.fx || []).filter(f => f.kind === 'busy' || f.kind === 'disarm').map(f => f.rounds ?? 1));
        if (lock && p.cd <= lock) errs.push(`${pw}：点穴、缴械 ${lock} 合，调息至少要 ${lock + 1} 合，不然能把对手一直定住`);
        checkFx(p.fx, pw, errs);
        const budget = performBudget(p);
        if (budget > cap.expected * loosen) errs.push(`${pw}：预算 ${Math.round(budget)} 超过${k.grade}上限 ${Math.round(cap.expected * loosen)}（期望伤害 ${Math.round(performExpected(p))} + 效果当量）`);
        if (performEfficiency(p) > cap.efficiency * loosen) errs.push(`${pw}：太划算了，预算 ÷（耗内力 + 20 × 调息）超过${k.grade}上限 ${(cap.efficiency * loosen).toFixed(2)}`);
      });
      if ((k.passive?.length ?? 0) > 2) errs.push(`${w}：被动效果最多 2 种`);
      checkFx(k.passive, `${w} 的被动`, errs, true);
      if (passiveCost(k.passive) > PASSIVE_MAX[k.grade]) errs.push(`${w}：被动效果当量 ${passiveCost(k.passive)} 超过${k.grade}上限 ${PASSIVE_MAX[k.grade]}`);
      if (k.category === '绝技' && !k.ult) errs.push(`${w}：绝技必须写 ult`);
      if (k.category !== '绝技' && k.ult) errs.push(`${w}：只有绝技可以写 ult`);
      if (k.ult) {
        const u = k.ult;
        if (!len(u.title, 2, 12) || !len(u.text, 10, 100)) errs.push(`${w}：杀招题字要 2 到 12 个字，演出文字要 10 到 100 个字`);
        if (u.dmg[0] < 0 || u.dmg[0] > u.dmg[1]) errs.push(`${w}：杀招伤害要满足 0 ≤ 下限 ≤ 上限`);
        if ((u.fx?.length ?? 0) > FX_PER_PERFORM[k.grade]) errs.push(`${w}：杀招最多带 ${FX_PER_PERFORM[k.grade]} 种效果`);
        checkFx(u.fx, `${w} 的杀招`, errs);
        if (ultBudget(u) > ULT_MAX[k.grade]) errs.push(`${w}：杀招预算 ${Math.round(ultBudget(u))} 超过${k.grade}上限 ${ULT_MAX[k.grade]}`);
      }
      if ((k.combos?.length ?? 0) > 3) errs.push(`${w}：合璧最多 3 种`);
      for (const c of k.combos || []) {
        const cw = `${w} 的合璧「${c.name}」`;
        const school = c.with.startsWith('门派:') ? c.with.slice(3) : null;
        if (school ? !SCHOOLS.includes(school) : !ids.has(c.with)) errs.push(`${cw}：with「${c.with}」既不是已有武功，也不是「门派:XX」`);
        if (!len(c.name, 2, 8) || !len(c.text, 8, 80)) errs.push(`${cw}：名字要 2 到 8 个字，描写要 8 到 80 个字`);
        if (c.bonus < 1 || c.bonus > 8) errs.push(`${cw}：bonus 要在 1 到 8 之间`);
        checkFx(c.fx, cw, errs, true);
      }
    }
    report(errs);
  });

  it('平衡：绝招效率落在品级的目标区间，境界越高的绝招越强', () => {
    const errs: string[] = [];
    for (const k of SKILLS) {
      const ps = [...(k.performs || [])].sort((a, b) => (a.realm ?? 0) - (b.realm ?? 0));
      ps.forEach(p => {
        const pw = `武功 ${k.id} 的绝招「${p.name}」`;
        const [lo, hi] = EFFICIENCY_BAND[k.grade].map(x => x * loosen(p.realm)) as [number, number];
        const eff = performEfficiency(p);
        if (eff < lo - 1e-9 || eff > hi + 1e-9) errs.push(`${pw}：效率 ${eff.toFixed(2)} 不在${k.grade}${p.realm ? `（${p.realm} 重，已放宽）` : ''}的目标区间 ${lo.toFixed(2)}～${hi.toFixed(2)}。调伤害、耗内力或调息，见 docs/wuxue.md 第五节`);
        const lower = ps.filter(q => (q.realm ?? 0) < (p.realm ?? 0));
        const need = Math.max(0, ...lower.map(performBudget)) * REALM_STEP;
        if (lower.length && performBudget(p) < need - 1e-9) errs.push(`${pw}：要练到 ${p.realm} 重才能用，预算 ${Math.round(performBudget(p))} 却不到低境界绝招的 ${REALM_STEP} 倍（${Math.round(need)}）。练得越深，绝招必须越强`);
      });
    }
    report(errs);
  });

  it('武功文字里的占位符只能用 {foe} {part}', () => {
    const bad = [...JSON.stringify(SKILLS).matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(x => x !== 'foe' && x !== 'part');
    expect([...new Set(bad)], '武功文字里只能用 {foe} 和 {part}').toEqual([]);
  });
});

describe('文字', () => {
  const all = JSON.stringify({ ROOMS, NPCS, QUESTS, STORIES, FOES, ITEMS, NEWS });
  const allWithSkills = JSON.stringify({ ROOMS, NPCS, QUESTS, STORIES, FOES, ITEMS, SKILLS, NEWS });

  it('出场人物不用金庸、古龙书中人物的名字', () => {
    const hits = [...NPCS, ...FOES].filter(x => FORBIDDEN_NAMES.some(n => x.name.includes(n))).map(x => `${x.id}（${x.name}）`);
    expect(hits, `这些人物用了书中人物的名字：${hits.join('、')}。武功、门派、典故可以用，书中人物不作为 NPC 出场（见 tests/forbidden-names.ts）`).toEqual([]);
  });

  it('占位符只能用 {given} {name} {story} {news}', () => {
    const bad = [...all.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(k => !PLACEHOLDERS.has(k));
    expect([...new Set(bad)], '未知占位符').toEqual([]);
  });

  it('对白用「」，不用英文引号', () => {
    const texts: string[] = [];
    JSON.parse(allWithSkills, (_k, v) => { if (typeof v === 'string') texts.push(v); return v; });
    const bad = texts.filter(t => /["']/.test(t) || /[“”‘’]/.test(t));
    expect(bad, '请把引号换成「」或『』').toEqual([]);
  });
});

describe('内容包只是数据', () => {
  // 内容包能自动合并，所以只许引用数据格式，不许引用引擎、界面或改全局状态
  const sources = import.meta.glob<string>('../src/content/packs/*.ts', { query: '?raw', import: 'default', eager: true });
  it('只从 ../types 引用类型', () => {
    const errs: string[] = [];
    for (const [path, src] of Object.entries(sources)) {
      const file = path.split('/').pop();
      for (const m of src.matchAll(/^\s*(import|export)\b[^;]*?from\s*['"]([^'"]+)['"]/gm)) {
        if (m[2] !== '../types' || !/^\s*import\s+type\b/.test(m[0])) errs.push(`${file}：${m[0].trim().slice(0, 60)}（只能写 import type … from '../types'）`);
      }
      if (/\bimport\s*\(|\brequire\s*\(/.test(src)) errs.push(`${file}：不能动态引用模块`);
    }
    report(errs);
  });
});

describe('文风与剧透', () => {
  const packs = import.meta.glob<{ default: ContentPack }>('../src/content/packs/*.ts', { eager: true });
  const textsOf = (x: unknown): string[] => {
    const out: string[] = [];
    JSON.parse(JSON.stringify(x), (_k, v) => { if (typeof v === 'string' && /[\u4e00-\u9fff]/.test(v)) out.push(v); return v; });
    return out;
  };
  const byPack = Object.entries(packs).map(([path, m]) => ({ file: path.split('/').pop()!.replace(/\.ts$/, ''), texts: textsOf(m.default) }));

  it('不出现现代词汇', () => {
    const errs: string[] = [];
    for (const { file, texts } of byPack) for (const t of texts) {
      const hit = MODERN_WORDS.find(r => r.test(t));
      if (hit) errs.push(`${file}.ts：「${t.slice(0, 30)}」里有现代词汇（${hit.source}）`);
    }
    report(errs);
  });

  it('叙述文字里的数字写成中文（+80、×2、气血 260 这类数值说明除外）', () => {
    const errs: string[] = [];
    for (const { file, texts } of byPack) for (const t of texts) {
      if (/[0-9０-９]/.test(t.replace(/([+＋\-−×]|气血|内力|银两|熟练度?)\s?[0-9]+/g, ''))) errs.push(`${file}.ts：「${t.slice(0, 30)}」里的数字请写成中文`);
    }
    report(errs);
  });

  it('不提前剧透主线真相', () => {
    const errs: string[] = [];
    for (const { file, texts } of byPack) {
      if (SPOILER_ALLOWED_PACKS.includes(file)) continue;
      for (const t of texts) for (const w of SPOILER_WORDS) if (t.includes(w)) errs.push(`${file}.ts：「${t.slice(0, 30)}」提到了「${w}」，这是后面章回才揭开的事（见 docs/story.md 第二节）`);
    }
    report(errs);
  });

  it('传闻不超过规定字数', () => {
    const long = NEWS.filter(n => n.text.length > NEWS_MAX_LEN).map(n => `${n.text.slice(0, 20)}…（${n.text.length} 字）`);
    expect(long, `传闻最多 ${NEWS_MAX_LEN} 字`).toEqual([]);
  });
});


describe('约', () => {
  // 放在最后：前面的检查把所有效果、条件都过了一遍，这里对账
  it('定下的约，都有地方赴（条件 yue）、有地方了结（yueDone）；读约的条件，都有人定过这个约', () => {
    const errs: string[] = [];
    for (const id of yueSet) {
      if (!yueRead.has(id)) errs.push(`约「${id}」：没有任何地方用条件 { yue: '${id}' } 让玩家赴约`);
      if (!yueDone.has(id)) errs.push(`约「${id}」：没有任何地方用 yueDone 了结它，守约的人也会被算成失约`);
    }
    for (const id of yueRead) if (!yueSet.has(id)) errs.push(`条件 { yue: '${id}' }：没有任何地方定过这个约`);
    report(errs);
  });
});

describe('差事', () => {
  // 放在约的后面：前面的检查把所有效果都过了一遍，这里对账
  it('身份、档次、期限有效；交差的人在交差的地方；有人发、有人收', () => {
    const errs: string[] = [];
    for (const j of JOBS) {
      const w = `差事 ${j.id}`;
      if (!SHENFEN[j.shenfen]) errs.push(`${w}：身份「${j.shenfen}」不存在（见 engine/shenfen.ts）`);
      if (!(Number.isInteger(j.tier) && j.tier >= 0 && j.tier <= 5)) errs.push(`${w}：tier（档次）要是 0 到 5 的整数`);
      if (!(Number.isInteger(j.days) && j.days >= 1)) errs.push(`${w}：days 要是一以上的整数`);
      if (j.again !== undefined && !(Number.isInteger(j.again) && j.again >= 1)) errs.push(`${w}：again 要是一以上的整数`);
      if (j.k !== undefined && !(j.k >= 0.5 && j.k <= 2)) errs.push(`${w}：k（报酬倍数）要在 0.5 到 2 之间`);
      if (!j.title) errs.push(`${w}：要写 title（差事簿上的一行）`);
      const r = ROOMS.find(x => x.id === j.at), n = NPCS.find(x => x.id === j.npc);
      if (!r) errs.push(`${w}：交差的地点「${j.at}」不存在`);
      if (!n) errs.push(`${w}：交差的人「${j.npc}」不存在`);
      else if (r && ![n.at ?? []].flat().some(a => a.room === j.at) && ![...r.npcs, ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === j.npc)) errs.push(`${w}：交差的人「${j.npc}」不在「${j.at}」`);
      if (!jobTaken.has(j.id)) errs.push(`${w}：没有任何地方用 { type: 'job' } 发这件差事`);
      if (!jobDoneSet.has(j.id)) errs.push(`${w}：没有任何地方用 { type: 'jobDone' } 交差，办完了也领不到钱`);
    }
    report(errs);
  });
});

describe('后果看得见', () => {
  /**
   * 写下的旗标，一定要有地方读：一条后续路遇、一句传闻、人物的一句话、一个选项的条件……
   * 只写不读，玩家做了选择却看不到任何不同（负责人试玩「放还是杀」时说的：「没有看到结局有什么区别」）。
   * 下面是改版时就有的欠账，接上后续以后从这里删掉；新写的旗标不许进这张单子。
   */
  const DEBT: string[] = [];
  it('写下的旗标都有地方读', () => {
    const all = JSON.stringify({ ROOMS, NPCS, QUESTS, STORIES, FOES, ITEMS, NEWS, SKILLS, ENCOUNTERS, EYES, SHI });
    const set = new Set([...all.matchAll(/"type":"flag","flag":"([^"]+)"/g)].map(m => m[1]));
    const read = new Set([...all.matchAll(/(?<!"type":"flag",)"(?:flag|notFlag)":"([^"]+)"/g)].map(m => m[1]));
    const unread = [...set].filter(f => !read.has(f));
    const errs = unread.filter(f => !DEBT.includes(f)).map(f => `旗标「${f}」：写了却没有任何地方读。给它接一条后续（路遇、传闻、人物的话），玩家才看得到这个选择的后果`);
    for (const f of DEBT) if (!unread.includes(f)) errs.push(`旗标「${f}」：已经有地方读了（或者不再写了），请从本测试的欠账单里删掉`);
    report(errs);
  });
});
