/**
 * 讲理三处（10-10 老玩家试玩：不讲理、白跑、重复）：
 * 1 点破所引的线索，必须是玩家先「观察」得到过的（点破分支里要的旗标，要有观察动作写过它）
 * 2 打听没有新料时，不同的人在同一天不照抄同一句兜底话
 * 3 所有「去」的入口，点之前看得到「约几刻 · 费用 X 文」；钱不够的，写明原因
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { EYES, NPCS } from '../src/content';
import type { Cond, Effect } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { cn } from '../src/core/util';
import { ask } from '../src/engine/chuanwen';
import { test } from '../src/engine/dsl';
import { tripCost } from '../src/engine/world';
import { mapSheet, tripNeedsAsk, tripNote } from '../src/ui/views/ditu';

const T0 = 1791300000000;
beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

const flagsIn = (c: Cond | undefined): string[] =>
  !c ? [] : [...(c.flag ? [c.flag] : []), ...(c.any ?? []).flatMap(flagsIn)];
const flagsSet = (es: Effect[] | undefined): string[] => (es ?? []).flatMap(e => (e.type === 'flag' ? [e.flag] : []));

describe('点破只引见过的线索', () => {
  it('点破分支要的线索旗标，必须有观察动作（人物的观察，或根基之眼）写过它', () => {
    const seen = new Set<string>();
    for (const n of NPCS) for (const b of n.actions['观察'] ?? []) flagsSet(b.do).forEach(f => seen.add(f));
    for (const e of EYES) flagsSet(e.do).forEach(f => seen.add(f));
    const bad: string[] = [];
    for (const n of NPCS) {
      const bs = n.actions['点破'];
      if (!bs) continue;
      const needs = bs.flatMap(b => flagsIn(b.if));
      if (!needs.length && bs.some(b => b.do?.length)) bad.push(`${n.id}：点破的成功分支没有要求任何线索旗标`);
      for (const f of needs) if (!seen.has(f)) bad.push(`${n.id}：点破要的线索 ${f} 没有观察动作写过`);
    }
    expect(bad).toEqual([]);
  });

  it('小栓的舅舅：没细看过他，点破不引麻屑', () => {
    const n = NPCS.find(x => x.id === 'xsb_jiuju')!;
    const br = n.actions['点破']!;
    const open = br.find(b => test(b.if))!;
    expect(open.text).not.toContain('麻屑');
    expect(br[0].if?.flag).toBe('xsb_xr_maxie');
  });
});

describe('打听的兜底不在人与人之间重复', () => {
  it('带伤时，同一天不同的人第二回打听，不说同一句', () => {
    S.wounds.hand = 3;
    S.askLog = {};
    const ids = NPCS.filter(x => !x.life).slice(0, 8).map(x => x.id);
    const second: string[] = [];
    for (const id of ids) {
      ask(id);
      const r = ask(id);
      if (r.src === 'react') second.push(r.text.slice(r.text.indexOf('，') + 1));
    }
    expect(second.length).toBeGreaterThanOrEqual(2);
    expect(second.filter(t => t.includes('你这脸色不对')).length, '关心话一天只对一个人说').toBeLessThanOrEqual(1);
    expect(new Set(second.map(t => t.replace(/^.*?(?=[你摇摆合低冷耸只板笑把])/, ''))).size, '兜底句各不相同').toBeGreaterThanOrEqual(2);
  });
});

describe('去的入口先报路费', () => {
  it('费用大于身上银两：入口写明原因，地图卡写「船钱要 X 文，你只有 Y 文，到了怕回不来」', () => {
    S.loc = 'hu';
    const c = tripCost('gz_kechuan')!;
    expect(c.fee).toBeGreaterThan(0);
    S.silver = c.fee - 1;
    expect(tripNeedsAsk('gz_kechuan')).toBe(true);
    const note = tripNote('gz_kechuan');
    expect(note).toContain('费用');
    expect(note).toContain('不够');
    const sheet = mapSheet('gz_kechuan');
    expect(sheet).toContain(`船钱要 ${cn(c.fee)} 文`);
    expect(sheet).toContain(`你只有 ${cn(S.silver)} 文`);
    expect(sheet).toContain('怕回不来');
  });

  it('钱够：只写「约几刻 · 费用 X 文」，不写不够', () => {
    S.loc = 'hu';
    S.silver = 100000;
    expect(tripNote('gz_kechuan')).toMatch(/^约.+ · 费用 .+ 文$/);
    expect(mapSheet('gz_kechuan')).not.toContain('怕回不来');
  });
});
