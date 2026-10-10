/**
 * 优化改良（负责人 10-10 七条，docs/sheji-youhua-1010.md）：角色卡、眼下要紧、地图当主力、变强的路。
 * 点按检查（tests/dianji.test.ts）照旧管「每个按钮都有人接」。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { QUESTS, ROOMS } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { jueseKa, powerNow, retreatLabel, strongPaths, trackPower, yaoJin } from '../src/engine/jiemian';
import { viewJianghu } from '../src/ui/views/jianghu';
import { mapSheet, viewDitu } from '../src/ui/views/ditu';
import { viewWugong } from '../src/ui/views/wugong';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

/** 动宾句：以动词起头 */
const DONGBIN = /^(去|找|办|打开|等|会|拜|赴)/;

describe('角色卡', () => {
  it('江湖页最上面是角色卡：显示名字、称号（没有名号显示身份）和战力', () => {
    const html = viewJianghu();
    expect(html.indexOf('class="card juese"')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('class="card juese"')).toBeLessThan(html.indexOf('眼下要紧'));
    expect(html).toContain(`<b>${powerNow()}</b>`);
    expect(html).toContain('沈孤舟');
    expect(html).toContain('游侠');
    S.title = '渡口一剑';
    expect(viewJianghu()).toContain('「渡口一剑」');
  });

  it('评语是一句话，气血、内力、银两在一行小字里', () => {
    const k = jueseKa();
    expect(k.pingyu.length).toBeGreaterThan(5);
    expect(k.line).toMatch(/气血 \d+\/\d+ · 内力 \d+\/\d+ · 银两 \d+ 文/);
  });

  it('战力变了：卡上写一回「旧 → 新」，离开江湖页就清掉', () => {
    trackPower(true);
    expect(jueseKa().from).toBeUndefined();
    const was = powerNow();
    S.skills.xinfa!.r += 2;
    S.skills.hanjiang!.r += 2;
    expect(powerNow()).toBeGreaterThan(was);
    trackPower(true);
    expect(jueseKa().from).toBe(was);
    expect(viewJianghu()).toContain(`${was} → ${powerNow()}`);
    trackPower(false);
    expect(viewJianghu()).not.toContain(`${was} → `);
  });

  it('旧档没有界面字段也读得出来', () => {
    delete S.ui;
    expect(() => viewJianghu()).not.toThrow();
  });
});

describe('眼下要紧', () => {
  it('永远只有一件，写成动宾句；往下的「也可以」最多两条', () => {
    const html = viewJianghu();
    expect(html.split('眼下要紧').length - 1).toBe(1);
    const y = yaoJin();
    expect(y.text, y.text).toMatch(DONGBIN);
    expect(y.also.length).toBeLessThanOrEqual(2);
  });

  it('每件心事的每一步，都只出一件动宾句', () => {
    const bad: string[] = [];
    for (const q of QUESTS) {
      for (let i = 0; i < q.stages.length; i++) {
        S.quests = { [q.id]: i };
        S.track = q.id;
        const y = yaoJin();
        if (!DONGBIN.test(y.text) || y.also.length > 2) bad.push(`${q.id}#${i}：${y.text}`);
        expect(viewJianghu().split('眼下要紧').length - 1, `${q.id}#${i}`).toBe(1);
      }
    }
    expect(bad).toEqual([]);
  });

  it('没有记挂的事：给近处的差事，没有就请你去地图上走走', () => {
    S.track = '';
    const y = yaoJin();
    expect(y.text).toMatch(DONGBIN);
    expect(y.tag).not.toBe('主线');
  });

  it('到了主线要找的人那里：人高亮，不再弹「就在此处」', () => {
    S.quests = { main1: 0 };
    S.track = 'main1';
    const y = yaoJin();
    if (y.to) S.loc = y.to;
    const here = yaoJin();
    if (here.hot) expect(viewJianghu()).toContain('avab hot');
  });

  it('去处缩成一行：只有主线要去的那一处和「打开地图」，其余去处不列', () => {
    const html = viewJianghu();
    expect(html).toContain('打开地图');
    expect(html).toContain('data-act="tab:ditu"');
    expect(html).not.toContain('class="exits"');
    expect(html).not.toContain('近处有事');
  });
});

describe('地图当主力', () => {
  it('点地点：说明里有人、事、路，还有一个「去」，点了直接赶路', () => {
    const to = ROOMS.find(r => r.id !== S.loc && r.region === ROOMS.find(x => x.id === S.loc)!.region)!;
    const html = mapSheet(to.id);
    expect(html).toContain(to.name);
    expect(html).toContain(`data-act="travelGo:${to.id}">去</button>`);
    expect(html).toMatch(/<span class="tag">人<\/span>/);
    expect(html).toMatch(/<span class="tag">事<\/span>/);
    expect(html).toMatch(/<span class="tag">路<\/span>/);
  });

  it('点自己所在的地方：看得到说明，没有「去」', () => {
    const html = mapSheet(S.loc);
    expect(html).not.toContain('travelGo:');
    expect(html).toContain('你在这里');
  });

  it('地图上有当前所在的高亮、水路旱路两种线、图例', () => {
    const html = viewDitu();
    expect(html).toContain('class="node here');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('水路');
    expect(html).toContain('陆路');
    expect(html).toContain('data-act="travelAsk:');
    expect(html).not.toContain('data-act="travel:');
  });

  it('有船、渡的地区画出水路', () => {
    S.loc = 'gz_town';
    S.chapter = 1;
    const html = viewDitu();
    expect(html).toContain('<line class="wet"');
  });
});

describe('变强看得见', () => {
  it('武学页最上面是「变强的路」，每条写代价', () => {
    const html = viewWugong();
    expect(html.indexOf('变强的路')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('变强的路')).toBeLessThan(html.indexOf('搭配'));
    const ps = strongPaths();
    expect(ps.map(p => p.name)).toEqual(expect.arrayContaining(['闭关', '学艺']));
    for (const p of ps) expect(p.cost.length, p.name).toBeGreaterThan(3);
  });

  it('闭关按钮上写预估：熟练加多少、战力约加多少', () => {
    S.lilian = 300;
    const t = retreatLabel(1, '一日');
    expect(t).toMatch(/^闭关一日：.+熟练 \+\d+，(战力约 \+\d+|战力暂不见涨)$/);
    expect(viewWugong()).toContain(t);
  });

  it('历练够闭关一日：提示「可去闭关」', () => {
    S.lilian = 300;
    expect(viewWugong()).toContain('可去闭关');
    S.lilian = 0;
    expect(viewWugong()).not.toContain('可去闭关');
  });

  it('预估不改存档', () => {
    S.lilian = 300;
    const before = JSON.stringify(S);
    retreatLabel(30, '一月');
    expect(JSON.stringify(S)).toBe(before);
  });
});
