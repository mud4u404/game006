import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { room } from '../src/content';
import type { Cond, RoomDef, ShiDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { dayNo } from '../src/core/time';
import { shiRumor, spreadDay } from '../src/engine/chuanwen';
import { questNav, whoNav } from '../src/engine/daohang';
import { test } from '../src/engine/dsl';
import { JAIL } from '../src/engine/shijie';
import { hoursAt, presentAt, roomNpcs, roomObjs, whereAt } from '../src/engine/world';
import { questbookSheetHtml } from '../src/ui/views/questbook';

const original = new Map<RoomDef, RoomDef['npcs']>();
function schedule(id: string, at: string, cond: Cond): void {
  const r = room(at);
  if (!original.has(r)) original.set(r, r.npcs);
  r.npcs = [...r.npcs.filter(x => (typeof x === 'string' ? x : x.id) !== id), { id, if: cond }];
}

beforeEach(() => {
  setState(skipToYangzhou());
  S.min = 22 * 60;
});
afterEach(() => {
  for (const [r, list] of original) r.npcs = list;
  original.clear();
});

describe('指定钟点的作息查询', () => {
  it('白天、夜里和物件名单共用查询；查完全部状态保持原样', () => {
    const before = structuredClone(S);
    Object.freeze(S);
    expect(whereAt('huagu', 8 * 60)).toBe('hu');
    expect(roomNpcs('hu', 8 * 60)).toContain('huagu');
    expect(whereAt('huagu', 20 * 60)).toBeNull();
    expect(roomNpcs('hu', 20 * 60)).not.toContain('huagu');
    expect(whereAt('bei', 23 * 60)).toBe('hu');
    expect(roomObjs('hu', 23 * 60)).toContain('bei');
    expect(whereAt('没有这个人', 8 * 60)).toBeNull();
    expect(S).toEqual(before);
  });

  it('嵌套 any、跨午夜、旗标和世界条件使用同一查询视图', () => {
    schedule('liu', 'hu', { any: [{ any: [{ flag: 'test_schedule', hour: { from: 23, to: 2 }, w: { p: { id: 'huagu', st: ['ok'] } } }] }] });
    expect(presentAt('liu', 'hu', 23 * 60)).toBe(false);
    S.flags.test_schedule = true;
    expect(presentAt('liu', 'hu', 23 * 60)).toBe(true);
    expect(presentAt('liu', 'hu', 60)).toBe(true);
    expect(presentAt('liu', 'hu', 2 * 60)).toBe(false);
    S.w.ppl.huagu = { st: 'gone' };
    expect(presentAt('liu', 'hu', 60)).toBe(false);
    expect(S.min).toBe(22 * 60);
  });

  it('条件解释器的非时辰条件也读传入状态，递归条件不回读全局', () => {
    const view = structuredClone(S);
    view.min = 60;
    view.flags.view_only = true;
    view.silver = 500;
    view.w.ppl.huagu = { st: 'gone' };
    const c: Cond = { silver: 500, any: [{ flag: 'view_only', hour: { from: 23, to: 2 }, w: { p: { id: 'huagu', st: ['gone'] } } }] };
    expect(test(c, view)).toBe(true);
    expect(test(c)).toBe(false);
    expect(S.w.ppl.huagu).toBeUndefined();
  });

  it('夜间收摊、守夜、物件和赴约仍照旧处理', () => {
    expect(whereAt('liu', 10 * 60)).toBe('hu');
    expect(whereAt('liu', 22 * 60)).toBeNull();
    expect(whereAt('liaochen', 22 * 60)).toBe('daming');
    expect(whereAt('bei', 22 * 60)).toBe('hu');
    S.yue.push({ id: 'test_yue', npc: 'liu', at: 'hu', due: dayNo(S), text: '在湖畔相见。' });
    expect(whereAt('liu', 22 * 60)).toBe('hu');
  });

  it('事件把人放到常住地之外；指定时段与到期日均生效', () => {
    const today = dayNo(S);
    S.w.ppl.huagu = { at: { room: 'daming', slot: 'night', until: today + 1 } };
    expect(whereAt('huagu', 8 * 60)).toBe('hu');
    expect(whereAt('huagu', 22 * 60)).toBe('daming');
    expect(roomNpcs('hu', 22 * 60)).not.toContain('huagu');
    expect(roomNpcs('daming', 22 * 60)).toContain('huagu');
    expect(whoNav('huagu').now).toBe('daming');
    S.w.ppl.huagu.at!.until = today;
    expect(whereAt('huagu', 22 * 60)).toBeNull();
  });

  it.each(['hurt', 'gone', 'dead'] as const)('%s 的人不出现在作息中，临时调度仍按原优先级覆盖处境', st => {
    S.w.ppl.huagu = { st };
    expect(whereAt('huagu', 8 * 60)).toBeNull();
    S.w.ppl.huagu.at = { room: 'daming', until: dayNo(S) + 1 };
    expect(whereAt('huagu', 8 * 60)).toBe('daming');
  });

  it('坐牢只在牢中，处境到期后回到作息', () => {
    S.w.ppl.huagu = { st: 'jailed', until: dayNo(S) + 1 };
    expect(whereAt('huagu', 8 * 60)).toBe(JAIL);
    expect(roomNpcs(JAIL, 8 * 60)).toContain('huagu');
    expect(roomNpcs('hu', 8 * 60)).not.toContain('huagu');
    S.w.ppl.huagu.until = dayNo(S);
    expect(whereAt('huagu', 8 * 60)).toBe('hu');
  });

  it('暂离截止到指定分钟；世界调度也不能绕过暂离', () => {
    S.away = { huagu: dayNo(S) * 1440 + 10 * 60 };
    expect(whereAt('huagu', 9 * 60)).toBeNull();
    expect(whereAt('huagu', 10 * 60)).toBe('hu');
    S.w.ppl.huagu = { at: { room: 'daming', until: dayNo(S) + 1 } };
    expect(roomNpcs('daming', 9 * 60)).not.toContain('huagu');
    expect(whereAt('huagu', 10 * 60)).toBe('daming');
  });

  it('见闻簿的两整点采样保留子时前半段，不改变查询时钟', () => {
    schedule('liu', 'hu', { hour: { from: 23, to: 0 } });
    Object.freeze(S);
    expect(hoursAt('liu', 'hu')).toBeNull();
    expect(hoursAt('liu', 'hu', true)).toBe('子时');
    expect(S.min).toBe(22 * 60);
  });

  it('缺世界的旧状态查询不补写世界，导航和见闻簿不写任何状态', () => {
    delete (S as Partial<typeof S>).w;
    const before = structuredClone(S);
    Object.freeze(S);
    expect(whereAt('huagu', 8 * 60)).toBe('hu');
    roomNpcs('hu', 8 * 60);
    roomObjs('hu', 8 * 60);
    whoNav('huagu');
    expect(S).toEqual(before);
    expect(S).not.toHaveProperty('w');
    // 完整状态下的导航和见闻簿同样只读，包括有内容的主线。
    setState(skipToYangzhou());
    S.quests.main1 = 1;
    S.min = 22 * 60;
    const complete = structuredClone(S);
    Object.freeze(S);
    expect(questNav('main1')?.why).toContain('卯时到戌时');
    questbookSheetHtml();
    expect(S).toEqual(complete);
  });

  it('传闻目击者和每日传播不写全局时钟', () => {
    // 只有白天在场，当前时钟在夜里，仍应收到发生在瘦西湖的消息。
    Object.defineProperty(S, 'min', { writable: false });
    const def: ShiDef = {
      id: 'test_zuoxi_rumor', name: '试传闻', region: 'yz', place: 'hu', first: 'start',
      steps: { start: { now: '湖畔有了动静。', news: '湖畔有了动静。' } }
    };
    const rid = shiRumor(def, 'start', dayNo(S) * 1440, false)!;
    expect(S.w.ppl.huagu?.know?.some(k => k[0] === rid)).toBe(true);
    spreadDay(S.w, dayNo(S));
    expect(S.min).toBe(22 * 60);
  });
});

it('导航、传闻和见闻簿不再临时写全局时钟', async () => {
  const fs: { readFileSync(path: URL, encoding: 'utf8'): string } = await import(/* @vite-ignore */ 'node:' + 'fs');
  for (const path of ['src/engine/daohang.ts', 'src/engine/chuanwen.ts', 'src/ui/views/questbook.ts']) {
    const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    expect(source, path).not.toMatch(/S\s*\.\s*min\s*(?:=(?!=)|\+=|-=|\+\+|--)/);
  }
});
