/**
 * 变强的路说话算数（10-10 老玩家试玩）：推荐的切磋点了真会打、闭关预估等于实际、出关写旧 → 新、
 * 灰着的招式写原因、武功页首屏收拢、角色卡有进度一行、功力一种说法。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { NPCS, ROOMS } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { jueseKa, retreatPreview, sparTarget, sparWilling, strongPaths } from '../src/engine/jiemian';
import { gongliText, jinduLine } from '../src/engine/ren';
import { jingxiu, profChip, restDays, skillName } from '../src/engine/shiguang';
import { act } from '../src/engine/world';

import { viewWugong } from '../src/ui/views/wugong';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

describe('推荐的切磋真能打', () => {
  it('推荐的对象，点切磋一定进得了战斗；写的不是「肯指点」', () => {
    let seen = 0;
    for (const hour of [8, 14, 22]) {
      for (const loc of ROOMS.map(r => r.id)) {
        setState(skipToYangzhou());
        S.loc = loc;
        S.min = hour * 60;
        const sp = sparTarget();
        const row = strongPaths().find(p => p.name === '切磋');
        expect(row?.say ?? '', loc).not.toContain('肯指点');
        if (!sp) continue;
        seen++;
        expect(sparWilling(sp.id), sp.id).toBe(true);
        expect(act(sp.id, '切磋').out.fight, `${sp.id}@${loc}/${hour}`).toBeTruthy();
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('漕帮的佩刀汉子（成群、今天没空陪你玩）不会被推荐', () => {
    for (const n of NPCS.filter(x => x.id === 'caobang')) expect(sparWilling(n.id)).toBe(false);
  });
});

describe('闭关预估等于实际', () => {
  const cases: [string, () => void][] = [
    ['露宿', () => { S.zhu = 'lusu'; }],
    ['客栈钱够', () => { S.zhu = 'inn'; S.silver = 5000; }],
    ['客栈钱不够', () => { S.zhu = 'inn'; S.silver = 40; }],
    ['心魔', () => { S.zhu = 'lusu'; S.xinmo = { n: 2, why: '试' }; }]
  ];
  for (const [name, setup] of cases) {
    for (const days of [1, 7, 30]) {
      it(`${name} ${days} 日：预估的熟练进账 = 出关结算`, () => {
        setup();
        S.lilian = 400;
        const pv = retreatPreview(days);
        const r = restDays(S, days);
        const rep = jingxiu(S, r.days, () => 1, r.grow);
        expect(pv.used).toBe(rep.used);
        expect(pv.gain?.[1]).toBe(rep.gains[0]?.[1]);
        expect(pv.gain?.[0]).toBe(rep.gains[0] ? skillName(rep.gains[0][0]) : undefined);
      });
    }
  }
});

describe('出关写旧 → 新', () => {
  it('每门长进的武功写「名 旧 → 新 / 本重所需」', () => {
    S.lilian = 400;
    const r = restDays(S, 1);
    const rep = jingxiu(S, r.days, () => 1, r.grow);
    expect(rep.gains.length).toBeGreaterThan(0);
    for (const g of rep.gains) expect(profChip(rep, g)).toMatch(/^\S+ (\S+ )?\d+ → (\S+ )?\d+ \/ \d+$/);
  });
});

describe('武功页首屏', () => {
  it('说明收进 details，首屏没有文字墙；学艺有去处', () => {
    const html = viewWugong();
    const d = html.indexOf('<details');
    expect(d).toBeGreaterThan(0);
    for (const k of ['<ul class="muted resp-help">', '品级', '闭关的规矩', '住处：']) expect(html.indexOf(k), k).toBeGreaterThan(d);
    expect(strongPaths().find(p => p.name === '学艺')?.go?.act).toBeTruthy();
    expect(html.slice(0, d)).not.toContain('resp-help');
  });

  it('没练到的招式写「火候未到」与要练到的境界', () => {
    expect(viewWugong()).toContain('火候未到');
  });
});

describe('角色卡与功力', () => {
  it('角色卡有离下一档的进度一行，评语按实际火候说', () => {
    const k = jueseKa();
    expect(k.jindu).toMatch(/^距.+：.+第.+重 → 第.+重，已 \d+ \/ \d+$/);
    expect(k.pingyu).not.toContain('样样粗浅');
    const was = jinduLine(S);
    Object.values(S.skills)[0]!.p += 50;
    expect(jinduLine(S)).not.toBe(was);
  });

  it('功力只有一种说法：年和月', () => {
    expect(gongliText(3)).toBe('三年');
    expect(gongliText(1.5)).toBe('一年六月');
    expect(gongliText(0.02)).toBe('不满一月');
    expect(gongliText(0.5)).toBe('六月');
  });
});
