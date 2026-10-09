import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { jobById } from '../src/content';
import type { JobDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { act, roomNpcs } from '../src/engine/world';
import { questbookSheetHtml } from '../src/ui/views/questbook';

const job = jobById('xsb_xunren')!;
const originalXian = job.xian;
const lines = (): string[] => [...questbookSheetHtml().matchAll(/<div class="qb-row qb-xian">([\s\S]*?)<\/div>\s*<\/div>/g)].map(m => m[1]);

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.loc = 'yz_zhaobi';
  S.min = 10 * 60;
});
afterEach(() => { job.xian = originalXian; setNowMs(() => Date.now()); });

describe('差事的线头', () => {
  it('揭寻人榜后，记下掌柜、真实地名与作息；没问过的人不提前露出', () => {
    const reply = act('xsb_zhuren', '揭寻人');
    expect(reply.text).toContain('东圈门');
    expect(reply.text).not.toContain('东关布庄');
    expect(S.job?.id).toBe(job.id);
    const [line] = lines();
    expect(lines()).toHaveLength(1);
    expect(line).toContain('布庄掌柜');
    expect(line).toContain('布庄掌柜卯时到戌时在东圈门');
    expect(line).toContain('data-act="jgo:yz_dongquan"');
    expect(line).not.toContain('小栓的舅舅');
    expect(line).not.toContain('枫桥码头');
  });

  it('问过掌柜以后换成舅舅，白天提醒亥时到子时再来，仍能导航', () => {
    act('xsb_zhuren', '揭寻人');
    S.loc = 'yz_dongquan';
    expect(act('xsb_shifu', '交谈').text).toContain('望江楼');
    const [line] = lines();
    expect(lines()).toHaveLength(1);
    expect(line).not.toContain('布庄掌柜');
    expect(line).toContain('小栓的舅舅亥时到子时在望江楼');
    expect(line).toContain('等到那时再去找他');
    expect(line).toContain('data-act="jgo:cheng_tavern"');
    expect(line).not.toContain(' disabled');
    expect(line).not.toContain('枫桥码头');
  });

  it('舅舅在子时前半段仍在场，不误报要等；在目的地时按钮不再赶路', () => {
    act('xsb_zhuren', '揭寻人');
    S.flags.xsb_xr_clue1 = true;
    S.loc = 'cheng_tavern';
    S.min = 23 * 60 + 30;
    expect(roomNpcs(S.loc)).toContain('xsb_jiuju');
    const [line] = lines();
    expect(line).toContain('亥时到子时');
    expect(line).not.toContain('等到那时');
    expect(line).toContain(' disabled');
    expect(line).toContain('就在此处');
  });

  it('点破舅舅后才显示小栓在枫桥码头，保留人物真实作息', () => {
    act('xsb_zhuren', '揭寻人');
    act('xsb_shifu', '交谈');
    S.attr.悟性 = 25;
    S.loc = 'cheng_tavern';
    S.min = 22 * 60;
    expect(act('xsb_jiuju', '点破').text).toContain('枫桥码头');
    const [line] = lines();
    expect(lines()).toHaveLength(1);
    expect(line).toContain('小栓卯时到未时在枫桥码头');
    expect(line).toContain('data-act="jgo:sz_matou"');
    expect(line).not.toContain('小栓的舅舅');
  });

  it('所有线头的 if 都不成立时不显示，交差的去处仍保留', () => {
    act('xsb_zhuren', '揭寻人');
    S.flags.xsb_xr_clue1 = S.flags.xsb_xr_clue2 = S.flags.xsb_xr_found = true;
    expect(lines()).toEqual([]);
    expect(questbookSheetHtml()).toContain('data-act="jgo:yz_zhaobi"');
  });

  it('交完差以后不再显示线头', () => {
    act('xsb_zhuren', '揭寻人');
    S.flags.xsb_xr_found = true;
    act('xsb_zhuren', '交寻人');
    expect(S.job).toBeNull();
    expect(lines()).toEqual([]);
  });

  it('未接差事和没有 xian 的旧差事照常显示，不凭空添线头', () => {
    expect(lines()).toEqual([]);
    act('xsb_zhuren', '揭寻物');
    expect(questbookSheetHtml()).toContain('帮绣娘阿蕙追回被偷的玉佩');
    expect(lines()).toEqual([]);
  });

  it('多个成立的线头按内容顺序列出，不带 if 的也显示，未成立的隐藏', () => {
    job.xian = [
      { npc: 'xsb_shifu', text: '先问掌柜。' },
      { npc: 'xsb_jiuju', at: 'cheng_tavern', text: '再问舅舅。' },
      { npc: 'xsb_xiaoshuan', at: 'sz_matou', if: { flag: 'xsb_xr_clue2' }, text: '最后找小栓。' }
    ] satisfies JobDef['xian'];
    run([{ type: 'job', id: job.id }]);
    const found = lines();
    expect(found).toHaveLength(2);
    expect(found[0]).toContain('先问掌柜');
    expect(found[1]).toContain('再问舅舅');
    expect(found[1]).toContain('眼下不见小栓的舅舅的人影');
    expect(found[1]).toContain('望江楼');
  });

  it('看见闻簿不会改变时间、旗标、差事或存档状态，不挂状态签、不报数', () => {
    act('xsb_zhuren', '揭寻人');
    S.flags.xsb_xr_clue1 = true;
    const before = JSON.stringify(S);
    const [line] = lines();
    expect(line).not.toMatch(/能做|卡住|要等|[✓✗]|第[一二三四]步|xsb_xr_clue/);
    expect(JSON.stringify(S)).toBe(before);
  });
});
