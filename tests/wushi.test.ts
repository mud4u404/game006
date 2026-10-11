import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportCode, exportCodeZ, leanState, importCodeAny, migrate } from '../src/core/save';
const RAW = import.meta.glob<string>(['./fixtures/v5-midgame.json', '../src/ui/shell.ts'], { query: '?raw', import: 'default', eager: true });
import { newGame, S, setState } from '../src/core/state';
import { addSilver, clearClicks, clickLabel, feedbackUrl, recentClicks, recordClick, setWushi, teleport, URL_MAX, verTap, wushiOn, type FeedbackInfo } from '../src/core/wushi';
import { wushiToolsHTML } from '../src/ui/views/wushi-tools';
import { ROOMS } from '../src/content';

const mem = new Map<string, string>();
const fake = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const g = globalThis as { localStorage?: unknown };
let old: unknown;
beforeEach(() => { old = g.localStorage; mem.clear(); g.localStorage = fake; clearClicks(); });
afterEach(() => { g.localStorage = old; });

const info = (): FeedbackInfo => ({ loc: 'x', locName: '某处', when: '景和元年三月五日 午时', clicks: ['a', 'b'], ver: '存档 v5', realm: '初出茅庐', hp: '50/50', silver: 3, main: '序章' });

describe('巫师模式', () => {
  it('关着：看不到巫师工具，点击不记；开了：看得到、点击会记', () => {
    setState(newGame());
    expect(wushiOn()).toBe(false);
    expect(wushiToolsHTML()).toBe('');
    recordClick('x');
    expect(recentClicks()).toEqual([]);
    setWushi(true);
    expect(wushiOn()).toBe(true);
    expect(wushiToolsHTML()).toContain('data-act="wsGo"');
    for (let i = 0; i < 13; i++) recordClick('c' + i);
    expect(recentClicks()).toEqual(Array.from({ length: 10 }, (_, i) => 'c' + (i + 3)));
    setWushi(false);
    expect(wushiOn()).toBe(false);
  });

  it('localStorage 不可用也不抛', () => {
    g.localStorage = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    expect(wushiOn()).toBe(false);
    expect(() => setWushi(true)).not.toThrow();
  });

  it('连点七下才开关，间隔太久不算', () => {
    let hit = false;
    for (let i = 0; i < 7; i++) hit = verTap(1000 + i * 100);
    expect(hit).toBe(true);
    for (let i = 0; i < 6; i++) expect(verTap(50000 + i * 100)).toBe(false);
    expect(verTap(60000)).toBe(false);
  });

  it('反馈链接能解析，带「反馈」标签，标题取前 20 字', () => {
    const text = '这是一段很长很长很长很长很长很长很长很长的反馈文字';
    const { url, withCode } = feedbackUrl(text, info(), 'JHYY:abc');
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://github.com/mud4u404/game006/issues/new');
    expect(u.searchParams.get('labels')).toBe('反馈');
    expect(u.searchParams.get('title')).toBe('【反馈】' + Array.from(text).slice(0, 20).join(''));
    expect(withCode).toBe(true);
    expect(u.searchParams.get('body')).toContain('JHYY:abc');
    expect(u.searchParams.get('body')).toContain('场景：某处（x）');
    expect(u.searchParams.get('body')).toContain('版本：存档 v5');
    expect(u.searchParams.get('body')).toContain('江湖时辰：景和元年三月五日 午时');
  });

  it('链接太长时去掉存档码，正文写明已复制', () => {
    const { url, withCode } = feedbackUrl('坏了', info(), 'J'.repeat(9000));
    expect(withCode).toBe(false);
    expect(url.length).toBeLessThanOrEqual(URL_MAX);
    expect(new URL(url).searchParams.get('body')).toContain('存档码已复制，请粘贴在下面');
  });

  it('真实存档码能放进链接或自动降级', () => {
    setState(newGame());
    const r = feedbackUrl('x', info(), exportCode(S));
    expect(new URL(r.url).searchParams.get('labels')).toBe('反馈');
  });

  it('中期存档（反馈 #617：存档码空了）：压缩后放不进的，精简后放得进，读回来还是那个人', async () => {
    const mid = migrate(JSON.parse(RAW['./fixtures/v5-midgame.json']));
    const text = '这里点了没反应，我是在东关街想去渡口的时候发现的，怎么都点不动';
    const full = await exportCodeZ(mid), lean = await exportCodeZ(leanState(mid));
    expect(lean.length).toBeLessThan(full.length);
    const r = feedbackUrl(text, info(), [full, lean]);
    expect(r.withCode, `完整码 ${full.length}，精简码 ${lean.length}`).toBe(true);
    expect(r.url.length).toBeLessThanOrEqual(URL_MAX);
    expect(new URL(r.url).searchParams.get('body')).not.toContain('存档码已复制');
    const back = await importCodeAny(new URL(r.url).searchParams.get('body')!.split('```\n')[1].split('\n')[0]);
    expect(back.loc).toBe(mid.loc);
    expect(back.silver).toBe(mid.silver);
    expect(back.flags).toEqual(mid.flags);
    expect(back.w.day).toBe(mid.w.day);
  });

  it('链接和正文不含令牌（只是打开链接，不调接口）', () => {
    const { url } = feedbackUrl('坏了', info(), 'JHYY:abc');
    const all = decodeURIComponent(url);
    expect(all).not.toMatch(/ghp_|github_pat_|token|Authorization|Bearer/i);
    expect(url.startsWith('https://github.com/mud4u404/game006/issues/new?')).toBe(true);
  });

  it('瞬移改 S.loc，银两 +1000', () => {
    setState(newGame());
    const to = ROOMS.find(r => r.id !== S.loc)!.id;
    teleport(S, to);
    expect(S.loc).toBe(to);
    const before = S.silver;
    addSilver(S);
    expect(S.silver).toBe(before + 1000);
  });
});

describe('点击记录取名', () => {
  const fake = (nm: string | null, aria: string | null, text: string) => ({
    querySelector: (q: string) => (q === '.nm' && nm !== null ? { textContent: nm } : null),
    getAttribute: (n: string) => (n === 'aria-label' ? aria : null),
    textContent: text
  });
  it('优先取 .nm 名字元素，不把头像上的字拼进来', () => {
    expect(clickLabel(fake('衙役', null, '衙衙役'))).toBe('「衙役」');
    expect(clickLabel(fake('书办', null, '书书办'))).toBe('「书办」');
  });
  it('没有 .nm 时取 aria-label，再没有才取整个按钮的字', () => {
    expect(clickLabel(fake(null, '打开地图', '走走眼下要紧打开地图'))).toBe('「打开地图」');
    expect(clickLabel(fake(null, null, ' 歇 脚 '))).toBe('「歇 脚」');
    expect(clickLabel(fake(null, null, ''))).toBe('');
  });
});
