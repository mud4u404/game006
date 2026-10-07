/**
 * 内容数据校验。新增或修改 src/content 下的任何文件后都要通过：npm run validate
 * 报错信息会指出是哪个文件里的哪一条数据有问题。
 */
import { describe, expect, it } from 'vitest';
import { FOES, ITEMS, NPCS, QUESTS, REGIONS, ROOMS, SKILLS, STORIES, NEWS } from '../src/content';
import type { Branch, Cond, Effect } from '../src/content/types';
import { FORBIDDEN_NAMES } from './forbidden-names';

const roomIds = new Set(ROOMS.map(r => r.id));
const npcIds = new Set(NPCS.map(n => n.id));
const itemIds = new Set(ITEMS.map(i => i.id));
const skillIds = new Set(SKILLS.map(s => s.id));
const foeIds = new Set(FOES.map(f => f.id));
const storyIds = new Set(STORIES.map(s => s.id));
const quests = new Map(QUESTS.map(q => [q.id, q]));
const DEFAULT_VERBS = new Set(['观察', '赠礼', '请教', '切磋', '偷窃']);
const PLACEHOLDERS = new Set(['given', 'name', 'story', 'news']);

function checkCond(c: Cond | undefined, where: string, errs: string[]): void {
  if (!c) return;
  if (c.quest && !quests.has(c.quest.id)) errs.push(`${where}：条件里的任务「${c.quest.id}」不存在`);
  if (c.item && !itemIds.has(c.item.id)) errs.push(`${where}：条件里的物品「${c.item.id}」不存在`);
  if (c.noItem && !itemIds.has(c.noItem)) errs.push(`${where}：条件里的物品「${c.noItem}」不存在`);
  if (c.rel && !npcIds.has(c.rel.npc)) errs.push(`${where}：条件里的人物「${c.rel.npc}」不存在`);
  if (c.learned && !skillIds.has(c.learned)) errs.push(`${where}：条件里的武功「${c.learned}」不存在`);
  if (c.notLearned && !skillIds.has(c.notLearned)) errs.push(`${where}：条件里的武功「${c.notLearned}」不存在`);
  c.any?.forEach((x, i) => checkCond(x, `${where} any[${i}]`, errs));
}

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
      case 'rel': if (!npcIds.has(e.npc)) errs.push(`${w}：人物「${e.npc}」不存在`); break;
      case 'prof': case 'learn': if (!skillIds.has(e.skill)) errs.push(`${w}：武功「${e.skill}」不存在`); break;
      case 'move': if (!roomIds.has(e.to)) errs.push(`${w}：地点「${e.to}」不存在`); break;
      case 'fight': if (!foeIds.has(e.foe)) errs.push(`${w}：对手「${e.foe}」不存在`); break;
      case 'story': if (!storyIds.has(e.id)) errs.push(`${w}：剧情「${e.id}」不存在`); break;
      default: break;
    }
  }
}

function checkBranches(bs: Branch[] | undefined, where: string, errs: string[], needFallback: boolean): void {
  if (!bs) return;
  if (!bs.length) errs.push(`${where}：分支列表是空的`);
  bs.forEach((b, i) => { checkCond(b.if, `${where}[${i}]`, errs); checkEffects(b.do, `${where}[${i}]`, errs); });
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
      if (!n.at) continue;
      if (!roomIds.has(n.at.room)) errs.push(`人物 ${n.id}：at 指向不存在的地点「${n.at.room}」`);
      checkCond(n.at.if, `人物 ${n.id} 的 at`, errs);
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
      if (new Set(n.verbs).size !== n.verbs.length) errs.push(`${w}：verbs 里有重复的动作`);
      for (const v of n.verbs) {
        if (!DEFAULT_VERBS.has(v) && !n.actions[v]) errs.push(`${w}：动作「${v}」没有写 actions`);
      }
      for (const [v, bs] of Object.entries(n.actions)) {
        if (!n.verbs.includes(v as never)) errs.push(`${w}：actions 里的「${v}」没有列在 verbs 里，玩家点不到`);
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

describe('任务、剧情、对手', () => {
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
        c.choices.forEach((ch, k) => {
          const w = `剧情 ${s.id} 第 ${i} 张第 ${k} 个选项`;
          if (ch.next !== undefined && ch.next !== -1 && (ch.next < 0 || ch.next >= s.cards.length)) errs.push(`${w}：next 指向不存在的卡片`);
          checkEffects(ch.do, w, errs);
        });
      });
    }
    report(errs);
  });

  it('对手的数值和结算有效', () => {
    const errs: string[] = [];
    for (const f of FOES) {
      const w = `对手 ${f.id}`;
      if (!f.tells.length) errs.push(`${w}：至少要有一招重招（tells）`);
      for (const t of f.tells) {
        if (Object.values(t.pw).some(v => v < 0 || v > 100)) errs.push(`${w} 的「${t.name}」：力速巧隙要在 0 到 100 之间`);
      }
      if (f.atk[0] > f.atk[1]) errs.push(`${w}：atk 的下限大于上限`);
      if (!f.moves.length || !f.flourish.length || !f.opening.length || !f.asides.length) errs.push(`${w}：moves、flourish、opening、asides 都不能为空`);
      for (const [k, r] of Object.entries(f.results)) {
        if (!r) continue;
        if (!r.silent && (!r.tag || !r.title || !r.story || !r.button)) errs.push(`${w} 的结算 ${k}：非 silent 的结算需要 tag、title、story、button`);
        checkEffects(r.do, `${w} 的结算 ${k}`, errs);
        checkEffects(r.then, `${w} 的结算 ${k} 的 then`, errs);
      }
      if (!f.spar && !f.script && !f.results.lose) errs.push(`${w}：会输的战斗需要 lose 结算`);
    }
    report(errs);
  });

  it('传闻条件有效', () => {
    const errs: string[] = [];
    NEWS.forEach((n, i) => checkCond(n.if, `传闻 ${i}`, errs));
    report(errs);
  });
});

describe('文字', () => {
  const all = JSON.stringify({ ROOMS, NPCS, QUESTS, STORIES, FOES, ITEMS, SKILLS, NEWS });

  it('不使用金庸等作品的原创名字', () => {
    const hits = FORBIDDEN_NAMES.filter(n => all.includes(n));
    expect(hits, `出现了不能用的名字：${hits.join('、')}（见 tests/forbidden-names.ts）`).toEqual([]);
  });

  it('占位符只能用 {given} {name} {story} {news}', () => {
    const bad = [...all.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(k => !PLACEHOLDERS.has(k));
    expect([...new Set(bad)], '未知占位符').toEqual([]);
  });

  it('对白用「」，不用英文引号', () => {
    const texts: string[] = [];
    JSON.parse(all, (_k, v) => { if (typeof v === 'string') texts.push(v); return v; });
    const bad = texts.filter(t => /["']/.test(t) || /[“”‘’]/.test(t));
    expect(bad, '请把引号换成「」或『』').toEqual([]);
  });
});
