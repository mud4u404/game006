/**
 * S3 反馈说真话（docs/gugan.md 第四节）：掂斤两按实力、突破合成一张卡、闭关邸报先写突破、界面写的和实际一致。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { FOES, NPCS } from '../src/content';
import { act, verbsOf } from '../src/engine/world';
import { kanren, kanrenHurt } from '../src/engine/zhaoshi';
import { gainProf, learnSkill } from '../src/engine/growth';
import { jingxiu } from '../src/engine/shiguang';
import { tierCheck, tupoClear, tupoPending, tupoTake } from '../src/engine/tupo';
import { tupoBlockHTML, tupoCardHTML } from '../src/ui/tupo';
// 界面模块加载时要往 document 上挂监听：测试里换个空壳，只测它拼出来的文字
vi.stubGlobal('document', { addEventListener: () => {}, hidden: false, querySelector: () => null });
const { chuguanHTML } = await import('../src/ui/chuguan');

beforeEach(() => {
  setState(skipToYangzhou());
  tupoClear();
});

describe('掂斤两按实力，不按此刻气血', () => {
  const foe = FOES.find(f => f.id === 'liu')!;
  it('满血和带伤，对同一个对手的结论一致，带伤只多一句', () => {
    S.hp = S.hpMax; S.mp = S.mpMax;
    const full = kanren(S, foe);
    expect(full.hurt).toBe('');
    S.hp = Math.round(S.hpMax * 0.2);
    S.wounds = { hand: 2, foot: 1, inner: 2 };
    const hurt = kanren(S, foe);
    expect(hurt.say).toBe(full.say);
    expect(hurt.p).toBe(full.p);
    expect(hurt.hurt).toBe('你眼下带着伤，真动起手来，要吃些亏。');
  });
  it('开打前给落伤封顶用的那一份仍按此刻的状态：带伤时赢面不高于满状态', () => {
    S.hp = S.hpMax; S.mp = S.mpMax;
    const full = kanren(S, foe, 40, true).p;
    S.hp = Math.round(S.hpMax * 0.2);
    S.wounds = { hand: 2, foot: 2, inner: 2 };
    expect(kanren(S, foe, 40, true).p).toBeLessThanOrEqual(full);
    expect(kanren(S, foe, 40, true).p).toBeLessThan(kanren(S, foe).p);
  });
  it('只是气血掉了一两成不算带伤；伤了手足就算', () => {
    S.hp = S.hpMax;
    expect(kanrenHurt(S)).toBe('');
    S.hp = Math.round(S.hpMax * 0.95);
    expect(kanrenHurt(S)).toBe('');
    S.hp = S.hpMax;
    S.wounds.foot = 1;
    expect(kanrenHurt(S)).not.toBe('');
  });
});

describe('突破合成一张卡', () => {
  it('一次结算里碰到的突破，合成一份；取走以后就空了', () => {
    S.skills.hanjiang = { r: 0, p: 99999 };
    gainProf('hanjiang', 1);
    expect(tupoPending()).toBe(true);
    const items = tupoTake();
    expect(items.some(x => x.kind === 'zhong')).toBe(true);
    expect(tupoPending()).toBe(false);
    expect(tupoTake()).toEqual([]);
  });
  it('习得新武功也进卡', () => {
    const id = Object.keys(S.skills)[0];
    delete S.skills[id];
    const names = learnSkill(id, 0, 0, 0);
    expect(names.length).toBe(1);
    const items = tupoTake();
    expect(items).toEqual([{ kind: 'xue', text: names[0] }]);
  });
  it('升档：记一条见闻、进卡；同一档不重复提', () => {
    S.tierTop = -1;
    tierCheck();
    const items = tupoTake();
    expect(items.map(x => x.kind)).toEqual(['dang']);
    tierCheck();
    expect(tupoPending()).toBe(false);
  });
  it('卡的文字：每件一行，带标签，一个「知道了」按钮关得掉（点遮罩也能关，见 shell.openSheet 的 dismiss）', () => {
    const html = tupoCardHTML([{ kind: 'dang', text: '功夫入了「三流」这一档' }, { kind: 'zhong', text: '「寒江剑法」突破至「略有小成」' }, { kind: 'xue', text: '习得「踏雪寻梅」' }]);
    expect(html).toContain('突破');
    expect(html.indexOf('升档')).toBeLessThan(html.indexOf('升重'));
    expect(html.indexOf('升重')).toBeLessThan(html.indexOf('新学'));
    expect(html).toContain('data-act="sheetClose"');
    expect(tupoBlockHTML([])).toBe('');
  });
});

describe('闭关邸报：突破在最上面', () => {
  it('一次闭关里升重加学会，邸报的第一块是突破，其次才是消化历练的数', () => {
    S.lilian = 5000;
    S.skills.hanjiang = { r: 0, p: 190 };
    const gone = Object.keys(S.skills).find(k => k !== 'hanjiang')!;
    delete S.skills[gone];
    const rep = jingxiu(S, 7, () => 1, 7);
    // 闭关出来碰上了一门新学的武功
    learnSkill(gone, 0, 0, 0);
    expect(rep.breaks.length).toBeGreaterThan(0);
    const html = chuguanHTML(rep, '闭关七日。', '闭关七日');
    const at = (s: string): number => html.indexOf(s);
    expect(at('tupo-blk')).toBeGreaterThan(-1);
    expect(at('tupo-blk')).toBeLessThan(at('消化历练'));
    expect(at('tupo-blk')).toBeLessThan(at('class="story"'));
    expect(html).toContain('升重');
    expect(html).toContain('新学');
    // 一份邸报取走了，不会再另弹一张卡
    expect(tupoPending()).toBe(false);
    // 突破只写在最上面那一块，不再混在下面的小标签里
    expect(html.split('突破至').length - 1).toBe(rep.breaks.length);
  });
  it('没有突破就不出这一块', () => {
    const rep = jingxiu(S, 1, () => 1, 0);
    expect(chuguanHTML(rep, '闭关一日。', '闭关一日')).not.toContain('tupo-blk');
  });
});

describe('界面写的和实际一致', () => {
  it('勒索水鬼：写「留下一文」「铜钱放在你掌心」，银两真的 +1，恶名 +5', () => {
    S.flags.cw_zhenxiang = true;
    const s0 = S.silver, e0 = S.eming ?? 0;
    const r = act('cw_shuigui', '勒索');
    expect(r.text).toContain('一文');
    expect(S.silver).toBe(s0 + 1);
    expect(S.eming ?? 0).toBe(e0 + 5);
  });
  it('撬锁：身契的事没起头、或已了结时，契匣不摆这个按钮', () => {
    const n = NPCS.find(x => x.id === 'yh_qixia')!;
    expect(verbsOf(n)).not.toContain('撬锁');
    S.flags.huafang_taken = true;
    expect(verbsOf(n)).toContain('撬锁');
    S.flags.yh_freed = true;
    expect(verbsOf(n)).not.toContain('撬锁');
  });
  it('撬锁：按钮摆出来的时候，点了有实效（夜里得手拿到身契，失手记恶名，白天有话说）', () => {
    const n = NPCS.find(x => x.id === 'yh_qixia')!;
    const bs = n.actions['撬锁']!;
    expect(bs.filter(b => (b.do ?? []).some(e => e.type === 'item' || e.type === 'eming')).length).toBe(2);
  });
  it('白爷不再邀人「来一手」：桌上没有能押的玩法，话里就不留这个钩子', () => {
    const baiye = NPCS.find(x => x.id === 'ssgz_baiye')!;
    for (const b of baiye.actions['交谈']!) expect(b.text ?? '').not.toContain('来一手');
  });
});
