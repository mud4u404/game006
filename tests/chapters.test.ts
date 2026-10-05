/**
 * 章节数据校验：地图、单位、事件与对话引用必须全部有效
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/data/chapters';
import { CLASSES } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import { NPCS } from '@/data/npcs';
import { portraitLook } from '@/data/portraits';
import { TERRAIN } from '@/data/terrain';
import { TERRAIN_CHARS } from '@/render/contracts';
import type { BattleAction, ChapterDef, StoryLine, UnitPlacement } from '@/data/types';

const EMOTIONS = ['normal', 'smile', 'angry', 'sad', 'surprised', 'determined', 'hurt', 'thinking'];

function allLines(c: ChapterDef): StoryLine[] {
  const out: StoryLine[] = [];
  for (const s of [...c.intro, ...c.outro]) out.push(...s.lines);
  for (const e of c.events) for (const a of e.do) if (a.do === 'say') out.push(...a.lines);
  for (const v of c.villages ?? []) out.push(...v.lines);
  return out;
}

function spawned(c: ChapterDef): UnitPlacement[] {
  const out: UnitPlacement[] = [];
  for (const e of c.events) for (const a of e.do) if (a.do === 'spawn') out.push(...a.units);
  return out;
}

function moveTypeOf(p: UnitPlacement) {
  const cls = p.character ? CHARACTERS[p.character]?.classId : p.classId;
  return CLASSES[cls ?? 'soldier'].moveType;
}

describe('章节数据', () => {
  it('章节序号连续', () => {
    CHAPTERS.forEach((c, i) => expect(c.index, c.id).toBe(i));
  });

  for (const c of CHAPTERS) {
    describe(`${c.id} ${c.title}`, () => {
      const rows = c.map.rows;
      const W = rows[0].length;
      const H = rows.length;
      const tile = (x: number, y: number) => TERRAIN_CHARS[rows[y][x]];

      it('地图为矩形且字符合法', () => {
        for (const [i, r] of rows.entries()) {
          expect(r.length, `第 ${i} 行长度`).toBe(W);
          for (const ch of r) expect(TERRAIN_CHARS[ch], `非法字符 ${ch}`).toBeDefined();
        }
      });

      it('单位位置合法、引用有效', () => {
        const seen = new Set<string>();
        const ids = new Set<string>();
        for (const p of [...c.units]) {
          expect(ids.has(p.id), `重复 id ${p.id}`).toBe(false);
          ids.add(p.id);
          expect(p.x >= 0 && p.x < W && p.y >= 0 && p.y < H, `${p.id} 越界`).toBe(true);
          const key = `${p.x},${p.y}`;
          expect(seen.has(key), `${p.id} 与其他单位重叠`).toBe(false);
          seen.add(key);
          const cost = TERRAIN[tile(p.x, p.y)].cost[moveTypeOf(p)];
          expect(cost, `${p.id} 站在不可通行的 ${tile(p.x, p.y)} 上`).not.toBeNull();
        }
        for (const p of [...c.units, ...spawned(c)]) {
          if (p.character) expect(CHARACTERS[p.character], p.character).toBeDefined();
          if (p.classId) expect(CLASSES[p.classId], p.classId).toBeDefined();
          if (!p.character && !p.classId) throw new Error(`${p.id} 缺少职业`);
          for (const it of [p.equipment?.weapon, p.equipment?.armor, p.equipment?.accessory, p.drop, ...(p.items ?? [])]) if (it) expect(ITEMS[it], it).toBeDefined();
          for (const sk of p.skills ?? []) expect(SKILLS[sk], sk).toBeDefined();
          if (p.portrait) expect(portraitLook(p.portrait), `头像 ${p.portrait}`).not.toBeNull();
          expect(p.x >= 0 && p.x < W && p.y >= 0 && p.y < H, `${p.id} 越界`).toBe(true);
        }
      });

      it('出击格可用', () => {
        const occupied = new Set(c.units.map((u) => `${u.x},${u.y}`));
        for (const [x, y] of c.deploy.slots) {
          expect(x >= 0 && x < W && y >= 0 && y < H).toBe(true);
          expect(TERRAIN[tile(x, y)].cost.foot, `出击格 ${x},${y}`).not.toBeNull();
          expect(occupied.has(`${x},${y}`), `出击格 ${x},${y} 已被占用`).toBe(false);
        }
        expect(c.deploy.slots.length).toBeGreaterThanOrEqual(c.deploy.max);
        for (const f of c.deploy.forced ?? []) expect(CHARACTERS[f]).toBeDefined();
      });

      it('事件与胜利条件引用的单位存在', () => {
        const known = new Set([...c.units, ...spawned(c)].map((u) => u.id));
        for (const id of Object.keys(CHARACTERS)) known.add(id);
        if (c.victory.type === 'boss') expect(known.has(c.victory.unit), c.victory.unit).toBe(true);
        if (c.victory.type === 'seize') expect(TERRAIN[tile(c.victory.x, c.victory.y)].cost.foot).not.toBeNull();
        for (const e of c.events) {
          const w = e.when;
          if (w.on === 'defeat' || w.on === 'hp') expect(known.has(w.unit), `${e.id}: ${w.unit}`).toBe(true);
          if (w.on === 'talk') {
            expect(known.has(w.a), `${e.id}: ${w.a}`).toBe(true);
            expect(known.has(w.b), `${e.id}: ${w.b}`).toBe(true);
          }
          for (const a of e.do as BattleAction[]) {
            if (a.do === 'join' || a.do === 'leave' || a.do === 'heal' || a.do === 'ai') expect(known.has(a.unit), `${e.id}: ${a.unit}`).toBe(true);
            if (a.do === 'item') expect(ITEMS[a.item], a.item).toBeDefined();
          }
        }
      });

      it('对话的说话者与表情有效', () => {
        for (const l of allLines(c)) {
          if ('cmd' in l) {
            if (l.cmd === 'spawn') {
              const look = l.actor.look;
              expect(CHARACTERS[look] || CLASSES[look] || NPCS[look], `演员外观 ${look}`).toBeTruthy();
            }
            continue;
          }
          if (l.s) expect(portraitLook(l.s), `说话者 ${l.s}`).not.toBeNull();
          if (l.e) expect(EMOTIONS).toContain(l.e);
        }
        for (const s of [...c.intro, ...c.outro]) for (const a of s.actors ?? []) expect(CHARACTERS[a.look] || CLASSES[a.look] || NPCS[a.look], `演员外观 ${a.look}`).toBeTruthy();
      });

      it('宝物、商店与奖励的道具存在', () => {
        for (const ch of [...(c.chests ?? []), ...(c.hidden ?? []), ...(c.villages ?? [])]) if (ch.item) expect(ITEMS[ch.item], ch.item).toBeDefined();
        for (const v of c.villages ?? []) expect(tile(v.x, v.y)).toBe('village');
        for (const it of [...c.shop, ...(c.reward.items ?? [])]) expect(ITEMS[it], it).toBeDefined();
        for (const j of [...(c.joins ?? []), ...(c.leaves ?? [])]) expect(CHARACTERS[j]).toBeDefined();
      });
    });
  }
});

describe('收集要素', () => {
  it('全篇恰好有 6 片龙鳞残片（真结局条件）', () => {
    let n = 0;
    for (const c of CHAPTERS) {
      for (const x of [...(c.chests ?? []), ...(c.hidden ?? []), ...(c.villages ?? [])]) if (x.item === 'dragon_scale') n++;
      for (const it of c.reward.items ?? []) if (it === 'dragon_scale') n++;
    }
    expect(n).toBe(6);
  });

  it('每个可加入的角色都有加入的途径', () => {
    const joinable = new Set<string>();
    for (const c of CHAPTERS) {
      for (const u of c.units) if (u.team === 'player' && u.character) joinable.add(u.character);
      for (const e of c.events) for (const a of e.do) if (a.do === 'join') joinable.add(a.unit);
      for (const id of [...(c.joins ?? []), ...(c.recruitAfter ?? [])]) joinable.add(id);
    }
    for (const id of Object.keys(CHARACTERS)) expect(joinable.has(id), id).toBe(true);
  });
});
