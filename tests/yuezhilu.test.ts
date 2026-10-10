/**
 * 有约按步骤指路（负责人 #601：「有约不能只显示交任务的地点，应该是按照步骤每一步地点都提示」）。
 * 心事走到中间一步、差事办到中间一线头，横幅、眼下要紧、地图、地点说明说的都是这一步，不是最后交差的地方。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { QUESTS, room } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { questNav, yueNow } from '../src/engine/daohang';
import { run } from '../src/engine/dsl';
import { busyRooms, roomBrief, yaoJin } from '../src/engine/jiemian';
import { npcName } from '../src/engine/world';
import { viewDitu } from '../src/ui/views/ditu';
import { questbookSheetHtml } from '../src/ui/views/questbook';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

/** 倒数第二步（交差那一步）的地点 */
const finalOf = (id: string): string => QUESTS.find(q => q.id === id)!.stages.slice(-2)[0].to!;

describe('指路按步骤走，不直指交差处', () => {
  it('缉拿草上飞走到「追查行踪」：心事、眼下要紧、地图都指这一步，不指府衙', () => {
    S.quests.side_caoshangfei = 1;
    S.flags.csf_clue2 = true;
    S.min = 20 * 60;
    S.loc = 'yz_zhaobi';
    S.track = 'side_caoshangfei';
    const n = questNav('side_caoshangfei')!;
    expect(n.stage).toBe(1);
    expect(n.to).not.toBe(finalOf('side_caoshangfei'));
    expect(yaoJin().to).toBe(n.to);
    expect(roomBrief(n.to!).things.join()).toContain('记挂着的事');
    expect(roomBrief('yz_fuya').things.join()).not.toContain('记挂着的事');
    expect(viewDitu()).toContain(`<small>记挂的事</small><b>${n.toName}</b>`);
  });

  it('主线、序章走到中间一步：指的都是这一步的地点', () => {
    S.quests.main1 = 1;
    expect(questNav('main1')!.to).toBe('dukou');
    expect(questNav('main1')!.to).not.toBe(finalOf('main1'));
    S.quests.prologue = 1;
    expect(questNav('prologue')!.to).toBe('gz_town');
  });

  it('揭了榜的差事：有约指现在这一步要找的人，线头办完才指交差处', () => {
    run([{ type: 'job', id: 'xsb_xiong' }]);
    const y = S.yue.find(x => x.id === 'job_xsb_xiong')!;
    S.loc = 'yz_dongquan';
    S.track = '';
    expect(yueNow(y)).toMatchObject({ step: true, to: 'yz_zhaobi' });
    S.flags.xsb_xiong_clue = true;
    const two = yueNow(y);
    expect(two).toMatchObject({ step: true, to: 'cheng', toName: room('cheng').name });
    expect(two.text).toContain(npcName('xsb_zhao'));
    expect(two.text).not.toContain('交差');
    // 眼下要紧、地图标记、地点说明、见闻簿说的是同一处
    expect(yaoJin()).toMatchObject({ tag: '差事', to: 'cheng' });
    expect(busyRooms().has('cheng')).toBe(true);
    expect(roomBrief('cheng').things.join()).toContain('有约');
    expect(roomBrief('yz_zhaobi').things.join()).not.toContain('有约');
    expect(viewDitu()).toContain(`<small>有约</small><b>${room('cheng').name}</b>`);
    expect(questbookSheetHtml()).toContain('data-act="jgo:cheng"');
    // 人拿下了，线头办完：才指交差处
    S.flags.xsb_xiong_beat = true;
    expect(yueNow(y)).toMatchObject({ step: false, to: 'yz_zhaobi' });
  });

  it('新手主线指到打不过的屠千山：眼下要紧不是去送死，主线放第二行，地图芯片同步', () => {
    S.quests.main1 = 1;
    S.track = 'main1';
    S.loc = 'daming';
    const far = yaoJin();
    expect(far.tag).toBe('先变强');
    expect(far.why).toContain('先变强');
    expect(far.text).not.toContain('屠千山');
    expect(far.also[0]).toMatchObject({ to: 'dukou' });
    expect(far.also[0].text).toContain('屠千山');
    expect(viewDitu()).not.toContain('<small>记挂的事</small>');
    expect(roomBrief('dukou').things.join()).toContain('先变强');
    // 人就在眼前：明说他不理你，不写「就在此处」
    S.loc = 'dukou';
    const here = yaoJin();
    expect(here.here).toBe(false);
    expect(here.why).toContain('他不理你');
  });

  it('主线在前时，揭了榜的差事当前一步排在「也可以」第一条；见闻簿只留一个「去」', () => {
    S.quests.main1 = 0;
    S.track = 'main1';
    run([{ type: 'job', id: 'xsb_xiong' }]);
    S.flags.xsb_xiong_clue = true;
    S.loc = 'yz_dongquan';
    const yj = yaoJin();
    expect(yj.tag).toBe('主线');
    expect(yj.also[0]).toMatchObject({ to: 'cheng' });
    expect(yj.also[0].text).toContain('缉拿命案凶手郝屠户');
    expect([...questbookSheetHtml().matchAll(/data-act="jgo:/g)]).toHaveLength(1);
    // 线头办完：见闻簿的「去」仍只有一个，指交差处
    S.flags.xsb_xiong_beat = true;
    expect(yaoJin().also[0].to).toBe('yz_zhaobi');
    expect([...questbookSheetHtml().matchAll(/data-act="jgo:yz_zhaobi/g)]).toHaveLength(1);
    expect([...questbookSheetHtml().matchAll(/data-act="jgo:/g)]).toHaveLength(1);
  });
});
