import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { jobById } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { JOB_END_MAX, jobEndText } from '../src/engine/shenfen';
import { checkYue } from '../src/engine/shiguang';
import { act } from '../src/engine/world';
import { questbookSheetHtml } from '../src/ui/views/questbook';

const job = jobById('xsb_xunren')!;
const originalEnd = job.end;

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.loc = 'yz_zhaobi';
  S.min = 10 * 60;
});
afterEach(() => { job.end = originalEnd; setNowMs(() => Date.now()); });

describe('差事有收场（#631）', () => {
  it('小栓寻人误期：见闻簿「了结的事」有一条，写明几日后能重接，冷却照 jobLog', () => {
    act('xsb_zhuren', '揭寻人');
    expect(S.job?.id).toBe(job.id);
    advanceDays(S, 4);
    checkYue(S);
    expect(S.job).toBeNull();
    expect(S.jobEnd).toEqual([{ id: job.id, how: '误期', day: expect.any(Number) }]);
    const html = questbookSheetHtml();
    expect(html).toContain('了结的事 · 1');
    expect(html).toContain(job.title);
    expect(html).toContain('误期');
    expect(html).toContain(`${job.again ?? 3}日后能重接`);
  });

  it('打输办砸与误期分开记；放弃差事也有一条，带冷却', () => {
    run([{ type: 'job', id: job.id }, { type: 'jobFail', id: job.id }]);
    expect(S.jobEnd!.at(-1)!.how).toBe('办砸');
    advanceDays(S, 5);
    run([{ type: 'job', id: job.id }, { type: 'jobQuit', id: job.id }]);
    expect(S.jobEnd!.at(-1)!.how).toBe('放弃');
    expect(S.job).toBeNull();
    const html = questbookSheetHtml();
    expect(html).toContain('了结的事 · 2');
    expect(html).toContain('放弃');
    expect(html).toContain('日后能重接');
  });

  it('办成也记一条；没填收场文字用通用说法，填了用差事自己的', () => {
    run([{ type: 'job', id: job.id }, { type: 'jobDone', id: job.id }]);
    expect(S.jobEnd!.at(-1)!.how).toBe('办成');
    expect(jobEndText(S, { id: job.id, how: '办成' })).toContain('办成了');
    job.end = { 办成: '小栓回了布庄，掌柜赏了你一碗面。' };
    expect(jobEndText(S, { id: job.id, how: '办成' })).toBe('小栓回了布庄，掌柜赏了你一碗面。');
  });

  it('身份对不上了，写「再也接不得」', () => {
    run([{ type: 'job', id: job.id }, { type: 'jobFail', id: job.id }]);
    S.shenfen = { id: 'yumin', standing: 1, since: 1 };
    expect(jobEndText(S, { id: job.id, how: '办砸' })).toContain('再也接不得');
  });

  it('只留最近二十条；旧档没有这个字段也能读', () => {
    for (let i = 0; i < JOB_END_MAX + 5; i++) { run([{ type: 'job', id: job.id }, { type: 'jobQuit', id: job.id }]); advanceDays(S, 4); }
    expect(S.jobEnd).toHaveLength(JOB_END_MAX);
    delete S.jobEnd;
    expect(() => questbookSheetHtml()).not.toThrow();
  });
});
