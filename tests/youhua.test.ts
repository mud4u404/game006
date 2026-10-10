/**
 * 优化改良（负责人 10-10 七条，docs/sheji-youhua-1010.md）：角色卡、眼下要紧、地图当主力、变强的路。
 * 点按检查（tests/dianji.test.ts）照旧管「每个按钮都有人接」。
 */
const RAW = import.meta.glob<string>(['./fixtures/v5-midgame.json', '../src/ui/shell.ts'], { query: '?raw', import: 'default', eager: true });
import { beforeEach, describe, expect, it } from 'vitest';
import { QUESTS, ROOMS } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { leadsNear } from '../src/engine/daohang';
import { setNowMs } from '../src/core/time';
import { arrivalHot, jueseKa, markArrival, markVisit, powerNow, targetAt, retreatLabel, strongPaths, trackPower, yaoJin } from '../src/engine/jiemian';
import { viewJianghu } from '../src/ui/views/jianghu';
import { mapSheet, tripNeedsAsk, viewDitu } from '../src/ui/views/ditu';
import { npcName, roomNpcs, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';
import { viewWugong } from '../src/ui/views/wugong';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

/** 动宾句：以动词起头 */
const DONGBIN = /^(去|寻|找|办|打开|等|会|拜|赴|看)/;

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
  it('永远只有一件，写成动宾句；往下的「也可以」最多一条', () => {
    const html = viewJianghu();
    expect(html.split('眼下要紧').length - 1).toBe(1);
    const y = yaoJin();
    expect(y.text, y.text).toMatch(DONGBIN);
    expect(y.also.length).toBeLessThanOrEqual(1);
  });

  it('每件心事的每一步，都只出一件动宾句', () => {
    const bad: string[] = [];
    for (const q of QUESTS) {
      for (let i = 0; i < q.stages.length; i++) {
        S.quests = { [q.id]: i };
        S.track = q.id;
        const y = yaoJin();
        if (!DONGBIN.test(y.text) || y.also.length > 1) bad.push(`${q.id}#${i}：${y.text}`);
        expect(viewJianghu().split('眼下要紧').length - 1, `${q.id}#${i}`).toBe(1);
      }
    }
    expect(bad).toEqual([]);
  });

  it('没有记挂的事：给近处的差事，没有就给一件具体能做的事（去看榜），不写成「打开地图」', () => {
    S.track = '';
    const y = yaoJin();
    expect(y.text).toMatch(DONGBIN);
    expect(y.tag).not.toBe('主线');
    expect(y.text).not.toContain('地图');
    expect(y.tab).not.toBe('ditu');
  });

  it('到了主线要找的人那里：人高亮，不再弹「就在此处」', () => {
    S.quests = { main1: 0 };
    S.track = 'main1';
    const y = yaoJin();
    if (y.to) S.loc = y.to;
    const here = yaoJin();
    if (here.hot) expect(viewJianghu()).toContain('avab hot');
  });

  it('主界面指向地图的入口一个都没有：去处整节去掉，只剩底栏的「地图」页签（#617）', () => {
    for (const track of ['', 'main1', 'prologue']) {
      S.track = track;
      const html = viewJianghu();
      expect(html).not.toContain('data-act="tab:ditu"');
      expect(html).not.toContain('打开地图');
      expect(html).not.toContain('<h2>去处</h2>');
      expect(html).not.toContain('class="goline"');
    }
    // 底栏的页签还在
    expect(RAW['../src/ui/shell.ts']).toMatch(/\['ditu', '地图'\]/);
  });

  it('眼下要紧没有可做的事时，也不再指向地图', () => {
    S.track = '';
    S.job = null;
    for (const loc of ROOMS.slice(0, 40).map(r => r.id)) {
      S.loc = loc;
      const y = yaoJin();
      expect(y.tab, loc).not.toBe('ditu');
      expect(y.text, loc).not.toContain('地图');
    }
  });
});

describe('到地即办（10-10 试玩第一、二条）', () => {
  it('「也可以」是真 button，带「前往」字样，最多一条', () => {
    S.track = '';
    const html = viewJianghu();
    const also = html.match(/<button class="lead"[^>]*>/g) ?? [];
    expect(also.length).toBe(1);
    expect(html).toMatch(/<button class="lead" data-act="travel:[^"]+"><span class="lg">前往<\/span>/);
  });

  it('去一处之前就问好要找谁：差事派活的人、他的动作；到了以后高亮，做别的就不亮', () => {
    const l = leadsNear(8).find(x => x.who);
    expect(l, '开局近处至少有一件带派活人的差事').toBeTruthy();
    const t = targetAt(l!.to);
    expect(t?.npc).toBe(l!.who);
    expect(t?.verb).toBe(l!.verb);
    S.loc = l!.to;
    markArrival(t!);
    expect(arrivalHot()?.npc).toBe(t!.npc);
    expect(viewJianghu()).toContain('avab hot');
    markArrival(null);
    expect(arrivalHot()).toBeUndefined();
  });

  it('没选过人，要找的人就在此处：先选他，人和动作排在场景白描前面', () => {
    const l = leadsNear(8).find(x => x.who)!;
    S.loc = l.to; S.sel = null;
    markArrival({ npc: l.who!, verb: l.verb });
    const html = viewJianghu();
    expect(S.sel).toBe(l.who);
    expect(html.indexOf('class="card here-card"')).toBeLessThan(html.indexOf('class="card scene"'));
  });

  it('场景白描：第一次进整段，第二次起折成两行，点开再展开', () => {
    S.ui = {};
    markVisit();
    expect(viewJianghu()).not.toContain('desc fold');
    S.ui = { ...S.ui, at: 'elsewhere' };
    markVisit();
    expect(S.ui?.visits?.[S.loc]).toBe(2);
    const html = viewJianghu();
    expect(html).toContain('desc fold');
    expect(html).toContain('data-act="descToggle"');
  });

  it('府衙照壁看过悬赏：榜文旁有「去书办那里揭」，一步到书办的「揭」', () => {
    S.loc = 'yz_zhaobi'; S.min = 10 * 60; S.sel = 'fuya_gaoshi';
    expect(viewJianghu()).not.toContain('去书办那里揭');
    S.reply = { id: 'fuya_gaoshi', text: '悬赏那一栏……', at: 0 };
    expect(viewJianghu()).toContain('data-act="jumpTo:xsb_zhuren:揭"');
  });

  it('角色卡评语压成一行', () => {
    expect(viewJianghu()).toMatch(/<p class="jy" title="[^"]*">/);
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

  it('卡片上「去」在最上面，点了直接赶路，不再有第二道确认；要船钱的路才在卡上写明', () => {
    const to = ROOMS.find(r => r.id !== S.loc && r.region === ROOMS.find(x => x.id === S.loc)!.region)!;
    const html = mapSheet(to.id);
    expect(html.indexOf('travelGo:')).toBeGreaterThan(-1);
    expect(html.indexOf('travelGo:')).toBeLessThan(html.indexOf('class="news mbrief"'));
    expect(html).toContain('class="btn go"');
    // 赶路只在要船钱时才先弹卡（ui/explore.ts 的 goOrAsk）：不花钱的路，点地名弹卡、点「去」就走
    expect(tripNeedsAsk(to.id)).toBe(false);
    expect(html).not.toContain('确认');
  });

  it('卡片上列这处的人和能做的事；你在这处时，动作是真按钮，点了就办', () => {
    const rid = ROOMS.find(r => r.id !== S.loc && roomNpcs(r.id).length)!.id;
    const far = mapSheet(rid);
    for (const id of roomNpcs(rid)) expect(far).toContain(npcName(id));
    expect(far).not.toContain('data-act="sheetDo:');
    // 就在此处
    const here = roomNpcs(S.loc).filter(x => verbsOf(npc(x)!).length);
    expect(here.length).toBeGreaterThan(0);
    const html = mapSheet(S.loc);
    for (const id of here) {
      expect(html).toContain(npcName(id));
      expect(html).toContain(`data-act="sheetDo:${id}:${verbsOf(npc(id)!)[0]}"`);
    }
  });

  it('地图页顶上有「眼下要紧」，点了跳到目标那一处', () => {
    S.track = 'main1';
    const y = yaoJin();
    const html = viewDitu();
    expect(html).toContain('眼下要紧');
    if (y.to && y.to !== S.loc) expect(html).toContain(`data-act="mapJump:${y.to}"`);
    else if (y.here) expect(html).toContain('就在此处');
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

  it('闭关按钮上写预估：正文说长进，熟练、战力的数放小字', () => {
    S.lilian = 300;
    const t = retreatLabel(1, '一日');
    expect(t).toMatch(/^闭关一日，(约有长进|一时不见长进)<small>（.+熟练 \+\d+，(战力 \+\d+|战力暂不涨：.+)）<\/small>$/);
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
